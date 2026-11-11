import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.ts'
import { env } from './config/env.ts'

let prisma: PrismaClient | undefined

export function getPrismaClient(): PrismaClient {
  const connectionString = env.databaseUrl

  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.')
  }

  if (!prisma) {
    const adapter = new PrismaPg({ connectionString })
    prisma = new PrismaClient({ adapter })
  }

  return prisma
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = undefined
  }
}
