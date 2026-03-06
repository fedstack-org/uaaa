import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { Hookable } from 'hookable'
import { stat } from 'node:fs/promises'
import { rootApi } from './api/index.js'
import { CacheManager } from './cache/index.js'
import { ClaimManager } from './claim/index.js'
import { ConfigManager, type IConfig } from './config/index.js'
import { CredentialManager } from './credential/index.js'
import { DbManager } from './db/index.js'
import { OAuthManager } from './oauth/_common.js'
import { oauthRouter, oauthWellKnownRouter } from './oauth/index.js'
import { CASManager } from './cas/_common.js'
import { casRouter } from './cas/index.js'
import { PluginManager } from './plugin/index.js'
import { SessionManager } from './session/index.js'
import { TokenManager } from './token/index.js'
import { logger } from './util/index.js'

declare module 'hono' {
  interface ContextVariableMap {
    app: App
  }
}

export class App extends Hookable<{
  extendApp(router: Hono): void | Promise<void>
}> {
  appId
  config
  db
  cache
  credential
  claim
  plugin
  token
  session
  oauth
  cas

  server?: ReturnType<typeof serve>

  private _initialized = false
  private _stopped = false

  constructor(config: IConfig) {
    super()
    this.config = new ConfigManager(this, config)
    this.appId = this.config.get('appId')
    this.db = new DbManager(this)
    this.cache = new CacheManager(this)
    this.credential = new CredentialManager(this)
    this.claim = new ClaimManager(this)
    this.plugin = new PluginManager(this)
    this.token = new TokenManager(this)
    this.session = new SessionManager(this)
    this.oauth = new OAuthManager(this)
    this.cas = new CASManager(this)
  }

  async init() {
    if (this._initialized) return
    logger.info(`App initializing...`)
    const start = performance.now()
    await this.plugin.loadPlugins()
    await this.config.validateConfig()
    await this.plugin.setupPlugins()
    await this.db.initDatabase()
    await this.cache.initCache()
    await this.token.loadTrustedKeys()
    const duration = performance.now() - start
    logger.info(`App initialized in ${duration.toFixed(2)}ms`)
    this._initialized = true
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
    logger.info(`Will disconnect db...`)
    await this.db.disconnect()
    logger.info(`Will disconnect cache...`)
    await this.cache.disconnect()
    logger.info(`Will cleanup plugins...`)
    await this.plugin.cleanupPlugins()
    const duration = performance.now() - start
    logger.info(`App stopped in ${duration.toFixed(2)}ms`)
    this._stopped = true
  }

  async start() {
    await this.init()

    const app = new Hono()
      .use(async (ctx, next) => {
        ctx.set('app', this)
        await next()
      })
      .route('/api', rootApi)
      .route('/oauth', oauthRouter)
      .route('/cas', casRouter)
      .route('/.well-known', new Hono().route('/', oauthWellKnownRouter))
    await this.callHook('extendApp', app)
    const uiPath = this.config.get('uiPath')
    if (uiPath) {
      try {
        const fstat = await stat(uiPath)
        if (!fstat.isDirectory()) throw new Error('UI path must be a directory')
        app.use('*', serveStatic({ root: uiPath }), async (ctx) => ctx.redirect('/', 303))
        logger.info(`Serving UI at '${uiPath}'`)
      } catch (err) {
        logger.warn(`UI path '${uiPath}' not valid: ${err}`)
      }
    }
    this.server = serve({
      fetch: app.fetch,
      port: this.config.get('port')
    })
    logger.info(`Server listening on port ${this.config.get('port')}`)
  }
}

export * from '@uaaa/core'
export * from './api/index.js'
export * from './claim/index.js'
export * from './config/index.js'
export * from './credential/index.js'
export * from './db/index.js'
export * from './oauth/index.js'
export * from './plugin/index.js'
export * from './token/index.js'
export * from './util/index.js'
