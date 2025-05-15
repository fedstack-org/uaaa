import { tTokenPayload } from '@uaaa/core'
import { type } from 'arktype'
import * as jose from 'jose'
import type { App } from '../index.js'
import { logger } from '../util/index.js'

export const tOpenIdConfig = type({
  issuer: 'string',
  authorization_endpoint: 'string',
  token_endpoint: 'string',
  userinfo_endpoint: 'string',
  // end_session_endpoint: 'string',
  jwks_uri: 'string',
  response_types_supported: 'string[]',
  subject_types_supported: 'string[]',
  id_token_signing_alg_values_supported: 'string[]'
  // code_challenge_methods_supported: 'string[]'
})
export type OpenIdConfig = typeof tOpenIdConfig.infer
export type RemoteJWKSet = ReturnType<typeof jose.createRemoteJWKSet>

export class AuthManager {
  issuer
  issuerAppId
  serverAppId
  _config?: OpenIdConfig
  _jwks?: RemoteJWKSet

  constructor(public app: App) {
    this.issuer = app.config.get('issuer')
    this.issuerAppId = app.config.get('issuerAppId')
    this.serverAppId = app.config.get('serverAppId')
  }

  get config() {
    if (!this._config) {
      throw new Error('AuthManager not initialized')
    }
    return this._config
  }

  async init() {
    const UAAA_DISCOVERY_URL = new URL('.well-known/openid-configuration', this.issuer)
    const openidConfig = await fetch(UAAA_DISCOVERY_URL)
      .then((res) => res.json())
      .then((config) => tOpenIdConfig(config))
    if (openidConfig instanceof type.errors) {
      logger.fatal(`Invalid openid config: ${openidConfig.summary}`)
      throw new Error('Invalid openid config')
    }
    this._config = openidConfig
    const { jwks_uri } = this._config
    this._jwks = jose.createRemoteJWKSet(new URL(jwks_uri))
  }

  async verify(jwt: string) {
    if (!this._jwks) {
      throw new Error('AuthManager not initialized')
    }
    const { payload } = await jose.jwtVerify(jwt, this._jwks, {
      issuer: this.issuer,
      audience: this.serverAppId
    })
    const token = tTokenPayload(payload)
    if (token instanceof type.errors) {
      throw new Error('Invalid token payload')
    }
    return token
  }
}
