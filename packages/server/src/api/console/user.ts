import { Hono } from 'hono'
import { type } from 'arktype'
import type { Filter } from 'mongodb'
import type { IUserDoc } from '../../db/index.js'
import { idParamValidator, pageQueryValidator, searchQueryValidator } from '../_common.js'
import { arktypeValidator, verifyPermission } from '../_middleware.js'
import { BusinessError } from '../../util/errors.js'

function buildUserFilter(search?: string, disabled?: boolean): Filter<IUserDoc> {
  const filter: Filter<IUserDoc> = {}
  if (search) {
    const regex = { $regex: search, $options: 'i' }
    filter.$or = [
      { 'claims.username.value': regex },
      { 'claims.email.value': regex },
      { _id: regex }
    ]
  }
  if (disabled !== undefined) {
    filter.disabled = disabled ? true : { $ne: true }
  }
  return filter
}

export const consoleUserApi = new Hono()
  .use(verifyPermission({ path: '/console/user' }))
  .get('/', searchQueryValidator, async (ctx) => {
    const { app } = ctx.var
    const { skip, limit, count, search, disabled } = ctx.req.valid('query')
    const filter = buildUserFilter(search, disabled)
    const users = await app.db.users.find(filter, { skip, limit, projection: { salt: 0 } }).toArray()
    return ctx.json({ users, count: count ? await app.db.users.countDocuments(filter) : 0 })
  })
  .get('/:id', idParamValidator, async (ctx) => {
    const { app } = ctx.var
    const { id } = ctx.req.valid('param')
    const user = await app.db.users.findOne({ _id: id }, { projection: { salt: 0 } })
    if (!user) throw new BusinessError('NOT_FOUND', { msg: 'User not found' })
    return ctx.json({ user })
  })
  .get('/:id/credential', idParamValidator, async (ctx) => {
    const { app } = ctx.var
    const { id } = ctx.req.valid('param')
    const credentials = await app.db.credentials
      .find({ userId: id }, { projection: { secret: 0 } })
      .toArray()
    return ctx.json({ credentials })
  })
  .get(
    '/:id/session',
    idParamValidator,
    pageQueryValidator,
    async (ctx) => {
      const { app } = ctx.var
      const { id } = ctx.req.valid('param')
      const { skip, limit, count } = ctx.req.valid('query')
      const filter = { userId: id }
      const sessions = await app.db.sessions
        .find(filter, { skip, limit, sort: { createdAt: -1 } })
        .toArray()
      return ctx.json({ sessions, count: count ? await app.db.sessions.countDocuments(filter) : 0 })
    }
  )
  .get('/:id/installation', idParamValidator, async (ctx) => {
    const { app } = ctx.var
    const { id } = ctx.req.valid('param')
    const installations = await app.db.installations.find({ userId: id }).toArray()
    return ctx.json({ installations })
  })
  .patch(
    '/:id/claim/:name',
    arktypeValidator('param', type({ id: 'string', name: 'string' })),
    arktypeValidator('json', type({ value: 'string' })),
    async (ctx) => {
      const { app } = ctx.var
      const { id, name } = ctx.req.valid('param')
      const { value } = ctx.req.valid('json')
      if (!app.claim.hasClaim(name)) {
        throw new BusinessError('BAD_REQUEST', { msg: `Claim ${name} does not exist` })
      }
      const descriptor = app.claim.getClaimDescriptor(name)
      if (false === (descriptor.editable ?? false)) {
        throw new BusinessError('FORBIDDEN', { msg: `Claim ${name} is not editable` })
      }
      await app.claim.verifyClaim(ctx, name, value)
      await app.db.users.updateOne(
        { _id: id, [`claims.${name}.verified`]: { $ne: true } },
        { $set: { [`claims.${name}.value`]: value } }
      )
      return ctx.json({})
    }
  )
  .put('/:id/enable', idParamValidator, async (ctx) => {
    const { app } = ctx.var
    const { id } = ctx.req.valid('param')
    await app.db.users.updateOne({ _id: id }, { $unset: { disabled: '' } })
    return ctx.json({})
  })
  .put('/:id/disable', idParamValidator, async (ctx) => {
    const { app } = ctx.var
    const { id } = ctx.req.valid('param')
    await app.db.users.updateOne({ _id: id }, { $set: { disabled: true } })
    await app.db.sessions.updateMany({ userId: id }, { $set: { terminated: true } })
    await app.db.tokens.updateMany({ userId: id }, { $set: { terminated: true } })
    return ctx.json({})
  })
