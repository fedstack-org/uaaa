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

export class AuthManager {
  constructor(public app: App) {}

  async init() {
    const UAAA_INSTANCE = process.env.UAAA_INSTANCE || 'https://unifiedauth.pku.edu.cn'
    const UAAA_APP_ID = process.env.UAAA_APP_ID || 'cn.edu.pku.aiforum'
    const UAAA_DISCOVERY_URL = new URL('.well-known/openid-configuration', UAAA_INSTANCE)
    const openidConfig = await fetch(UAAA_DISCOVERY_URL)
      .then((res) => res.json())
      .then((config) => tOpenIdConfig(config))
    if (openidConfig instanceof type.errors) {
      logger.fatal(`Invalid openid config: ${openidConfig.summary}`)
      throw new Error('Invalid openid config')
    }
    const UAAA_OPENID_CONFIG = openidConfig
    const { jwks_uri } = UAAA_OPENID_CONFIG
    const UAAA_JWKS = jose.createRemoteJWKSet(new URL(jwks_uri))
  }
}
