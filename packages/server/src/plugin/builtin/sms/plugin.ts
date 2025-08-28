import { arktypeValidator } from '@hono/arktype-validator'
import { type } from 'arktype'
import { Hono } from 'hono'
import { customAlphabet } from 'nanoid'
import { getRemoteIP } from '../../../api/_helper.js'
import type { App, PluginContext } from '../../../index.js'
import { BusinessError, logger } from '../../../util/index.js'
import { SmsImpl } from './credential.js'

export const tSmsConfig = type({
  smsGateway: 'string',
  'smsGatewayContext?': 'unknown',
  'smsGatewayVariables?': 'unknown',
  'smsCodeVariable?': 'string|undefined',
  'smsAllowSignup?': 'boolean|undefined',
  'smsWhitelist?': 'string[]|undefined',
  'smsLogin?': '"enabled" | "hidden" | "disabled"',
  'smsRateLimitPerIP?': 'number|undefined',
  'smsRateLimitPerIPPhone?': 'number|undefined',
  'smsRateLimitWindow?': 'number|undefined'
})

type ISmsConfig = typeof tSmsConfig.infer

declare module '../../../index.js' {
  interface IConfig extends ISmsConfig {}
  interface ICredentialTypeMap {
    sms: string
  }
}

const codegen = customAlphabet('0123456789', 6)

export class SmsPlugin {
  gateway
  gatewayContext: Record<string, string>
  gatewayVariables: Record<string, string>
  codeVariable: string
  allowSignupFromLogin = false
  whitelist?: Array<string | RegExp>
  rateLimitPerIP: number
  rateLimitPerIPPhone: number
  rateLimitWindow: number

  constructor(
    public app: App,
    public config: ISmsConfig = app.config.getAll()
  ) {
    this.gateway = config.smsGateway
    this.gatewayContext = (config.smsGatewayContext as Record<string, string>) ?? {}
    this.gatewayVariables = (config.smsGatewayVariables as Record<string, string>) ?? {}
    this.codeVariable = config.smsCodeVariable ?? 'code'
    this.allowSignupFromLogin = config.smsAllowSignup ?? false
    this.rateLimitPerIP = config.smsRateLimitPerIP ?? 30
    this.rateLimitPerIPPhone = config.smsRateLimitPerIPPhone ?? 10
    this.rateLimitWindow = config.smsRateLimitWindow ?? 3600000 // 1 hour
    if (config.smsWhitelist) {
      this.whitelist = []
      for (const item of config.smsWhitelist) {
        if (typeof item !== 'string') throw new Error(`Invalid SMS whitelist: ${item}`)
        if (item.startsWith('/')) {
          const pattern = item.slice(1, -1)
          this.whitelist.push(new RegExp(pattern))
        } else {
          this.whitelist.push(item)
        }
      }
    }
  }

  async setup(ctx: PluginContext) {
    ctx.app.credential.provide(new SmsImpl(this))
    ctx.app.hook('extendApp', (router) => {
      router.route('/api/plugin/sms', this.getApiRouter())
    })
  }

  private checkWhitelist(phone: string): boolean {
    if (!this.whitelist) return true
    for (const item of this.whitelist) {
      if (typeof item === 'string') {
        if (item === phone) return true
      } else {
        if (item.test(phone)) return true
      }
    }
    return false
  }

  phoneKey(phone: string): string {
    return `smscode:${btoa(phone)}`
  }

  private async checkRateLimit(ip: string, phone: string): Promise<void> {
    const ipPhoneKey = `sms_rate_limit:ip_phone:${ip}:${encodeURIComponent(phone)}`
    const ipPhoneCount = await this.app.cache.incr(ipPhoneKey, 1, this.rateLimitWindow)
    if (ipPhoneCount > this.rateLimitPerIPPhone) {
      const ipPhoneTtl = await this.app.cache.ttl(ipPhoneKey)
      throw new BusinessError('TOO_MANY_REQUESTS', {
        msg: `Too many messages sent to this phone from your IP. Wait for ${Math.ceil(ipPhoneTtl / 1000)} seconds`
      })
    }

    const ipKey = `sms_rate_limit:ip:${ip}`
    const ipCount = await this.app.cache.incr(ipKey, 1, this.rateLimitWindow)
    if (ipCount > this.rateLimitPerIP) {
      const ipTtl = await this.app.cache.ttl(ipKey)
      throw new BusinessError('TOO_MANY_REQUESTS', {
        msg: `Too many messages sent from this IP. Wait for ${Math.ceil(ipTtl / 1000)} seconds`
      })
    }
  }

  private async sendCode(key: string, phone: string, purpose: string) {
    if (!this.checkWhitelist(phone))
      throw new BusinessError('FORBIDDEN', { msg: 'Phone number not allowed' })
    const ttl = await this.app.cache.ttl(key)
    if (ttl > 0) {
      throw new BusinessError('TOO_MANY_REQUESTS', {
        msg: `Wait for ${Math.ceil(ttl / 1000)} seconds`
      })
    }
    const code = codegen()
    await this.app.cache.setx(key, { code, phone, n: 5 }, 5 * 60 * 1000)
    try {
      const resp = await fetch(new URL('/send', this.gateway), {
        headers: {
          'Content-type': "application/json;charset='utf-8'",
          Accept: 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({
          target: [phone],
          variables: {
            ...this.gatewayVariables,
            [this.codeVariable]: code
          },
          context: {
            purpose,
            ...this.gatewayContext
          }
        })
      })
      const { success, error } = await resp.json()
      if (!success) {
        throw new BusinessError('BAD_REQUEST', { msg: error })
      }
      logger.info(`SMS sent to ${phone} for ${purpose}: ok`)
    } catch (err) {
      await this.app.cache.del(key)
      logger.info(`SMS sent to ${phone} for ${purpose}: ${err}`)
      throw err
    }
  }

  async checkCode(key: string, code: string) {
    const ttl = await this.app.cache.ttl(key)
    const value = await this.app.cache.getx<{ code: string; phone: string; n: number }>(key)
    await this.app.cache.del(key)
    if (!value) throw new BusinessError('BAD_REQUEST', { msg: 'Invalid code' })
    if (value.code !== code) {
      if (ttl > 0 && value.n > 0) {
        await this.app.cache.setx(key, { ...value, n: value.n - 1 }, ttl)
      }
      throw new BusinessError('BAD_REQUEST', { msg: 'Invalid code' })
    }
    return value
  }

  getApiRouter() {
    return new Hono().post(
      '/send',
      arktypeValidator(
        'json',
        type({
          phone: 'string'
        })
      ),
      async (ctx) => {
        const { phone } = ctx.req.valid('json')
        const clientIP = getRemoteIP(ctx)
        await this.checkRateLimit(clientIP, phone)
        await this.sendCode(this.phoneKey(phone), phone, 'verification')

        return ctx.json({})
      }
    )
  }
}
