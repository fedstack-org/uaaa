import { SECURITY_LEVEL, type SecurityLevel } from '@uaaa/core'
import { type } from 'arktype'
import ms from 'ms'
import { nanoid } from 'nanoid'
import { CredentialContext, CredentialImpl } from '../../../credential/_common.js'
import type { ICredentialEnsureResult, ICredentialUnbindResult } from '../../../index.js'
import { BusinessError, generateUsername } from '../../../util/index.js'
import type { SmsPlugin } from './plugin.js'

export class SmsImpl extends CredentialImpl {
  static readonly tPayload = type({
    phone: 'string',
    code: 'string'
  })
  static readonly tEnsurePayload = type({
    phone: 'string'
  })

  readonly type = 'sms'
  defaultLevel = SECURITY_LEVEL.HIGH
  loginType

  constructor(public plugin: SmsPlugin) {
    super()
    this.loginType = plugin.config.smsLogin ?? 'enabled'
  }

  private async _checkPayload(ctx: CredentialContext, payload: unknown) {
    const checked = SmsImpl.tPayload(payload)
    if (checked instanceof type.errors) {
      throw new BusinessError('BAD_REQUEST', { msg: checked.summary })
    }
    await this.plugin.checkCode(this.plugin.phoneKey(checked.phone), checked.code)
    return { phone: checked.phone }
  }

  override async showLogin(ctx: CredentialContext) {
    if (this.loginType !== 'enabled') return null
    return {}
  }

  override async login(ctx: CredentialContext, payload: unknown) {
    if (this.loginType === 'disabled') {
      throw new BusinessError('FORBIDDEN', { msg: 'SMS login is disabled' })
    }
    const { phone } = await this._checkPayload(ctx, payload)
    const credential = await ctx.app.db.credentials.findOne({
      data: phone,
      type: 'sms',
      disabled: { $ne: true }
    })
    if (credential) {
      await ctx.manager.checkCredentialUse(credential._id)
      return {
        userId: credential.userId,
        credentialId: credential._id,
        securityLevel: credential.securityLevel
      }
    }
    if (this.plugin.allowSignupFromLogin) {
      const now = Date.now()
      const { insertedId: userId } = await ctx.app.db.users.insertOne({
        _id: nanoid(),
        claims: {
          username: { value: generateUsername(phone) },
          phone: { value: phone, verified: true }
        },
        salt: nanoid()
      })
      const { insertedId: credentialId } = await ctx.app.db.credentials.insertOne({
        _id: nanoid(),
        globalIdentifier: phone,
        userIdentifier: '',
        userId: userId,
        type: 'sms',
        data: phone,
        secret: '',
        remark: '',
        validAfter: now,
        validBefore: now + ms('100y'),
        validCount: Number.MAX_SAFE_INTEGER,
        createdAt: now,
        updatedAt: now,
        securityLevel: this.defaultLevel
      })
      await ctx.manager.checkCredentialUse(credentialId)
      return {
        userId,
        credentialId,
        securityLevel: this.defaultLevel
      }
    }
    throw new BusinessError('NOT_FOUND', { msg: 'User not found' })
  }

  override async showVerify() {
    return {}
  }

  override async showBind(ctx: CredentialContext, userId: string) {
    const credential = await ctx.app.db.credentials.findOne({
      userId,
      type: 'sms'
    })
    return credential ? null : { securityLevel: this.defaultLevel }
  }

  override async verify(
    ctx: CredentialContext,
    userId: string,
    targetLevel: SecurityLevel,
    payload: unknown
  ) {
    const { phone } = await this._checkPayload(ctx, payload)
    const credential = await ctx.app.db.credentials.findOne({
      userId,
      data: phone,
      type: 'sms',
      securityLevel: { $gte: targetLevel },
      disabled: { $ne: true }
    })
    if (!credential) {
      throw new BusinessError('NOT_FOUND', { msg: 'SMS credential not found' })
    }
    await ctx.manager.checkCredentialUse(credential._id)

    return {
      credentialId: credential._id,
      securityLevel: targetLevel
    }
  }

  override async bind(
    ctx: CredentialContext,
    userId: string,
    credentialId: string | undefined,
    _payload: unknown
  ) {
    const { phone } = await this._checkPayload(ctx, _payload)
    await ctx.app.db.users.updateOne({ _id: userId }, [
      {
        $set: {
          'claims.phone': {
            $cond: {
              if: { $ne: ['$claims.phone.verified', true] },
              then: { value: phone, verified: true },
              else: '$claims.phone'
            }
          }
        }
      }
    ])
    return {
      credentialId: await ctx.manager.bindCredential(ctx, 'sms', userId, credentialId, {
        userIdentifier: '',
        globalIdentifier: phone,
        data: phone,
        secret: '',
        remark: '',
        expiration: ms('100y'),
        validCount: Number.MAX_SAFE_INTEGER,
        securityLevel: this.defaultLevel
      })
    }
  }

  override async unbind(
    ctx: CredentialContext,
    userId: string,
    credentialId: string,
    _payload: unknown
  ): Promise<ICredentialUnbindResult> {
    const { phone } = await this._checkPayload(ctx, _payload)
    await ctx.app.db.users.updateOne(
      { _id: userId, 'claims.phone.value': phone },
      { $set: { 'claims.phone.verified': false } }
    )
    await ctx.manager.unbindCredential(ctx, 'sms', userId, credentialId)
    return {}
  }

  override async ensure(
    ctx: CredentialContext,
    payload: unknown
  ): Promise<ICredentialEnsureResult> {
    const checked = SmsImpl.tEnsurePayload(payload)
    if (checked instanceof type.errors) {
      throw new BusinessError('BAD_REQUEST', { msg: checked.summary })
    }
    const { phone } = checked
    const credential = await ctx.app.db.credentials.findOne({
      data: phone,
      type: 'sms',
      disabled: { $ne: true }
    })
    if (credential) {
      return { userId: credential.userId }
    }
    const now = Date.now()
    const { insertedId: userId } = await ctx.app.db.users.insertOne({
      _id: nanoid(),
      claims: {
        username: { value: generateUsername(phone) },
        phone: { value: phone, verified: true }
      },
      salt: nanoid()
    })
    await ctx.app.db.credentials.insertOne({
      _id: nanoid(),
      globalIdentifier: phone,
      userIdentifier: '',
      userId: userId,
      type: 'sms',
      data: phone,
      secret: '',
      remark: '',
      validAfter: now,
      validBefore: now + ms('100y'),
      validCount: Number.MAX_SAFE_INTEGER,
      createdAt: now,
      updatedAt: now,
      securityLevel: this.defaultLevel
    })
    return { userId }
  }
}
