import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Leave empty for client generation without credentials. Database
    // operations require a real URL in the local .env file.
    url: process.env.DATABASE_URL ?? '',
  },
})
