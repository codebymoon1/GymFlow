import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { GymRole, GymStatus, GymUserStatus } from '../generated/prisma/client.ts'
import { hashPassword } from '../src/auth/passwords.ts'
import { createRefreshToken, hashRefreshToken, issueAccessToken } from '../src/auth/tokens.ts'
import { getPrismaClient } from '../src/db.ts'
import { createTenantTestApp, setTenantTestMutationBarrier } from './helpers/tenant-test-app.ts'
import { canManageMembershipRole } from '../src/permissions/gym-permissions.ts'

const prisma = getPrismaClient()
const allowedOrigin = 'http://localhost:5173'
const prefix = `phase4-${randomUUID().slice(0, 8)}`
const createdGymIds: string[] = []
const createdUserIds: string[] = []
const createdMemberIds: string[] = []
const userTokens = new Map<string, string>()

let gyms: { a: string; b: string; pending: string; suspended: string; archived: string }
let users: { shared: string; aOnly: string; bOnly: string; invited: string; ownerA: string }
let members: { a: string; b: string }
let server: Server
let baseUrl = ''
let originalConsoleInfo: typeof console.info

async function request(path: string, options: {
  user?: keyof typeof users
  gymId?: string
  method?: string
  body?: unknown
} = {}) {
  const headers: Record<string, string> = { Origin: allowedOrigin }
  if (options.user) headers.Authorization = `Bearer ${userTokens.get(users[options.user])}`
  if (options.gymId) headers['X-Gym-Id'] = options.gymId
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  return { response, body: response.status === 204 ? undefined : await response.json() }
}

async function permission(user: keyof typeof users, gymId: string, key: string) {
  return request(`/_phase4_test/permission/${encodeURIComponent(key)}`, { user, gymId })
}

async function createGym(name: string, status: GymStatus = GymStatus.ACTIVE) {
  const gym = await prisma.gym.create({
    data: { name, slug: `${prefix}-${name.toLowerCase().replace(/\s+/g, '-')}`, status },
    select: { id: true },
  })
  createdGymIds.push(gym.id)
  return gym.id
}

