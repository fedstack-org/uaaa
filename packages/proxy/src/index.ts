import { fastifyHttpProxy } from '@fastify/http-proxy'
import { fastifySensible } from '@fastify/sensible'
import { fastify, type FastifyBaseLogger, type FastifyInstance } from 'fastify'
import type { IProxyAdapter, IProxyAdapterTransform } from './adapter.js'
import { AuthManager } from './auth/index.js'
import { ConfigManager, type IConfig } from './config/index.js'
import { PluginManager } from './plugin/_common.js'
import { logger } from './util/index.js'

declare module 'fastify' {
  interface FastifyRequest {
    transform: IProxyAdapterTransform
  }
}

export class App {
  config
  plugin
  auth

  server?: FastifyInstance

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

    this.server = fastify({
      loggerInstance: logger as FastifyBaseLogger
    })
    this.server.decorateRequest('transform', null as never)
    await this.server.register(fastifySensible)
    await this.server.register(fastifyHttpProxy, {
      preValidation: async (req, rep) => {
        const jwt = req.headers['authorization']?.split(' ')[1]
        if (!jwt) return rep.forbidden('No token provided')
        try {
          const token = await this.auth.verify(jwt)
          const transform = await adapter.getTransform(req, rep, token)
          req.transform = transform
        } catch (e) {
          logger.error(`Token verification failed: ${e}`)
          return rep.forbidden('Invalid token')
        }
      },
      upstream: this.config.get('upstream'),
      replyOptions: {
        rewriteRequestHeaders: (req, headers) =>
          req.transform.rewriteRequestHeaders?.(headers) ?? headers
      }
    })
    await this.server.listen({
      port: this.config.get('port'),
      host: this.config.get('host')
    })
  }

  async stop() {
    if (this._stopped) return
    logger.info(`App stopping...`)
    const start = performance.now()
    logger.info(`Will stop http server...`)
    await this.server?.close()
    logger.info(`Will cleanup plugins...`)
    await this.plugin.cleanupPlugins()
    const duration = performance.now() - start
    logger.info(`App stopped in ${duration.toFixed(2)}ms`)
    this._stopped = true
  }
}

export * from '@uaaa/core'
export * from './adapter.js'
export * from './auth/index.js'
export * from './config/index.js'
export * from './plugin/index.js'
export * from './util/index.js'
