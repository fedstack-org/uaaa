import fastifyCookie from '@fastify/cookie'
import { fastifyHttpProxy } from '@fastify/http-proxy'
import { fastifySensible } from '@fastify/sensible'
import fastifySession from '@fastify/session'
import type { IOAuthWellKnownMetadata } from '@uaaa/server'
import { fastify, type FastifyBaseLogger, type FastifyInstance } from 'fastify'
import { createHash, randomBytes } from 'node:crypto'
import type { IProxyAdapter, IProxyAdapterTransform } from './adapter.js'
import { AuthManager } from './auth/index.js'
import { ConfigManager, type IConfig } from './config/index.js'
import { PluginManager } from './plugin/_common.js'
import { logger, warn } from './util/index.js'
declare module 'fastify' {
  interface FastifyRequest {
    transform: IProxyAdapterTransform
  }
}

declare module '@fastify/session' {
  interface FastifySessionObject {
    loginState?: {
      codeVerifier: string
      state: string
      redirect: string
    }
    tokens?: {
      accessToken: string
      refreshToken?: string
      idToken?: string
      expiresAt: number
    }
  }
}

export class App {
  config
  plugin
  auth

  server?: FastifyInstance
  issuer?: IOAuthWellKnownMetadata

  private _initialized = false
  private _stopped = false
  private _adapters: Record<string, IProxyAdapter> = Object.create(null)

  constructor(configInit: IConfig) {
    this.config = new ConfigManager(this, configInit)
    this.auth = new AuthManager(this)
    this.plugin = new PluginManager(this)
  }

  async loadIssuerMetadata() {
    const resp = await fetch(
      new URL('/.well-known/openid-configuration', this.config.get('issuer'))
    )
    this.issuer = await resp.json()
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
    await this.loadIssuerMetadata()
    const duration = performance.now() - start
    logger.info(`App initialized in ${duration.toFixed(2)}ms`)
    this._initialized = true
  }

  // PKCE utilities
  private generateCodeVerifier(): string {
    return randomBytes(32).toString('base64url')
  }

  private generateCodeChallenge(verifier: string): string {
    return createHash('sha256').update(verifier).digest('base64url')
  }

  private generateState(): string {
    return randomBytes(16).toString('base64url')
  }

  private buildScope(permissions: string[]): string {
    const baseScopes = ['openid', 'profile', 'email']
    const permissionScopes = permissions.map((permission) => {
      // Interpolate placeholders similar to frontend implementation
      const interpolatedPath = permission
        .replace('{{server}}', this.config.get('serverAppId'))
        .replace('{{issuer}}', this.config.get('issuerAppId'))
      return `uperm://${interpolatedPath}`
    })
    return [...baseScopes, ...permissionScopes].join(' ')
  }

  private getCallbackUrl(req: any): string {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http'
    const host = req.headers['x-forwarded-host'] || req.headers.host
    return `${protocol}://${host}/_uaaa/login/callback`
  }

  private getLogoutCallbackUrl(req: any, redirect: string): string {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http'
    const host = req.headers['x-forwarded-host'] || req.headers.host
    const callbackUrl = new URL(`${protocol}://${host}/_uaaa/logout/callback`)
    callbackUrl.searchParams.set('redirect', redirect)
    return callbackUrl.href
  }