async function createUser(name: string, passwordHash: string) {
  const user = await prisma.user.create({
    data: {
      email: `${prefix}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` + '@example.test',
      passwordHash,
      firstName: name,
      status: 'ACTIVE',
    },
    select: { id: true },
  })
  createdUserIds.push(user.id)
  const refreshToken = createRefreshToken()
  const session = await prisma.authSession.create({
    data: {
      userId: user.id,
      familyId: randomUUID(),
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    select: { id: true },
  })
  userTokens.set(user.id, issueAccessToken(user.id, session.id).token)
  return user.id
}

async function addMembership(gymId: string, userId: string, role: GymRole, status: GymUserStatus) {
  await prisma.gymUser.create({ data: { gymId, userId, role, status } })
}

before(async () => {
  const databaseName = await prisma.$queryRaw<Array<{ database_name: string }>>`SELECT current_database() AS database_name`
  assert.equal(databaseName[0]?.database_name, 'gymflow_test', 'tenant tests must only use gymflow_test')

  originalConsoleInfo = console.info
  console.info = () => {}

  gyms = {
    a: await createGym('Gym A'),
    b: await createGym('Gym B'),
    pending: await createGym('Pending Gym', GymStatus.PENDING),
    suspended: await createGym('Suspended Gym', GymStatus.SUSPENDED),
    archived: await createGym('Archived Gym', GymStatus.ARCHIVED),
  }

  const passwordHash = await hashPassword(`test password ${randomUUID()}`)
  users = {
    shared: await createUser('Shared User', passwordHash),
    aOnly: await createUser('Gym A Only', passwordHash),
    bOnly: await createUser('Gym B Only', passwordHash),
    invited: await createUser('Invited User', passwordHash),
    ownerA: await createUser('Gym A Owner', passwordHash),
  }

  await addMembership(gyms.a, users.shared, GymRole.MANAGER, GymUserStatus.ACTIVE)
  await addMembership(gyms.b, users.shared, GymRole.TRAINER, GymUserStatus.ACTIVE)
  await addMembership(gyms.pending, users.shared, GymRole.MANAGER, GymUserStatus.ACTIVE)
  await addMembership(gyms.pending, users.bOnly, GymRole.STAFF, GymUserStatus.ACTIVE)
  await addMembership(gyms.pending, users.invited, GymRole.TRAINER, GymUserStatus.ACTIVE)

  await addMembership(gyms.a, users.aOnly, GymRole.STAFF, GymUserStatus.ACTIVE)
  await addMembership(gyms.a, users.ownerA, GymRole.OWNER, GymUserStatus.ACTIVE)
  await addMembership(gyms.b, users.aOnly, GymRole.MANAGER, GymUserStatus.SUSPENDED)
  await addMembership(gyms.pending, users.aOnly, GymRole.OWNER, GymUserStatus.ACTIVE)

  await addMembership(gyms.b, users.bOnly, GymRole.OWNER, GymUserStatus.ACTIVE)
  await addMembership(gyms.suspended, users.bOnly, GymRole.OWNER, GymUserStatus.ACTIVE)
  await addMembership(gyms.archived, users.bOnly, GymRole.OWNER, GymUserStatus.ACTIVE)
  await addMembership(gyms.b, users.invited, GymRole.STAFF, GymUserStatus.INVITED)

  const memberA = await prisma.member.create({
    data: { gymId: gyms.a, rollNo: `${prefix}-1001`, fullName: 'Gym A Private Member', membershipFee: 0 },
    select: { id: true },
  })
  const memberB = await prisma.member.create({
    data: { gymId: gyms.b, rollNo: `${prefix}-1001`, fullName: 'Gym B Private Member', membershipFee: 0 },
    select: { id: true },
  })
  members = { a: memberA.id, b: memberB.id }
  createdMemberIds.push(memberA.id, memberB.id)

  const app = createTenantTestApp()
  server = app.listen(0, '127.0.0.1')
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  const address = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  try {
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    }
    if (createdMemberIds.length) await prisma.member.deleteMany({ where: { id: { in: createdMemberIds } } })
    if (createdGymIds.length && createdUserIds.length) {
      await prisma.gymUser.deleteMany({ where: { gymId: { in: createdGymIds }, userId: { in: createdUserIds } } })
    }
    if (createdUserIds.length) await prisma.authSession.deleteMany({ where: { userId: { in: createdUserIds } } })
    if (createdGymIds.length) await prisma.gym.deleteMany({ where: { id: { in: createdGymIds } } })
    if (createdUserIds.length) await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })

    const [remainingGyms, remainingUsers, remainingMembers] = await Promise.all([
      createdGymIds.length ? prisma.gym.count({ where: { id: { in: createdGymIds } } }) : 0,
      createdUserIds.length ? prisma.user.count({ where: { id: { in: createdUserIds } } }) : 0,
      createdMemberIds.length ? prisma.member.count({ where: { id: { in: createdMemberIds } } }) : 0,
    ])
    assert.equal(remainingGyms + remainingUsers + remainingMembers, 0, 'test cleanup removes only this suite’s fixtures')
  } finally {
    await prisma.$disconnect()
    if (originalConsoleInfo) console.info = originalConsoleInfo
  }
})

