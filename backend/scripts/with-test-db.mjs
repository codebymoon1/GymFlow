import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { Client } from 'pg'

const targetDatabase = 'gymflow_test'
const mode = process.argv[2]
const configuredUrl = process.env.DATABASE_URL

if (!configuredUrl) throw new Error('DATABASE_URL is not configured; refusing database access.')
if (!['diff', 'deploy', 'status', 'test', 'verify'].includes(mode ?? '')) {
  throw new Error('Allowed modes: diff, deploy, status, test, verify.')
}

const targetUrl = new URL(configuredUrl)
if (!['postgres:', 'postgresql:'].includes(targetUrl.protocol)) {
  throw new Error('Refusing database operation: DATABASE_URL is not a PostgreSQL URL.')
}
targetUrl.pathname = `/${targetDatabase}`
if (decodeURIComponent(targetUrl.pathname.slice(1)) !== targetDatabase) {
  throw new Error('Refusing database operation: target is not gymflow_test.')
}

const verifier = new Client({ connectionString: targetUrl.toString() })
let actualDatabase
try {
  await verifier.connect()
  const result = await verifier.query('SELECT current_database() AS database_name')
  actualDatabase = result.rows[0]?.database_name
} finally {
  await verifier.end().catch(() => {})
}

if (actualDatabase !== targetDatabase) {
  throw new Error('Refusing database operation: PostgreSQL did not report gymflow_test.')
}

console.log(`Verified PostgreSQL database: ${targetDatabase}`)
process.env.DATABASE_URL = targetUrl.toString()

const prismaCli = 'node_modules/prisma/build/index.js'
let result

if (mode === 'diff') {
  result = spawnSync(process.execPath, [
    prismaCli,
    'migrate', 'diff',
    '--from-config-datasource',
    '--to-schema', 'prisma/schema.prisma',
    '--script',
  ], { encoding: 'utf8', env: process.env })
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.status !== 0) process.exit(result.status ?? 1)
  const migrationPath = 'prisma/migrations/20261111090000_auth_sessions/migration.sql'
  mkdirSync('prisma/migrations/20261111090000_auth_sessions', { recursive: true })
  writeFileSync(migrationPath, result.stdout.trimEnd() + '\n', { flag: 'wx' })
  console.log(`Created additive migration draft: ${migrationPath}`)
} else if (mode === 'deploy') {
  result = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], { stdio: 'inherit', env: process.env })
} else if (mode === 'status') {
  result = spawnSync(process.execPath, [prismaCli, 'migrate', 'status'], { stdio: 'inherit', env: process.env })
} else if (mode === 'verify') {
  result = spawnSync(process.execPath, [
    prismaCli,
    'migrate', 'diff',
    '--from-config-datasource',
    '--to-schema', 'prisma/schema.prisma',
    '--script',
  ], { encoding: 'utf8', env: process.env })
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.status !== 0) process.exit(result.status ?? 1)
  const modelDiff = result.stdout.replace(/^\s*-- This is an empty migration\.\s*$/m, '').trim()
  if (modelDiff) {
    process.stderr.write(result.stdout)
    throw new Error('Prisma model diff is not empty; migration and schema need review.')
  }
  console.log('Prisma model diff is empty.')
} else {
  result = spawnSync(process.execPath, [
    '--experimental-strip-types', '--test', 'test/auth.integration.test.ts',
  ], { stdio: 'inherit', env: process.env })
}

if (mode !== 'diff' && result.status !== 0) process.exit(result.status ?? 1)
