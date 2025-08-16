import { Hookable } from 'hookable'
import type { App } from '../index.js'
import { CacheImpl } from './_common.js'
import { MongoCache } from './mongo.js'

export interface CacheManager extends Omit<CacheImpl, 'init'> {}

export class CacheManager extends Hookable {
  impl!: CacheImpl

  constructor(public app: App) {
    super()
  }

  async initCache() {
    this.impl ??= new MongoCache(this)
    await this.impl.init?.()
    this.set = this.impl.set.bind(this.impl)
    this.setx = this.impl.setx.bind(this.impl)
    this.get = this.impl.get.bind(this.impl)
    this.getx = this.impl.getx.bind(this.impl)
    this.gete = this.impl.gete.bind(this.impl)
    this.getex = this.impl.getex.bind(this.impl)
    this.del = this.impl.del.bind(this.impl)
    this.ttl = this.impl.ttl.bind(this.impl)
    this.clear = this.impl.clear.bind(this.impl)
    this.setn = this.impl.setn.bind(this.impl)
    this.getn = this.impl.getn.bind(this.impl)
    this.incr = this.impl.incr.bind(this.impl)
    this.expire = this.impl.expire.bind(this.impl)
  }

  async disconnect() {
    await this.impl.disconnect?.()
  }
}

export * from './_common.js'
export * from './mongo.js'
