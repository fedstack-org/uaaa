import * as arktype from 'arktype'
import { customAlphabet } from 'nanoid'
import { timingSafeEqual } from 'node:crypto'

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const usernameGen = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 8)

export const generateUsername = (suggested: string) => {
  const stripped = suggested.replace(/[^a-zA-Z0-9_-]+/g, '').slice(0, 20)
  return stripped + '_' + usernameGen()
}

export class IncludeProjection<T, K extends Array<keyof T> = []> {
  keys: K
  infer!: Pick<T, K[number]>

  constructor(...keys: K) {
    this.keys = keys
  }

  with<K2 extends Array<Exclude<keyof T, K[number]>>>(...keys: K2) {
    const copied = new IncludeProjection<T, [...K, ...K2]>(...this.keys, ...keys)
    return copied
  }

  build() {
    return Object.fromEntries(this.keys.map((key) => [key, 1])) as {
      [P in K[number]]: 1
    }
  }
}

export class ExcludeProjection<T, K extends Array<keyof T> = []> {
  keys: K
  infer!: Omit<T, K[number]>

  constructor(...keys: K) {
    this.keys = keys
  }

  with<K2 extends Array<Exclude<keyof T, K[number]>>>(...keys: K2) {
    const copied = new ExcludeProjection<T, [...K, ...K2]>(...this.keys, ...keys)
    return copied
  }

  build() {
    return Object.fromEntries(this.keys.map((key) => [key, 0])) as {
      [P in K[number]]: 0
    }
  }
}

export const safeCompare = (a: string, b: string) => {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  if (bufA.length === 0) return false
  return timingSafeEqual(bufA, bufB)
}

export * from './constants.js'
export * from './errors.js'
export * from './logger.js'
export * from './permission.js'
export * from './types.js'
export { arktype }