test('GET /api/v1/gyms returns only active memberships and each gym’s display status', async () => {
  const shared = await request('/api/v1/gyms', { user: 'shared' })
  assert.equal(shared.response.status, 200)
  const rolesByGym = Object.fromEntries(shared.body.gyms.map((gym: { id: string; role: string }) => [gym.id, gym.role]))
  assert.deepEqual(rolesByGym, { [gyms.a]: 'MANAGER', [gyms.b]: 'TRAINER', [gyms.pending]: 'MANAGER' })
  assert.ok(shared.body.gyms.every((gym: { status: string }) => typeof gym.status === 'string'))
  assert.equal('subscriptionAdminNotes' in shared.body.gyms[0], false)

  const bOwner = await request('/api/v1/gyms', { user: 'bOnly' })
  assert.deepEqual(new Set(bOwner.body.gyms.map((gym: { id: string }) => gym.id)), new Set([gyms.b, gyms.pending, gyms.suspended, gyms.archived]))

  const invited = await request('/api/v1/gyms', { user: 'invited' })
  assert.deepEqual(invited.body.gyms.map((gym: { id: string }) => gym.id), [gyms.pending])
  assert.equal((await request('/api/v1/gyms')).response.status, 401)
})

test('one global user selects both gyms and receives that gym’s current role', async () => {
  const inA = await request('/_phase4_test/context', { user: 'shared', gymId: gyms.a })
  const inB = await request('/_phase4_test/context', { user: 'shared', gymId: gyms.b })
  assert.equal(inA.response.status, 200)
  assert.equal(inA.body.tenant.role, 'MANAGER')
  assert.equal(inA.body.tenant.gymId, gyms.a)
  assert.equal(inB.response.status, 200)
  assert.equal(inB.body.tenant.role, 'TRAINER')
  assert.equal(inB.body.tenant.gymId, gyms.b)
  assert.equal(inA.body.userId, users.shared)
  assert.equal(inB.body.userId, users.shared)
})

test('a gym A-only user and a gym B-only user cannot select another gym', async () => {
  const aToB = await request('/_phase4_test/context', { user: 'aOnly', gymId: gyms.b })
  const bToA = await request('/_phase4_test/context', { user: 'bOnly', gymId: gyms.a })
  assert.equal(aToB.response.status, 404)
  assert.equal(bToA.response.status, 404)
  assert.equal(aToB.body.error.code, 'GYM_NOT_FOUND')
  assert.equal(bToA.body.error.code, 'GYM_NOT_FOUND')
})

test('missing and malformed gym selectors fail safely; authentication runs first', async () => {
  const missing = await request('/_phase4_test/context', { user: 'shared' })
  const malformed = await request('/_phase4_test/context', { user: 'shared', gymId: 'not-a-uuid' })
  const nonexistent = await request('/_phase4_test/context', { user: 'shared', gymId: randomUUID() })
  const unauthenticated = await request('/_phase4_test/context', { gymId: gyms.a })

  assert.equal(missing.response.status, 400)
  assert.equal(malformed.response.status, 400)
  assert.equal(nonexistent.response.status, 404)
  assert.equal(unauthenticated.response.status, 401)
})

test('body and query gymId, userId and role values cannot override server-derived context', async () => {
  const result = await request(`/_phase4_test/context?gymId=${gyms.b}&userId=${users.bOnly}&role=OWNER`, {
    user: 'shared',
    gymId: gyms.a,
    method: 'POST',
    body: { gymId: gyms.b, userId: users.bOnly, role: 'OWNER' },
  })

  assert.equal(result.response.status, 200)
  assert.deepEqual(result.body, {
    userId: users.shared,
    tenant: { gymId: gyms.a, role: 'MANAGER', gymStatus: 'ACTIVE' },
  })
})

test('INVITED and SUSPENDED GymUser memberships cannot authorize a gym', async () => {
  const suspended = await request('/_phase4_test/context', { user: 'aOnly', gymId: gyms.b })
  const invited = await request('/_phase4_test/context', { user: 'invited', gymId: gyms.b })
  assert.equal(suspended.response.status, 404)
  assert.equal(invited.response.status, 404)
})

