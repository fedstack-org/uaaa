import { serve } from '@hono/node-server'
import type { ITokenPayload } from '@uaaa/core'
import { Hono } from 'hono'
import { proxy } from 'hono/proxy'
import type { IProxyAdapter } from './adapter.js'
import { AuthManager } from './auth/index.js'
import { ConfigManager, type IConfig } from './config/index.js'
import { PluginManager } from './plugin/_common.js'
import { logger } from './util/index.js'

export class App {
  config
  plugin
  auth

  server?: ReturnType<typeof serve>

  private _initialized = false
  private _stopped = false
  private _adapters: Record<string, IProxyAdapter> = Object.create(null)

  constructor(configInit: IConfig) {
    this.config = new ConfigManager(this, configInit)
    this.auth = new AuthManager(this)
    this.plugin = new PluginManager(this)
  }

  registerAdapter(adapter: IProxyAdapter) {
    if (this._adapters[adapter.name]) {
      logger.warn(`Adapter ${adapter.name} already registered, will be replaced`)
    }
    this._adapters[adapter.name] = adapter
  }

  getAdapter(name: string) {
    const adapter = this._adapters[name]
    if (!adapter) {
      logger.warn(`Adapter ${name} not found`)
      return null
    }
    return adapter
  }

  async init() {
    if (this._initialized) return
    logger.info(`App initializing...`)
    const start = performance.now()
    await this.plugin.loadPlugins()
    await this.config.validateConfig()
    await this.plugin.setupPlugins()
    await this.auth.init()
    const duration = performance.now() - start
    logger.info(`App initialized in ${duration.toFixed(2)}ms`)
    this._initialized = true
  }

  async start() {
    await this.init()
    const adapter = this.getAdapter(this.config.get('adapter'))
    if (!adapter) {
      logger.fatal(`You must use a valid adapter`)
      await this.stop()
      process.exit(1)
    }

    const app = new Hono().all('/:path{.+}', async (c) => {
      const header = c.req.header('Authorization')
      const jwt = header?.split(' ')[1]
      if (!jwt) {
        return c.json({ error: 'Missing Authorization header' }, 401)
      }
      let token: ITokenPayload
      try {
        token = await this.auth.verify(jwt)
      } catch (e) {
        logger.info(`Token verification failed: ${e}`)
        return c.json({ error: 'Invalid token' }, 401)
      }
      const req = await adapter.transformRequest(c.req.raw, token)
      return proxy(req)
    })
    this.server = serve({
      fetch: app.fetch,
      port: this.config.get('port')
    })
    logger.info(`Server listening on port ${this.config.get('port')}`)
  }

  async stop() {
    if (this._stopped) return
    logger.info(`App stopping...`)
    const start = performance.now()
    logger.info(`Will stop http server...`)
    await new Promise<void>((resolve) => {
      if (!this.server) return resolve()
      this.server.close(() => resolve())
    })
    logger.info(`Will cleanup plugins...`)
    await this.plugin.cleanupPlugins()
    const duration = performance.now() - start
    logger.info(`App stopped in ${duration.toFixed(2)}ms`)
    this._stopped = true
  }
}
