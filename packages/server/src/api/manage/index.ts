import { SECURITY_LEVEL } from '@uaaa/core'
import { type } from 'arktype'
import { Hono } from 'hono'
import { arktypeValidator, verifyAuthorizationJwt, verifyPermission } from '../_middleware.js'

export const manageApi = new Hono()
  .use(verifyAuthorizationJwt)
  .post(
    '/user/ensure',
    verifyPermission({ path: '/manage/user/ensure', securityLevel: SECURITY_LEVEL.LOW }),
    arktypeValidator('json', type({ type: 'string', payload: 'unknown' })),
    async (ctx) => {
      const { type, payload } = ctx.req.valid('json')
      return ctx.json(await ctx.var.app.credential.handleEnsure(ctx, type, payload))
    }
  )

export type IManageApi = typeof manageApi