test('SUSPENDED and ARCHIVED gyms deny operations; PENDING access is owner-only setup', async () => {
  const suspended = await request('/_phase4_test/context', { user: 'bOnly', gymId: gyms.suspended })
  const archived = await request('/_phase4_test/context', { user: 'bOnly', gymId: gyms.archived })
  const pendingOperation = await request('/_phase4_test/context', { user: 'aOnly', gymId: gyms.pending })
  const pendingManagerSetup = await request('/_phase4_test/pending-setup', { user: 'shared', gymId: gyms.pending })
  const pendingOwnerOperation = await request('/_phase4_test/context', { user: 'aOnly', gymId: gyms.pending })
  const pendingOwnerSetup = await request('/_phase4_test/pending-setup', { user: 'aOnly', gymId: gyms.pending })
  const pendingOwnerFinance = await request('/_phase4_test/pending-finance', { user: 'aOnly', gymId: gyms.pending })
  const pendingStaffSetup = await request('/_phase4_test/pending-setup', { user: 'bOnly', gymId: gyms.pending })
  const pendingTrainerSetup = await request('/_phase4_test/pending-setup', { user: 'invited', gymId: gyms.pending })

  assert.equal(suspended.response.status, 404)
  assert.equal(archived.response.status, 404)
  assert.equal(pendingOperation.response.status, 404)
  assert.equal(pendingManagerSetup.response.status, 404)
  assert.equal(pendingOwnerOperation.response.status, 404)
  assert.equal(pendingOwnerSetup.response.status, 200)
  assert.equal(pendingOwnerFinance.response.status, 404)
  assert.equal(pendingStaffSetup.response.status, 404)
  assert.equal(pendingTrainerSetup.response.status, 404)
  assert.equal(pendingOwnerSetup.body.readyForSetup, true)
})

test('membership role policy fails closed for missing, invalid, and prohibited roles', () => {
  const invalid = ['PLATFORM_ADMIN', '', 4, {}]
  for (const role of invalid) {
    assert.equal(canManageMembershipRole(role, GymRole.STAFF, GymRole.TRAINER), false)
    assert.equal(canManageMembershipRole(GymRole.MANAGER, role, GymRole.STAFF), false)
    assert.equal(canManageMembershipRole(GymRole.MANAGER, GymRole.STAFF, role), false)
  }

  assert.equal(canManageMembershipRole(GymRole.OWNER, undefined, GymRole.STAFF), false)
  assert.equal(canManageMembershipRole(GymRole.OWNER, null, GymRole.STAFF), false)
  assert.equal(canManageMembershipRole(GymRole.OWNER, GymRole.STAFF, undefined), false)
  assert.equal(canManageMembershipRole(GymRole.OWNER, GymRole.STAFF, null), false)
  assert.equal(canManageMembershipRole(undefined, GymRole.STAFF, GymRole.TRAINER), false)

  for (const target of [GymRole.STAFF, GymRole.TRAINER]) {
    for (const next of [GymRole.STAFF, GymRole.TRAINER]) {
      assert.equal(canManageMembershipRole(GymRole.MANAGER, target, next), true)
    }
    assert.equal(canManageMembershipRole(GymRole.MANAGER, target, GymRole.MANAGER), false)
    assert.equal(canManageMembershipRole(GymRole.MANAGER, target, GymRole.OWNER), false)
  }
  for (const target of [GymRole.OWNER, GymRole.MANAGER]) {
    for (const next of Object.values(GymRole)) {
      assert.equal(canManageMembershipRole(GymRole.MANAGER, target, next), false)
    }
  }
  assert.equal(canManageMembershipRole(GymRole.MANAGER, GymRole.STAFF, null), false)

  for (const target of [GymRole.MANAGER, GymRole.STAFF, GymRole.TRAINER]) {
    for (const next of [GymRole.MANAGER, GymRole.STAFF, GymRole.TRAINER]) {
      assert.equal(canManageMembershipRole(GymRole.OWNER, target, next), true)
    }
  }
  assert.equal(canManageMembershipRole(GymRole.OWNER, GymRole.OWNER, GymRole.STAFF), false)
  assert.equal(canManageMembershipRole(GymRole.OWNER, GymRole.STAFF, GymRole.OWNER), false)
})

