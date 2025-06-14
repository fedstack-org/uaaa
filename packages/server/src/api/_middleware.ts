import { SECURITY_LEVEL, type ITokenPayload } from '@uaaa/core'
import { createMiddleware } from 'hono/factory'
import type jwt from 'jsonwebtoken'
import { BusinessError, Permission, type UAAA, type UAAAPermissionPath } from '../util/index.js'
export { arktypeValidator } from '@hono/arktype-validator'

declare module 'hono' {
  interface ContextVariableMap {
    jwt: jwt.Jwt
    token: ITokenPayload
    matchedPermissions: Permission<UAAA>[]
    matchedCapabilities?: Permission<UAAA>[]
  }
}

export const verifyAuthorizationJwt = createMiddleware(async (ctx, next) => {
  const header = ctx.req.header('Authorization')
  const token = header?.split(' ')[1]
  if (!token) {
    throw new BusinessError('FORBIDDEN', {
      msg: 'Missing Authorization header'
    })
  }
  const { jwt, payload } = await ctx.var.app.token.verifyUAAAToken(token)
  ctx.set('jwt', jwt)
  ctx.set('token', payload)
  await next()
})

export interface IVerifyPermissionOptions {
  path?: UAAAPermissionPath | undefined
  securityLevel?: number | undefined
}

const matchPermissions = <K extends string>(
  path: string,
  scopedPermissions: string[],
  appId: K
) => {
  const matched = scopedPermissions
    .map((p) => Permission.fromScopedString(p, appId))
    .filter((p) => p.test(path))
  if (!matched.length) {
    throw new BusinessError('INSUFFICIENT_PERMISSION', {
      required: [path]
    })
  }
  return matched
}

export const verifyPermission = ({
  path,
  securityLevel = SECURITY_LEVEL.LOW
}: IVerifyPermissionOptions) =>
  createMiddleware(async (ctx, next) => {
    if (ctx.var.token.level < securityLevel) {
      throw new BusinessError('INSUFFICIENT_SECURITY_LEVEL', {
        required: securityLevel
      })
    }
    if (path !== undefined) {
      const matchedPermissions = matchPermissions(path, ctx.var.token.perm, ctx.var.app.appId)
      ctx.set('matchedPermissions', matchedPermissions)
    }
    await next()
  })

export const verifyAdmin = createMiddleware(async (ctx, next) => {
  const { app, token } = ctx.var
  const user = await app.db.users.findOne(
    { _id: token.sub },
    { projection: { 'claims.is_admin': 1 } }
  )
  if (!user || user.claims.is_admin?.value !== 'true') {
    throw new BusinessError('REQUIRE_ADMIN', {})
  }
  await next()
})

export const verifyCapability = ({
  path,
  securityLevel = SECURITY_LEVEL.LOW
}: IVerifyPermissionOptions) =>
  createMiddleware(async (ctx, next) => {
    if (ctx.var.token.level < securityLevel) {
      throw new BusinessError('INSUFFICIENT_SECURITY_LEVEL', {
        required: securityLevel
      })
    }
    if (path !== undefined) {
      const matchedPermissions = matchPermissions(path, ctx.var.token.perm, ctx.var.app.appId)
      const user = await ctx.var.app.db.users.findOne(
        { _id: ctx.var.token.sub },
        { projection: { 'claims.capabilities': 1 } }
      )
      if (!user || !user.claims.capabilities?.verified) {
        throw new BusinessError('FORBIDDEN', { msg: 'Missing capabilities' })
      }
      const capabilities = user.claims.capabilities.value.split(',')
      const matchedCapabilities = matchPermissions(path, capabilities, ctx.var.app.appId)
      ctx.set('matchedPermissions', matchedPermissions)
      ctx.set('matchedCapabilities', matchedCapabilities)
    }
    await next()
  })
