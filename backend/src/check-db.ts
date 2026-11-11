import 'dotenv/config'
import { disconnectPrisma, getPrismaClient } from './db.ts'

try {
  const prisma = getPrismaClient()
  await prisma.$queryRaw`SELECT 1`
  console.log('PostgreSQL connection succeeded.')
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown connection error.'
  console.error(`PostgreSQL connection failed: ${message}`)
  process.exitCode = 1
} finally {
  await disconnectPrisma()
}