test('each role receives the approved permissions and unknown permissions are denied', async () => {
  const checks: Array<[keyof typeof users, string, string, number]> = [
    ['bOnly', gyms.b, 'gym:settings:manage', 200],
    ['bOnly', gyms.b, 'gym:subscription:manage', 200],
    ['bOnly', gyms.b, 'staff:manage', 200],
    ['shared', gyms.a, 'finance:manage', 200],
    ['shared', gyms.a, 'plans:manage', 200],
    ['shared', gyms.a, 'staff:manage', 200],
    ['shared', gyms.a, 'gym:operations:manage', 200],
    ['shared', gyms.a, 'gym:settings:manage', 403],
    ['shared', gyms.a, 'gym:subscription:manage', 403],
    ['aOnly', gyms.a, 'members:manage', 200],
    ['aOnly', gyms.a, 'attendance:manage', 200],
    ['aOnly', gyms.a, 'finance:manage', 403],
    ['aOnly', gyms.a, 'plans:manage', 403],
    ['aOnly', gyms.a, 'staff:manage', 403],
    ['shared', gyms.b, 'members:read', 200],
    ['shared', gyms.b, 'attendance:manage', 200],
    ['shared', gyms.b, 'members:manage', 403],
    ['shared', gyms.b, 'finance:read', 403],
    ['shared', gyms.b, 'gym:operations:manage', 403],
  ]

  for (const [user, gymId, key, status] of checks) {
    const result = await permission(user, gymId, key)
    assert.equal(result.response.status, status, `${user} in ${gymId} permission ${key}`)
  }
  const unknown = await permission('bOnly', gyms.b, 'platform:root')
  assert.equal(unknown.response.status, 403)
  assert.equal(unknown.body.error.code, 'PERMISSION_DENIED')
})

test('membership policy loads the target role from the database and blocks manager privilege escalation', async () => {
  const cases: Array<[keyof typeof users, string, unknown, number]> = [
    ['shared', gyms.a, { targetUserId: users.aOnly, targetRole: 'OWNER', nextRole: 'TRAINER' }, 200],
    ['shared', gyms.a, { targetUserId: users.aOnly, targetRole: 'STAFF', nextRole: 'MANAGER' }, 403],
    ['shared', gyms.a, { targetUserId: users.aOnly, targetRole: 'STAFF', nextRole: 'OWNER' }, 403],
    ['shared', gyms.a, { targetUserId: users.shared, nextRole: 'STAFF' }, 403],
    ['shared', gyms.a, { targetUserId: users.ownerA, targetRole: 'STAFF', nextRole: 'TRAINER' }, 403],
    ['shared', gyms.a, { targetUserId: users.aOnly }, 403],
    ['shared', gyms.a, { nextRole: 'STAFF' }, 403],
    ['bOnly', gyms.b, { targetUserId: users.shared, nextRole: 'STAFF' }, 200],
  ]

  for (const [user, gymId, body, status] of cases) {
    const result = await request('/_phase4_test/membership-policy', { user, gymId, body })
    assert.equal(result.response.status, status)
  }
})