  private async checkAndRefreshTokens(req: any): Promise<string | undefined> {
    if (!req.session.tokens) {
      return undefined
    }

    const sessionTokens = req.session.tokens
    const now = Date.now()

    // Check if token is expired or about to expire (within 30 seconds)
    if (sessionTokens.expiresAt <= now + 30000) {
      logger.info('Session token expired or expiring soon, attempting refresh')

      // Try to refresh the token if we have a refresh token
      if (sessionTokens.refreshToken) {
        try {
          const refreshResponse = await fetch(this.auth.config.token_endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              refresh_token: sessionTokens.refreshToken,
              client_id: this.config.get('serverAppId'),
              client_secret: this.config.get('serverAppSecret')
            })
          })

          if (refreshResponse.ok) {
            const refreshedTokens = await refreshResponse.json()
            const { access_token, refresh_token, expires_in } = refreshedTokens

            // Update session with new tokens
            const updatedTokens: any = {
              accessToken: access_token,
              refreshToken: refresh_token || sessionTokens.refreshToken,
              expiresAt: Date.now() + expires_in * 1000
            }

            // Keep existing ID token if available
            if (sessionTokens.idToken) {
              updatedTokens.idToken = sessionTokens.idToken
            }

            req.session.tokens = updatedTokens
            logger.info('Token refreshed successfully')
            return access_token
          } else {
            logger.warn('Token refresh failed, clearing session')
            delete req.session.tokens
            return undefined
          }
        } catch (error) {
          logger.error(`Token refresh error: ${error}`)
          delete req.session.tokens
          return undefined
        }
      } else {
        logger.warn('No refresh token available, clearing expired session')
        delete req.session.tokens
        return undefined
      }
    } else {
      // Token is still valid, use it
      return sessionTokens.accessToken
    }
  }

  async injectLoginRoutes(server: FastifyInstance) {
    // Login initiation route
    server.get('/login', async (req, reply) => {
      const loginConfig = this.config.get('login')
      const redirect = (req.query as any)?.redirect || '/'

      // Generate PKCE parameters
      const codeVerifier = this.generateCodeVerifier()
      const codeChallenge = this.generateCodeChallenge(codeVerifier)
      const state = this.generateState()

      // Store login state in session
      req.session.loginState = {
        codeVerifier,
        state,
        redirect
      }

      // Build authorization URL
      const authUrl = new URL(this.auth.config.authorization_endpoint)
      authUrl.searchParams.set('client_id', this.config.get('serverAppId'))
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('scope', this.buildScope(loginConfig?.permissions || []))
      authUrl.searchParams.set('redirect_uri', this.getCallbackUrl(req))
      authUrl.searchParams.set('code_challenge', codeChallenge)
      authUrl.searchParams.set('code_challenge_method', 'S256')
      authUrl.searchParams.set('state', state)

      // Add additional parameters from config
      if (loginConfig?.additionalParams) {
        for (const [key, value] of Object.entries(loginConfig.additionalParams)) {
          authUrl.searchParams.set(key, value)
        }
      }

      logger.info(`Redirecting to authorization endpoint: ${authUrl.href}`)
      return reply.redirect(authUrl.href)
    })

    server.get('/login/callback', async (req, reply) => {
      const query = req.query as any
      const { code, state, error } = query

      // Handle OAuth error responses
      if (error) {
        logger.error(`OAuth error: ${error}`)
        return reply.badRequest(`Authentication failed: ${error}`)
      }

      if (!code || !state) {
        return reply.badRequest('Missing required parameters')
      }

      // Validate login state
      const loginState = req.session.loginState
      if (!loginState) {
        return reply.badRequest('No login state found')
      }

      if (state !== loginState.state) {
        return reply.badRequest('Invalid state parameter')
      }

      try {
        // Exchange authorization code for tokens
        const tokenResponse = await fetch(this.auth.config.token_endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: this.config.get('serverAppId'),
            client_secret: this.config.get('serverAppSecret'),
            redirect_uri: this.getCallbackUrl(req),
            code_verifier: loginState.codeVerifier
          })
        })

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text()
          logger.error(`Token exchange failed: ${errorText}`)
          return reply.internalServerError('Token exchange failed')
        }

        const tokens = await tokenResponse.json()
        const { access_token, refresh_token, id_token, expires_in } = tokens

        // Store tokens in session
        req.session.tokens = {
          accessToken: access_token,
          refreshToken: refresh_token,
          idToken: id_token,
          expiresAt: Date.now() + expires_in * 1000
        }

        // Clear login state
        delete req.session.loginState

        logger.info('Login successful, redirecting to original destination')
        return reply.redirect(loginState.redirect)
      } catch (error) {
        logger.error(`Login callback error: ${error}`)
        return reply.internalServerError('Authentication failed')
      }
    })
  }

  async injectLogoutRoutes(server: FastifyInstance) {
    // Logout initiation route
    server.get('/logout', async (req, reply) => {
      const logoutConfig = this.config.get('logout')
      const redirect = (req.query as any)?.redirect || '/'

      // Get current tokens from session
      const tokens = req.session.tokens

      // Clear session tokens
      delete req.session.tokens
      delete req.session.loginState

      // If skipSingleLogout is configured, redirect directly
      if (logoutConfig?.skipSingleLogout) {
        logger.info('Skipping single logout, redirecting directly')
        return reply.redirect(redirect)
      }

      // If we have an ID token, perform OIDC logout
      if (tokens?.idToken && this.auth.config.end_session_endpoint) {
        const logoutUrl = new URL(this.auth.config.end_session_endpoint)
        logoutUrl.searchParams.set('id_token_hint', tokens.idToken)
        logoutUrl.searchParams.set('client_id', this.config.get('serverAppId'))
        logoutUrl.searchParams.set(
          'post_logout_redirect_uri',
          this.getLogoutCallbackUrl(req, redirect)
        )

        // Add additional parameters from config
        if (logoutConfig?.additionalParams) {
          for (const [key, value] of Object.entries(logoutConfig.additionalParams)) {
            logoutUrl.searchParams.set(key, value)
          }
        }

        logger.info(`Redirecting to logout endpoint: ${logoutUrl.href}`)
        return reply.redirect(logoutUrl.href)
      }

      // No ID token or end session endpoint, redirect directly
      logger.info('No ID token or end session endpoint, redirecting directly')
      return reply.redirect(redirect)
    })

    server.get('/logout/callback', async (req, reply) => {
      // Handle post-logout redirect from OIDC provider
      const redirect = (req.query as any)?.redirect || '/'

      // Ensure session is completely cleared
      delete req.session.tokens
      delete req.session.loginState

      logger.info('Logout callback received, redirecting to final destination')
      return reply.redirect(redirect)
    })
  }

  async injectRoutes(server: FastifyInstance) {
    await server.register(
      async (server) => {
        this.config.get('login') && (await this.injectLoginRoutes(server))
        this.config.get('logout') && (await this.injectLogoutRoutes(server))
        server.get('/health', () => 'ok')
      },
      { prefix: '/_uaaa' }
    )
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
    let secret =
      this.config.get('cookieSecret') ??
      warn('Cookie secret is not set, using random value', randomBytes(16).toString('hex'))
    await this.server.register(fastifyCookie, { secret })
    await this.server.register(fastifySession, { secret, cookie: { secure: 'auto' } })
    await this.injectRoutes(this.server)
    await this.server.register(fastifyHttpProxy, {
      preValidation: async (req, rep) => {
        let jwt: string | undefined
        let side: 'server' | 'client' = 'client'
        jwt = req.headers['authorization']?.split(' ')[1]
        if (!jwt) {
          jwt = await this.checkAndRefreshTokens(req)
          side = 'server'
        }
        if (!jwt && this.config.get('login')?.required) {
          const currentUrl = req.url
          const loginUrl = `/_uaaa/login?redirect=${encodeURIComponent(currentUrl)}`
          return rep.redirect(loginUrl)
        }
        const token = jwt ? await this.auth.verify(jwt, side) : undefined
        const transform = await adapter.getTransform(req, rep, token)
        req.transform = transform
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
