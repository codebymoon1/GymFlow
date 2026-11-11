import argon2, { type HashOptions } from 'argon2'

const argonOptions: HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
}

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, argonOptions)
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  if (!/^\$argon2id\$/.test(hash)) return false
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}