test('membership changes serialize with protected mutations and recheck current authorization', async () => {
  let announceLock!: () => void
  let releaseMutation!: () => void
  const lockAcquired = new Promise<void>((resolve) => { announceLock = resolve })
  const mayCommit = new Promise<void>((resolve) => { releaseMutation = resolve })
  setTenantTestMutationBarrier(async () => {
    announceLock()
    await mayCommit
  })

  let changeFinished = false
  try {
    let mutationResponse: Awaited<ReturnType<typeof request>> | undefined
    const mutation = request(`/_phase4_test/authorized-mutation/${members.a}`, { user: 'shared', gymId: gyms.a, method: 'POST' })
      .then((result) => { mutationResponse = result; return result })
    const authorizationStart = await Promise.race([
      lockAcquired.then(() => 'locked' as const),
      mutation.then(() => 'responded' as const),
    ])
    assert.equal(authorizationStart, 'locked', `protected transaction reaches its locked mutation callback: ${JSON.stringify(mutationResponse?.body)}`)
    const change = prisma.gymUser.update({
      where: { gymId_userId: { gymId: gyms.a, userId: users.shared } },
      data: { status: GymUserStatus.SUSPENDED },
    }).then((value) => { changeFinished = true; return value })

    await new Promise((resolve) => setTimeout(resolve, 100))
    assert.equal(changeFinished, false, 'membership suspension waits for the protected transaction lock')
    releaseMutation()
    const result = await mutation
    assert.equal(result.response.status, 200)
    await change

    setTenantTestMutationBarrier(undefined)
    const afterRevocation = await request(`/_phase4_test/authorized-mutation/${members.a}`, { user: 'shared', gymId: gyms.a, method: 'POST' })
    assert.equal(afterRevocation.response.status, 404)

    await prisma.gymUser.update({
      where: { gymId_userId: { gymId: gyms.a, userId: users.shared } },
      data: { status: GymUserStatus.ACTIVE, role: GymRole.MANAGER },
    })
    let announceDowngradeLock!: () => void
    let releaseDowngradeMutation!: () => void
    const downgradeLockAcquired = new Promise<void>((resolve) => { announceDowngradeLock = resolve })
    const mayCommitDowngrade = new Promise<void>((resolve) => { releaseDowngradeMutation = resolve })
    setTenantTestMutationBarrier(async () => {
      announceDowngradeLock()
      await mayCommitDowngrade
    })
    let downgradeFinished = false
    const downgradeMutation = request(`/_phase4_test/authorized-mutation/${members.a}`, { user: 'shared', gymId: gyms.a, method: 'POST' })
    await downgradeLockAcquired
    const downgrade = prisma.gymUser.update({
      where: { gymId_userId: { gymId: gyms.a, userId: users.shared } },
      data: { role: GymRole.STAFF },
    }).then((value) => { downgradeFinished = true; return value })
    await new Promise((resolve) => setTimeout(resolve, 100))
    assert.equal(downgradeFinished, false, 'role downgrade waits for the protected transaction lock')
    releaseDowngradeMutation()
    assert.equal((await downgradeMutation).response.status, 200)
    await downgrade
    setTenantTestMutationBarrier(undefined)
    const afterDowngrade = await request(`/_phase4_test/authorized-mutation/${members.a}`, { user: 'shared', gymId: gyms.a, method: 'POST' })
    assert.equal(afterDowngrade.response.status, 403)
    releaseDowngradeMutation()
  } finally {
    releaseMutation()
    setTenantTestMutationBarrier(undefined)
    await prisma.gymUser.update({
      where: { gymId_userId: { gymId: gyms.a, userId: users.shared } },
      data: { status: GymUserStatus.ACTIVE, role: GymRole.MANAGER },
    })
  }
})

test('tenant-scoped member lists and object lookups cannot expose Gym B records to Gym A', async () => {
  const aList = await request('/_phase4_test/members', { user: 'aOnly', gymId: gyms.a })
  const bList = await request('/_phase4_test/members', { user: 'bOnly', gymId: gyms.b })
  const aReadsB = await request(`/_phase4_test/members/${members.b}`, { user: 'aOnly', gymId: gyms.a })
  const bReadsA = await request(`/_phase4_test/members/${members.a}`, { user: 'bOnly', gymId: gyms.b })
  const aReadsA = await request(`/_phase4_test/members/${members.a}`, { user: 'aOnly', gymId: gyms.a })

  assert.equal(aList.response.status, 200)
  assert.deepEqual(aList.body.members.map((member: { id: string }) => member.id), [members.a])
  assert.deepEqual(bList.body.members.map((member: { id: string }) => member.id), [members.b])
  assert.equal(aReadsB.response.status, 404)
  assert.equal(bReadsA.response.status, 404)
  assert.equal(JSON.stringify(aReadsB.body).includes('Gym B Private Member'), false)
  assert.equal(aReadsA.response.status, 200)
  assert.equal(aReadsA.body.member.gymId, gyms.a)
})
