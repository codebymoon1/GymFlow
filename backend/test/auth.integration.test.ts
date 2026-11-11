import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { createApp } from '../src/app.ts'
import { hashPassword } from '../src/auth/passwords.ts'
import { createRefreshToken, hashRefreshToken, issueAccessToken } from '../src/auth/tokens.ts'
import { getPrismaClient } from '../src/db.ts'

const prisma = getPrismaClient()
const allowedOrigin = 'http://localhost:5173'
const password = 'GymFlow test password 9!'
const fixtureEmail = `phase3-${randomUUID()}@example.test`
const suspendedEmail = `phase3-suspended-${randomUUID()}@example.test`
const otherEmail = `phase3-other-${randomUUID()}@example.test`
const fixtureUserIds: string[] = []
let server: Server
let baseUrl = ''
let passwordHash = ''
let originalConsoleInfo: typeof console.info

async function request(path: string, options: {
  method?: string
  body?: unknown
  accessToken?: string
  refreshToken?: string
} = {}) {
  const headers: Record<string, string> = { Origin: allowedOrigin }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`
  if (options.refreshToken) headers.Cookie = `gymflow_refresh=${options.refreshToken}`
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const body = response.status === 204 ? undefined : await response.json()
  const cookie = response.headers.get('set-cookie')?.match(/(?:^|,\s*)gymflow_refresh=([^;]*)/)?.[1]
  return { response, body, cookie }
}

async function login(email = fixtureEmail, loginPassword = password) {
  const result = await request('/api/v1/auth/login', { body: { email, password: loginPassword } })
  return { ...result, accessToken: result.body?.accessToken as string | undefined }
}

async function createSession(refreshToken: string, expiresAt: Date, revokedAt: Date | null = null) {
  return prisma.authSession.create({
    data: {
      userId: fixtureUserIds[0],
      familyId: randomUUID(),
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt,
      revokedAt,
      ...(expiresAt <= new Date() ? { createdAt: new Date(expiresAt.getTime() - 60_000) } : {}),
    },
  })
}

before(async () => {
  const databaseName = await prisma.$queryRaw<Array<{ database_name: string }>>`SELECT current_database() AS database_name`
  assert.equal(databaseName[0]?.database_name, 'gymflow_test', 'authentication tests must only use gymflow_test')

  originalConsoleInfo = console.info
  console.info = () => {}
  passwordHash = await hashPassword(password)

  const user = await prisma.user.create({
    data: { email: fixtureEmail, passwordHash, firstName: 'Phase Three', status: 'ACTIVE' },
  })
  const suspendedUser = await prisma.user.create({
    data: { email: suspendedEmail, passwordHash, firstName: 'Suspended Test', status: 'SUSPENDED' },
  })
  const otherUser = await prisma.user.create({
    data: { email: otherEmail, passwordHash, firstName: 'Other Test', status: 'ACTIVE' },
  })
  fixtureUserIds.push(user.id, suspendedUser.id, otherUser.id)

  const app = createApp()
  server = app.listen(0, '127.0.0.1')
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  const address = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  if (server?.listening) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  if (fixtureUserIds.length) {
    await prisma.authSession.deleteMany({ where: { userId: { in: fixtureUserIds } } })
    await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } })
    const remainingFixtures = await prisma.user.count({ where: { id: { in: fixtureUserIds } } })
    assert.equal(remainingFixtures, 0, 'only authentication users created by this test suite are removed')
  }
  await prisma.$disconnect()
  if (originalConsoleInfo) console.info = originalConsoleInfo
})

test('valid login normalizes email, issues a short-lived access token and sets an HttpOnly refresh cookie', async () => {
  const result = await login(`  ${fixtureEmail.toUpperCase()}  `)
  assert.equal(result.response.status, 200)
  assert.equal(result.body.user.email, fixtureEmail)
  assert.equal(typeof result.accessToken, 'string')
  assert.equal(result.body.expiresIn, 600)
  assert.equal(result.response.headers.get('cache-control'), 'no-store')
  assert.equal(result.response.headers.get('access-control-allow-credentials'), 'true')
  assert.ok(result.cookie)
  assert.match(result.response.headers.get('set-cookie') ?? '', /HttpOnly/i)
  assert.match(result.response.headers.get('set-cookie') ?? '', /SameSite=Strict/i)
  assert.equal(JSON.stringify(result.body).includes(result.cookie), false)
  assert.equal('gymId' in result.body.user, false)
  assert.equal('passwordHash' in result.body.user, false)
  const storedSession = await prisma.authSession.findUnique({
    where: { refreshTokenHash: hashRefreshToken(result.cookie!) },
  })
  assert.ok(storedSession)
  assert.match(storedSession.refreshTokenHash, /^[0-9a-f]{64}$/)
  assert.notEqual(storedSession.refreshTokenHash, result.cookie)

  const me = await request('/api/v1/auth/me', { accessToken: result.accessToken })
  assert.equal(me.response.status, 200)
  assert.equal(me.body.user.id, result.body.user.id)
  assert.equal('gymId' in me.body.user, false)
})

test('the additive migration installs refresh-token checks and a restrictive user relation', async () => {
  const constraints = await prisma.$queryRaw<Array<{ constraint_name: string; delete_rule: string | null }>>`
    SELECT c.conname AS constraint_name,
      CASE WHEN c.contype = 'f' THEN c.confdeltype::text ELSE NULL END AS delete_rule
    FROM pg_constraint c
    WHERE c.conrelid = '"AuthSession"'::regclass
  `
  const names = new Set(constraints.map((constraint) => constraint.constraint_name))
  assert.ok(names.has('AuthSession_refreshTokenHash_format_check'))
  assert.ok(names.has('AuthSession_expiry_after_creation_check'))
  assert.ok(names.has('AuthSession_rotation_revokes_token_check'))
  const userForeignKey = constraints.find((constraint) => constraint.constraint_name === 'AuthSession_userId_fkey')
  assert.equal(userForeignKey?.delete_rule, 'r', 'user deletion must not cascade away session history')
})

test('invalid, unknown and suspended-user credentials use the same safe response', async () => {
  const unknown = await login(`missing-${randomUUID()}@example.test`, password)
  const wrongPassword = await login(fixtureEmail, 'incorrect password')
  const suspended = await login(suspendedEmail, password)

  for (const result of [unknown, wrongPassword, suspended]) {
    assert.equal(result.response.status, 401)
    assert.deepEqual(result.body.error, {
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.',
      requestId: result.body.error.requestId,
    })
    assert.equal(result.cookie, undefined)
  }
  assert.equal(unknown.body.error.message, wrongPassword.body.error.message)
})

test('malformed login input and missing access tokens are rejected safely', async () => {
  const malformed = await request('/api/v1/auth/login', { body: { email: 'not-an-email', password: '' } })
  const unauthenticated = await request('/api/v1/auth/me')
  assert.equal(malformed.response.status, 400)
  assert.equal(unauthenticated.response.status, 401)
  assert.equal(malformed.body.error.code, 'INVALID_REQUEST_BODY')
  assert.equal(unauthenticated.body.error.code, 'UNAUTHENTICATED')
})

test('suspending an account immediately invalidates its access token', async () => {
  const result = await login()
  await prisma.user.update({ where: { id: fixtureUserIds[0] }, data: { status: 'SUSPENDED' } })
  try {
    const denied = await request('/api/v1/auth/me', { accessToken: result.accessToken })
    assert.equal(denied.response.status, 401)
  } finally {
    await prisma.user.update({ where: { id: fixtureUserIds[0] }, data: { status: 'ACTIVE' } })
  }
})

test('refresh rotates tokens, rejects the old access token, detects reuse and revokes the family', async () => {
  const initial = await login()
  assert.ok(initial.cookie)
  const rotated = await request('/api/v1/auth/refresh', { method: 'POST', refreshToken: initial.cookie })
  assert.equal(rotated.response.status, 200)
  assert.ok(rotated.cookie)
  assert.notEqual(rotated.cookie, initial.cookie)
  assert.notEqual(rotated.body.accessToken, initial.accessToken)

  const oldAccess = await request('/api/v1/auth/me', { accessToken: initial.accessToken })
  assert.equal(oldAccess.response.status, 401)

  const reuse = await request('/api/v1/auth/refresh', { method: 'POST', refreshToken: initial.cookie })
  assert.equal(reuse.response.status, 401)
  assert.equal(reuse.body.error.code, 'REFRESH_TOKEN_REUSE')

  const familyRefresh = await request('/api/v1/auth/refresh', { method: 'POST', refreshToken: rotated.cookie })
  assert.equal(familyRefresh.response.status, 401)
  const newAccess = await request('/api/v1/auth/me', { accessToken: rotated.body.accessToken })
  assert.equal(newAccess.response.status, 401)

  const oldSession = await prisma.authSession.findUnique({ where: { refreshTokenHash: hashRefreshToken(initial.cookie) } })
  assert.ok(oldSession)
  const family = await prisma.authSession.findMany({ where: { familyId: oldSession.familyId } })
  assert.ok(family.length >= 2)
  assert.ok(family.every((session) => session.revokedAt !== null))
})

test('concurrent refresh attempts serialize and a losing replay revokes the family', async () => {
  const initial = await login()
  const attempts = await Promise.all([
    request('/api/v1/auth/refresh', { method: 'POST', refreshToken: initial.cookie }),
    request('/api/v1/auth/refresh', { method: 'POST', refreshToken: initial.cookie }),
  ])
  assert.deepEqual(attempts.map((attempt) => attempt.response.status).sort(), [200, 401])
  const successful = attempts.find((attempt) => attempt.response.status === 200)
  assert.ok(successful?.cookie)
  assert.equal((await request('/api/v1/auth/me', { accessToken: successful.body.accessToken })).response.status, 401)
})

test('expired and manually revoked refresh sessions cannot be used', async () => {
  const expiredToken = createRefreshToken()
  await createSession(expiredToken, new Date(Date.now() - 60_000))
  const expired = await request('/api/v1/auth/refresh', { method: 'POST', refreshToken: expiredToken })
  assert.equal(expired.response.status, 401)
  assert.equal(expired.body.error.code, 'INVALID_REFRESH_TOKEN')

  const revokedToken = createRefreshToken()
  await createSession(revokedToken, new Date(Date.now() + 60_000), new Date())
  const revoked = await request('/api/v1/auth/refresh', { method: 'POST', refreshToken: revokedToken })
  assert.equal(revoked.response.status, 401)
  assert.equal(revoked.body.error.code, 'INVALID_REFRESH_TOKEN')
})

test('an expired access token is rejected', async () => {
  const session = await prisma.authSession.create({
    data: {
      userId: fixtureUserIds[0], familyId: randomUUID(), refreshTokenHash: hashRefreshToken(createRefreshToken()),
      expiresAt: new Date(Date.now() + 60_000),
    },
  })
  const expiredToken = issueAccessToken(fixtureUserIds[0], session.id, Date.now() - 20 * 60_000).token
  const result = await request('/api/v1/auth/me', { accessToken: expiredToken })
  assert.equal(result.response.status, 401)
})

test('session revocation is scoped to the authenticated global user', async () => {
  const result = await login()
  assert.ok(result.cookie)
  const listing = await request('/api/v1/auth/sessions', { accessToken: result.accessToken })
  assert.equal(listing.response.status, 200)
  const current = listing.body.sessions.find((session: { current: boolean }) => session.current)
  assert.ok(current)

  const otherUser = await login(otherEmail)
  const foreignAttempt = await request(`/api/v1/auth/sessions/${current.id}`, {
    method: 'DELETE', accessToken: otherUser.accessToken,
  })
  assert.equal(foreignAttempt.response.status, 404)

  const revoked = await request(`/api/v1/auth/sessions/${current.id}`, {
    method: 'DELETE', accessToken: result.accessToken,
  })
  assert.equal(revoked.response.status, 204)
  const denied = await request('/api/v1/auth/me', { accessToken: result.accessToken })
  assert.equal(denied.response.status, 401)

})

test('logout revokes the presented refresh session and clears the cookie', async () => {
  const result = await login()
  assert.ok(result.cookie)
  const logout = await request('/api/v1/auth/logout', { method: 'POST', refreshToken: result.cookie })
  assert.equal(logout.response.status, 204)
  assert.match(logout.response.headers.get('set-cookie') ?? '', /Max-Age=0/)
  assert.equal((await request('/api/v1/auth/me', { accessToken: result.accessToken })).response.status, 401)
  assert.equal((await request('/api/v1/auth/refresh', { method: 'POST', refreshToken: result.cookie })).response.status, 401)
})

test('logout-all revokes every active session belonging to the authenticated user', async () => {
  const first = await login()
  const second = await login()
  const logoutAll = await request('/api/v1/auth/logout-all', { method: 'POST', accessToken: first.accessToken })
  assert.equal(logoutAll.response.status, 200)
  assert.ok(logoutAll.body.revokedSessions >= 2)
  assert.equal((await request('/api/v1/auth/me', { accessToken: first.accessToken })).response.status, 401)
  assert.equal((await request('/api/v1/auth/me', { accessToken: second.accessToken })).response.status, 401)
})

test('refresh requests are rate limited', async () => {
  const statuses: number[] = []
  for (let i = 0; i < 31; i += 1) {
    const result = await request('/api/v1/auth/refresh', { method: 'POST' })
    statuses.push(result.response.status)
  }
  assert.equal(statuses[0], 401)
  assert.equal(statuses[30], 429)
})
