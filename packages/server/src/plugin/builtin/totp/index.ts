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
  totpDriftTolerance: number

  constructor(public config: ITOTPConfig) {
    super()
    this.newCredentialSecurityLevel = config.totpSecurityLevel ?? SECURITY_LEVEL.HIGH
    const driftTolerance = config.totpDriftTolerance ?? 0.1
    if (driftTolerance < 0 || driftTolerance > 0.5) {
      throw new Error('totpDriftTolerance must be between 0 and 0.5')
    }
    this.totpDriftTolerance = driftTolerance
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
    const { otp, expires } = TOTP.generate(credential.secret as string, { timestamp: now })
    let isValid = safeCompare(payload.code, otp)

    if (!isValid) {
      const timeElapsedInPeriod = now - (expires - period)
      // Case 1: User's clock is slower than server's.
      // The server just generated a new code, but the user's device is still showing the previous one.
      // This happens at the beginning of the period.
      if (timeElapsedInPeriod < period * this.totpDriftTolerance) {
        const { otp: lastOtp } = TOTP.generate(credential.secret as string, {
          timestamp: now - period
        })
        if (safeCompare(payload.code, lastOtp)) {
          isValid = true
        }
      }
      // Case 2: User's clock is faster than server's.
      // The user's device has already generated the next code, while the server is still in the current period.
      // This happens at the end of the period.
      const timeRemainingInPeriod = expires - now
      if (!isValid && timeRemainingInPeriod < period * this.totpDriftTolerance) {
        const { otp: nextOtp } = TOTP.generate(credential.secret as string, {
          timestamp: now + period
        })
        if (safeCompare(payload.code, nextOtp)) {
          isValid = true
        }
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
