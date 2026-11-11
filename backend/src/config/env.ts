import 'dotenv/config'

function parsePort(value: string | undefined): number {
  if (value === undefined || value.trim() === '') return 3001
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535.')
  }
  return port
}

function parseDatabaseUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.')
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL must use the postgres or postgresql protocol.')
  }
  return value
}

const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

for (const origin of allowedOrigins) {
  let parsed: URL
  try {
    parsed = new URL(origin)
  } catch {
    throw new Error('CORS_ORIGINS must be a comma-separated list of valid origins.')
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
    throw new Error('CORS_ORIGINS entries must be origins without paths or credentials.')
  }
}

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET
if (!accessTokenSecret || Buffer.byteLength(accessTokenSecret, 'utf8') < 32) {
  throw new Error('ACCESS_TOKEN_SECRET must be configured with at least 32 bytes of random data.')
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parsePort(process.env.PORT),
  host: process.env.HOST?.trim() || '127.0.0.1',
  databaseUrl: parseDatabaseUrl(process.env.DATABASE_URL),
  accessTokenSecret,
  allowedOrigins: new Set(allowedOrigins),
  isProduction: process.env.NODE_ENV === 'production',
})
