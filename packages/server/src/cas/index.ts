import { Hono } from 'hono'
import { arktypeValidator } from '@hono/arktype-validator'
import { type } from 'arktype'

export const casRouter = new Hono()
  // CAS Login endpoint
  // Specification: https://apereo.github.io/cas/6.6.x/protocol/CAS-Protocol-Specification.html#login
  .get('/login', async (ctx) => {
    const url = await ctx.var.app.cas.loginToUI(ctx, ctx.req.query())
    return ctx.redirect(url)
  })
  .post('/login', arktypeValidator('form', type('Record<string,string>')), async (ctx) => {
    const url = await ctx.var.app.cas.loginToUI(ctx, ctx.req.valid('form'))
    return ctx.redirect(url)
  })

  // CAS Service Validate endpoint
  // Specification: https://apereo.github.io/cas/6.6.x/protocol/CAS-Protocol-Specification.html#service-validate
  .get('/serviceValidate', async (ctx) => {
    const response = await ctx.var.app.cas.serviceValidate(ctx, ctx.req.query())
    
    // Determine content type based on format parameter
    const format = ctx.req.query('format')
    const contentType = format === 'JSON' ? 'application/json' : 'application/xml'
    
    ctx.header('Content-Type', `${contentType}; charset=utf-8`)
    return ctx.body(response)
  })

  // CAS Logout endpoint
  // Specification: https://apereo.github.io/cas/6.6.x/protocol/CAS-Protocol-Specification.html#logout
  .get('/logout', async (ctx) => {
    const url = await ctx.var.app.cas.logoutToUI(ctx, ctx.req.query())
    return ctx.redirect(url)
  })
  .post('/logout', arktypeValidator('form', type('Record<string,string>')), async (ctx) => {
    const url = await ctx.var.app.cas.logoutToUI(ctx, ctx.req.valid('form'))
    return ctx.redirect(url)
  })

  // CAS v3 Service Validate endpoint (alias for serviceValidate with extended features)
  .get('/p3/serviceValidate', async (ctx) => {
    const response = await ctx.var.app.cas.serviceValidate(ctx, ctx.req.query())
    
    const format = ctx.req.query('format')
    const contentType = format === 'JSON' ? 'application/json' : 'application/xml'
    
    ctx.header('Content-Type', `${contentType}; charset=utf-8`)
    return ctx.body(response)
  })