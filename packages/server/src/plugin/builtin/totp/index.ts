import { SECURITY_LEVEL, tSecurityLevel, type SecurityLevel } from '@uaaa/core'
import { type } from 'arktype'
import ms from 'ms'
import { TOTP } from 'totp-generator'
import {
  CredentialContext,
  CredentialImpl,
  type ICredentialUnbindResult
} from '../../../credential/_common.js'
import { BusinessError, safeCompare } from '../../../util/index.js'
import { definePlugin } from '../../_common.js'

const tTOTPConfig = type({
  'totpSecurityLevel?': tSecurityLevel,
  'totpDriftTolerance?': 'number'
})

type ITOTPConfig = typeof tTOTPConfig.infer

declare module '../../../index.js' {
  interface IConfig extends ITOTPConfig {}
  interface ICredentialTypeMap {
    totp: string
  }
}

class TOTPImpl extends CredentialImpl {
  static readonly tVerifyPayload = type({
    code: 'string'
  })
  static readonly tBindPayload = type({
    code: 'string',
    secret: 'string'
  })

  readonly type = 'totp'

  newCredentialSecurityLevel
  totpDriftTolerance

  constructor(public config: ITOTPConfig) {
    super()
    this.newCredentialSecurityLevel = config.totpSecurityLevel ?? SECURITY_LEVEL.HIGH
    this.totpDriftTolerance = config.totpDriftTolerance ?? 0.1
  }

  override async showLogin(ctx: CredentialContext) {
    return null
  }

  override async showVerify() {
    return {}
  }

  override async showBind(ctx: CredentialContext, userId: string) {
    const credential = await ctx.app.db.credentials.findOne({
      userId,
      type: this.type
    })
    return credential ? null : { securityLevel: this.newCredentialSecurityLevel }
  }

  override async verify(
    ctx: CredentialContext,
    userId: string,
    targetLevel: SecurityLevel,
    _payload: unknown
  ) {
    const payload = TOTPImpl.tVerifyPayload(_payload)
    if (payload instanceof type.errors) {
      throw new BusinessError('INVALID_TYPE', { summary: payload.summary })
    }
    const credential = await ctx.app.db.credentials.findOne({
      userId,
      type: this.type,
      securityLevel: { $gte: targetLevel },
      disabled: { $ne: true }
    })
    if (!credential) {
      throw new BusinessError('NOT_FOUND', { msg: 'TOTP credential not found' })
    }

    const now = Date.now()
    const period = 30 * 1000 // Default period is 30s
    const { otp, expires } = TOTP.generate(credential.secret as string)
    let isValid = safeCompare(payload.code, otp)

    if (!isValid && period - (expires - now) < period * this.totpDriftTolerance) {
      const { otp: lastOtp } = TOTP.generate(credential.secret as string, {
        timestamp: now - period
      })
      if (safeCompare(payload.code, lastOtp)) {
        isValid = true
      }
    }

    if (!isValid) {
      throw new BusinessError('FORBIDDEN', { msg: 'Invalid TOTP code' })
    }

    await ctx.manager.checkCredentialUse(credential._id)
    return {
      credentialId: credential._id,
      securityLevel: credential.securityLevel
    }
  }

  override async bind(
    ctx: CredentialContext,
    userId: string,
    credentialId: string | undefined,
    _payload: unknown
  ) {
    const payload = TOTPImpl.tBindPayload(_payload)
    if (payload instanceof type.errors) {
      throw new BusinessError('INVALID_TYPE', { summary: payload.summary })
    }

    const { otp } = TOTP.generate(payload.secret)
    if (!safeCompare(payload.code, otp)) {
      throw new BusinessError('BAD_REQUEST', { msg: 'Invalid TOTP code' })
    }

    return {
      credentialId: await ctx.manager.bindCredential(ctx, 'totp', userId, credentialId, {
        userIdentifier: '',
        data: '',
        secret: payload.secret,
        remark: '',
        expiration: ms('100y'),
        validCount: Number.MAX_SAFE_INTEGER,
        securityLevel: this.newCredentialSecurityLevel
      })
    }
  }

  override async unbind(
    ctx: CredentialContext,
    userId: string,
    credentialId: string,
    payload: unknown
  ): Promise<ICredentialUnbindResult> {
    await ctx.manager.unbindCredential(ctx, 'totp', userId, credentialId)
    return {}
  }
}

export default definePlugin({
  name: 'totp',
  configType: tTOTPConfig,
  setup: async (ctx) => {
    ctx.app.credential.provide(new TOTPImpl(ctx.app.config.getAll()))
  }
})
