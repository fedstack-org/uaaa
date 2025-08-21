import { type } from 'arktype'
import type { Context } from 'hono'
import { nanoid } from 'nanoid'
import type { App, ClaimName, IAppDoc, IUserClaims } from '../index.js'
import { BusinessError } from '../util/index.js'

export interface ICASServiceValidateResponse {
  user: string
  attributes?: Record<string, string>
}

export class CASManager {
  static tLoginRequest = type({
    service: 'string',
    'renew?': 'string',
    'gateway?': 'string'
  })

  static tServiceValidateRequest = type({
    service: 'string',
    ticket: 'string',
    'format?': 'string'
  })

  static tLogoutRequest = type({
    'service?': 'string',
    'url?': 'string'
  })

  private _base: string

  constructor(public app: App) {
    this._base = app.config.get('deploymentUrl')
  }

  /**
   * Handle CAS login request - redirect to UI for authentication
   */
  async loginToUI(ctx: Context, _request: Record<string, string>) {
    const request = CASManager.tLoginRequest(_request)
    if (request instanceof type.errors) {
      throw new BusinessError('BAD_REQUEST', { msg: 'Invalid CAS login request' })
    }

    const { service, renew, gateway } = request

    // Validate service URL
    await this._validateServiceUrl(service)

    // Build authorize URL with CAS-specific parameters
    const authorizeUrl = new URL(`${this._base}/ui/authorize`)
    authorizeUrl.searchParams.set('type', 'cas')
    authorizeUrl.searchParams.set('appId', 'cas') // Use 'cas' as special app identifier
    authorizeUrl.searchParams.set('securityLevel', '1')
    authorizeUrl.searchParams.set('params', JSON.stringify({ service }))
    if (renew) authorizeUrl.searchParams.set('renew', renew)
    if (gateway) authorizeUrl.searchParams.set('gateway', gateway)

    return authorizeUrl.toString()
  }

  /**
   * Handle CAS logout request
   */
  async logoutToUI(ctx: Context, _request: Record<string, string>) {
    const request = CASManager.tLogoutRequest(_request)
    if (request instanceof type.errors) {
      throw new BusinessError('BAD_REQUEST', { msg: 'Invalid CAS logout request' })
    }

    const { service } = request

    // Build logout URL
    const logoutUrl = new URL(`${this._base}/ui/logout`)
    logoutUrl.searchParams.set('type', 'cas')
    if (service) logoutUrl.searchParams.set('service', service)

    return logoutUrl.toString()
  }

  /**
   * Generate CAS service ticket
   */
  async generateServiceTicket(ctx: Context, service: string, userId: string): Promise<string> {
    const { db } = this.app
    const { tokens } = db

    // Generate ticket with CAS prefix
    const ticket = `ST-${nanoid(32)}`

    // Store ticket in database with service and user info
    await tokens.insertOne({
      _id: nanoid(),
      ticket,
      service,
      userId,
      type: 'cas_ticket',
      appId: 'cas', // Use 'cas' as a special app identifier
      sessionId: ctx.var.token?.sid || '',
      permissions: [],
      securityLevel: ctx.var.token?.level || 'LOW',
      terminated: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes expiry
      activatedAt: Date.now(),
      refreshTimeout: 0,
      jwtTimeout: 0,
      environment: {
        ip: ctx.req.header('x-forwarded-for') || ctx.req.header('x-real-ip') || 'unknown',
        ua: ctx.req.header('user-agent') || 'unknown'
      }
    } as any)

    return ticket
  }

  /**
   * Validate CAS service ticket and return user info
   */
  async serviceValidate(ctx: Context, _request: Record<string, string>): Promise<string> {
    const request = CASManager.tServiceValidateRequest(_request)
    if (request instanceof type.errors) {
      return this._buildErrorResponse('INVALID_REQUEST', 'Invalid request parameters')
    }

    const { service, ticket, format } = request

    try {
      // Validate service URL
      await this._validateServiceUrl(service)

      // Find and consume ticket
      const { db } = this.app
      const { tokens, sessions } = db

      const tokenDoc = await tokens.findOneAndDelete({
        ticket,
        service,
        type: 'cas_ticket',
        terminated: { $ne: true },
        expiresAt: { $gt: Date.now() }
      })

      if (!tokenDoc) {
        return this._buildErrorResponse('INVALID_TICKET', 'Ticket not found or expired')
      }

      // Get user session and claims
      const session = await sessions.findOne({
        _id: tokenDoc.sessionId,
        terminated: { $ne: true }
      })

      if (!session) {
        return this._buildErrorResponse('INVALID_TICKET', 'Session not found')
      }

      // Get user and claims
      const user = await this.app.db.users.findOne({ _id: tokenDoc.userId })
      if (!user) {
        return this._buildErrorResponse('INVALID_TICKET', 'User not found')
      }

      // Get user claims for attributes
      const claims = await this.app.claim.filterBasicClaims(ctx, user.claims || {})
      
      // Build success response
      return this._buildSuccessResponse(tokenDoc.userId, claims, format)

    } catch (error) {
      return this._buildErrorResponse('INTERNAL_ERROR', 'Internal server error')
    }
  }

  /**
   * Validate service URL against configured allowed services
   */
  private async _validateServiceUrl(service: string) {
    // For now, allow any HTTPS URL. In production, this should check against
    // a whitelist of allowed service URLs configured per application
    try {
      const url = new URL(service)
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new BusinessError('BAD_REQUEST', { msg: 'Invalid service URL protocol' })
      }
    } catch {
      throw new BusinessError('BAD_REQUEST', { msg: 'Invalid service URL' })
    }
  }

  /**
   * Build CAS success response XML
   */
  private _buildSuccessResponse(user: string, claims: Partial<IUserClaims>, format?: string): string {
    const attributes = this._buildAttributes(claims)
    
    if (format === 'JSON') {
      return JSON.stringify({
        serviceResponse: {
          authenticationSuccess: {
            user,
            attributes
          }
        }
      })
    }

    // Default XML format
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">\n'
    xml += '  <cas:authenticationSuccess>\n'
    xml += `    <cas:user>${this._escapeXml(user)}</cas:user>\n`
    
    if (Object.keys(attributes).length > 0) {
      xml += '    <cas:attributes>\n'
      for (const [key, value] of Object.entries(attributes)) {
        xml += `      <cas:${this._escapeXml(key)}>${this._escapeXml(value)}</cas:${this._escapeXml(key)}>\n`
      }
      xml += '    </cas:attributes>\n'
    }
    
    xml += '  </cas:authenticationSuccess>\n'
    xml += '</cas:serviceResponse>'
    
    return xml
  }

  /**
   * Build CAS error response XML
   */
  private _buildErrorResponse(code: string, description: string): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">\n'
    xml += `  <cas:authenticationFailure code="${this._escapeXml(code)}">\n`
    xml += `    ${this._escapeXml(description)}\n`
    xml += '  </cas:authenticationFailure>\n'
    xml += '</cas:serviceResponse>'
    
    return xml
  }

  /**
   * Convert user claims to CAS attributes
   */
  private _buildAttributes(claims: Partial<IUserClaims>): Record<string, string> {
    const attributes: Record<string, string> = {}
    
    for (const [key, claim] of Object.entries(claims)) {
      if (claim?.value && typeof claim.value === 'string') {
        attributes[key] = claim.value
      }
    }
    
    return attributes
  }

  /**
   * Escape XML special characters
   */
  private _escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }
}