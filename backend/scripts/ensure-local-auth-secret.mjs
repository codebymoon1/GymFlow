import { randomBytes } from 'node:crypto'
import { appendFileSync, existsSync, readFileSync } from 'node:fs'

const envPath = '.env'
let contents = existsSync(envPath) ? readFileSync(envPath, 'utf8') : ''
const match = contents.match(/^(\s*(?:export\s+)?ACCESS_TOKEN_SECRET\s*=)(.*)$/m)
const currentValue = match?.[2]?.trim().replace(/^['"]|['"]$/g, '')

if (!currentValue || currentValue === 'replace-with-a-random-secret-at-least-32-bytes' || Buffer.byteLength(currentValue, 'utf8') < 32) {
  const secretLine = `ACCESS_TOKEN_SECRET=${randomBytes(48).toString('base64url')}`
  if (match?.[1]) {
    contents = contents.replace(/^(\s*(?:export\s+)?ACCESS_TOKEN_SECRET\s*=).*$/m, `${match[1]}${secretLine.slice('ACCESS_TOKEN_SECRET='.length)}`)
    writeFileSync(envPath, contents, { mode: 0o600 })
  } else {
    const prefix = contents && !contents.endsWith('\n') ? '\n' : ''
    appendFileSync(envPath, `${prefix}${secretLine}\n`, { mode: 0o600 })
  }
}

console.log('Local access-token secret is configured. Its value is not displayed.')
