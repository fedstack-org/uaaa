import { SECURITY_LEVEL } from '@uaaa/core'
import { Hono } from 'hono'
import { verifyAdmin, verifyAuthorizationJwt, verifyPermission } from '../_middleware.js'
import { consoleAppApi } from './app.js'
import { consoleSystemApi } from './system.js'
import { consoleUserApi } from './user.js'

export const consoleApi = new Hono()
  .use(verifyAuthorizationJwt)
  .use(verifyPermission({ securityLevel: SECURITY_LEVEL.MAX }))
  .use(verifyAdmin)
  .get('/stats', verifyPermission({ path: '/console/info' }), async (ctx) => {
    const { app } = ctx.var
    const now = Date.now()
    const [userCount, appCount, activeSessionCount, activeTokenCount] = await Promise.all([
      app.db.users.countDocuments(),
      app.db.apps.countDocuments(),
      app.db.sessions.countDocuments({
        expiresAt: { $gt: now },
        terminated: { $ne: true }
      }),
      app.db.tokens.countDocuments({
        expiresAt: { $gt: now },
        terminated: { $ne: true }
      })
    ])
    return ctx.json({ userCount, appCount, activeSessionCount, activeTokenCount })
  })
  .route('/user', consoleUserApi)
  .route('/app', consoleAppApi)
  .route('/system', consoleSystemApi)

export type IConsoleApi = typeof consoleApi
