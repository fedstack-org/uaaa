import { createClient, type RedisClientType } from 'redis'
import { CacheImpl } from './_common.js'
import type { CacheManager } from './index.js'

export class RedisCache extends CacheImpl {
  client!: RedisClientType

  constructor(manager: CacheManager, private connectionUrl?: string) {
    super(manager)
  }

  async init(): Promise<void> {
    this.client = createClient({
      url: this.connectionUrl || process.env.REDIS_URL || 'redis://localhost:6379'
    })
    
    this.client.on('error', (err) => {
      console.error('Redis Client Error', err)
    })
    
    await this.client.connect()
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect()
    }
  }

  override async set(key: string, value: string, expiresIn: number): Promise<void> {
    await this.client.setEx(key, Math.ceil(expiresIn / 1000), value)
  }

  override async get(key: string): Promise<string | null> {
    return await this.client.get(key)
  }

  override async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  override async ttl(key: string): Promise<number> {
    const ttlSeconds = await this.client.ttl(key)
    if (ttlSeconds === -2) return -2 // Key does not exist
    if (ttlSeconds === -1) return -1 // Key exists but has no expiration
    return ttlSeconds * 1000 // Convert to milliseconds
  }

  override async clear(): Promise<void> {
    await this.client.flushDb()
  }

  override async setn(key: string, value: number, expiresIn: number): Promise<void> {
    await this.client.setEx(key, Math.ceil(expiresIn / 1000), value.toString())
  }

  override async getn(key: string): Promise<number> {
    const value = await this.client.get(key)
    if (value === null) return 0
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? 0 : parsed
  }

  override async incr(key: string, amount: number, expiresIn: number): Promise<number> {
    // Use a transaction to ensure atomicity
    const multi = this.client.multi()
    multi.incrBy(key, amount)
    multi.expire(key, Math.ceil(expiresIn / 1000))
    const results = await multi.exec()
    
    if (!results || results.length < 1) return 0
    const result = results[0] as unknown
    return typeof result === 'number' ? result : 0
  }

  override async expire(key: string, timeout: number): Promise<void> {
    await this.client.expire(key, Math.ceil(timeout / 1000))
  }

  override async setx<T>(key: string, value: T, expiresIn: number): Promise<void> {
    await this.client.setEx(key, Math.ceil(expiresIn / 1000), JSON.stringify(value))
  }

  override async getx<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key)
    if (value === null) return null
    try {
      return JSON.parse(value) as T
    } catch {
      return null
    }
  }
}