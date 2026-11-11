import { createApp } from './app.ts'
import { env } from './config/env.ts'
import { disconnectPrisma } from './db.ts'

const app = createApp()
const server = app.listen(env.port, env.host, () => {
  console.info(JSON.stringify({
    level: 'info',
    event: 'server_started',
    host: env.host,
    port: env.port,
    environment: env.nodeEnv,
  }))
})

let shuttingDown = false

async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  console.info(JSON.stringify({ level: 'info', event: 'server_shutdown', signal }))

  const forceExit = setTimeout(() => {
    console.error(JSON.stringify({ level: 'error', event: 'shutdown_timeout' }))
    process.exit(1)
  }, 10_000)
  forceExit.unref()

  server.close(async (error) => {
    try {
      await disconnectPrisma()
      if (error) {
        console.error(JSON.stringify({ level: 'error', event: 'server_close_failed', errorName: error.name }))
        process.exitCode = 1
      }
    } catch (disconnectError) {
      console.error(JSON.stringify({
        level: 'error',
        event: 'database_disconnect_failed',
        errorName: disconnectError instanceof Error ? disconnectError.name : 'UnknownError',
      }))
      process.exitCode = 1
    } finally {
      clearTimeout(forceExit)
    }
  })
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
