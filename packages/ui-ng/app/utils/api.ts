import type {
  ErrorName,
  IClaim,
  IConsoleApi,
  IErrorMap,
  IPublicApi,
  ISessionApi,
  ITokenPayload,
  IUserApi,
  IUserClaims,
  SecurityLevel
} from '@uaaa/server'
import type { IEmailApi } from '@uaaa/server/lib/plugin/builtin/email'
import type { ISmsApi } from '@uaaa/server/lib/plugin/builtin/sms'
import type { IWebauthnApi } from '@uaaa/server/lib/plugin/builtin/webauthn'
import { hc } from 'hono/client'

export type { SecurityLevel }

export interface IClientToken {
  token: string
  refreshToken?: string
  decoded: ITokenPayload
}

export interface ICandidateToken extends IClientToken {
  claims: ICandidateClaims
}

export interface IUserClaim extends IClaim {
  name: string
}

export class APIError<
  T extends ErrorName | 'UNKNOWN_ERROR' = ErrorName | 'UNKNOWN_ERROR'
> extends Error {
  code: T
  data: T extends ErrorName ? IErrorMap[T] : { msg: string }
  constructor(code: T, data: APIError<T>['data']) {
    super(
      `${code}: ${Object.entries(data)
        .map(([k, v]) => `${k}=${v}`)
        .join(',')}`
    )
    this.code = code
    this.data = data
  }
}

export type APIErrorType = {
  [K in ErrorName | 'UNKNOWN_ERROR']: APIError<K>
}[ErrorName | 'UNKNOWN_ERROR']

export const isAPIError = (err: unknown): err is APIErrorType => err instanceof APIError

const serializer = {
  read: JSON.parse,
  write: JSON.stringify
}

const options = { serializer }

export class ApiManager {
  tokens
  candidateTokens
  effectiveToken
  appId
  isLoggedIn
  securityLevel
  claims
  isAdmin

  public
  session
  user
  console

  email
  sms
  webauthn

  private _currentTask: 'refresh' | 'apply' | null = null

  constructor() {
    this.tokens = useLocalStorage<IClientToken[]>('tokens_v2', [], options)
    this.candidateTokens = useLocalStorage<Record<string, ICandidateToken>>(
      'candidate_tokens',
      {},
      options
    )
    this.securityLevel = useLocalStorage<SecurityLevel | -1>('level_v2', -1, options)
    this.effectiveToken = computed<IClientToken | null>(
      () => this.tokens.value[this.securityLevel.value] ?? null
    )
    this.appId = computed(() => this.effectiveToken.value?.decoded.client_id ?? '')
    this.isLoggedIn = computed(() => this.securityLevel.value !== -1)
    this.claims = useLocalStorage<Partial<IUserClaims>>('session_claims', {}, options)
    this.isAdmin = computed(() => this.claims.value.is_admin?.value === 'true')

    const headers = this.getHeaders.bind(this)
    this.public = hc<IPublicApi>('/api/public')
    this.session = hc<ISessionApi>('/api/session', { headers })
    this.user = hc<IUserApi>('/api/user', { headers })
    this.console = hc<IConsoleApi>('/api/console', { headers })

    this.email = hc<IEmailApi>('/api/plugin/email', { headers })
    this.sms = hc<ISmsApi>('/api/plugin/sms', { headers })
    this.webauthn = hc<IWebauthnApi>('/api/plugin/webauthn', { headers })

    if (this.isLoggedIn.value) {
      setTimeout(() => this.getSessionClaims().catch(console.error), 0)
    }

    this.refreshCandidateTokens()
  }

  private async _synchronized(fn: () => Promise<void>, task: 'refresh' | 'apply') {
    if (this._currentTask) {
      // Skip refresh if another task is running
      if (task === 'refresh' && this._currentTask !== 'refresh') return
    }
    await navigator.locks.request(`tokens`, async () => {
      this._currentTask = task
      await fn()
      this._currentTask = null
    })
  }

  private async _performTokenRefresh(refreshToken: string, clientAppId: string) {
    try {
      const resp = await this.public.refresh.$post({
        json: { clientAppId, refreshToken }
      })
      await this.checkResponse(resp)
      const data = await resp.json()
      return data
    } catch (err) {
      if (isAPIError(err) && err.code === 'TOKEN_INVALID_REFRESH') {
        console.log(`[API] Token failed to refresh: invalid refreshToken`)
        return false
      } else {
        console.log(`[API] Token failed to refresh: ${this._formatError(err)}`)
      }
      return null
    }
  }

  private async _refreshTokenFor(level: SecurityLevel, now = Date.now()) {
    const token = this.tokens.value[level]
    if (!token) return
    const remaining = token.decoded.exp * 1000 - now
    const lifetime = (token.decoded.exp - token.decoded.iat) * 1000
    if (remaining > lifetime / 2) return
    console.log(`[API] Refreshing token at level ${level}`)
    if (token.refreshToken) {
      const refreshResult = await this._performTokenRefresh(token.refreshToken, this.appId.value)
      if (refreshResult) {
        this.tokens.value[level] = {
          token: refreshResult.token,
          refreshToken: refreshResult.refreshToken,
          decoded: ApiManager.parseJwt(refreshResult.token)
        }
        console.log(`[API] Token at level ${level} refreshed`)
        return
      } else if (refreshResult === false) {
        delete token.refreshToken
      }
    }

    // Token not refreshed, check if it is expired
    if (remaining < 3 * 1000) {
      console.log(`[API] Token at level ${level} dropped remaining=${remaining}ms`)
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.tokens.value[level]
    }
  }

  /**
   * Refresh tokens if needed and drop expired tokens
   */
  private async _refreshTokens() {
    if (this.securityLevel.value === null) return
    const now = Date.now()
    console.group(`[API] Refreshing tokens at ${now}`)
    await Promise.all(
      Array.from({ length: this.securityLevel.value + 1 }, (_, i) =>
        this._refreshTokenFor(i as SecurityLevel, now)
      )
    )
    console.log(`[API] Calculating Security Level`)
    const level = this.tokens.value.reduce((acc: -1 | SecurityLevel, token, i) => {
      if (token && token.decoded.exp * 1000 > now) return i as SecurityLevel
      return acc
    }, -1)
    console.log(`[API] Security Level is ${level}`)
    this.securityLevel.value = level
    console.groupEnd()
  }

  refreshTokens() {
    return this._synchronized(() => this._refreshTokens(), 'refresh')
  }

  async refreshCandidateTokens() {
    const now = Date.now()
    console.log(`[API] Refreshing candidate tokens at ${now}`)
    await navigator.locks.request(`candidate_tokens`, async () => {
      const candidateEntries = Object.entries(this.candidateTokens.value)

      for (const [sub, candidateToken] of candidateEntries) {
        const { refreshToken, decoded } = candidateToken
        const remaining = decoded.exp * 1000 - now
        const lifetime = (decoded.exp - decoded.iat) * 1000

        // Skip if token doesn't need refresh yet
        if (remaining > lifetime / 2) continue

        console.log(`[API] Refreshing candidate token for ${sub}`)

        if (refreshToken) {
          const refreshResult = await this._performTokenRefresh(refreshToken, decoded.client_id)
          if (refreshResult) {
            this.candidateTokens.value[sub] = {
              ...candidateToken,
              token: refreshResult.token,
              refreshToken: refreshResult.refreshToken,
              decoded: ApiManager.parseJwt(refreshResult.token)
            }
            console.log(`[API] Candidate token for ${sub} refreshed`)
            continue
          } else {
            // Remove invalid refresh token
            delete candidateToken.refreshToken
          }
        }

        // Token not refreshed, check if it is expired
        if (remaining < 3 * 1000) {
          console.log(`[API] Candidate token for ${sub} dropped remaining=${remaining}ms`)
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete this.candidateTokens.value[sub]
        }
      }
    })
  }

  private async _downgradeTokenFrom(level: SecurityLevel) {
    console.log(`[API] Downgrading token to level ${level}`)
    try {
      const resp = await this.session.downgrade.$post({ json: { targetLevel: level } })
      await this.checkResponse(resp)
      const {
        token: { token, refreshToken }
      } = await resp.json()
      this.tokens.value[level] = { token, refreshToken, decoded: ApiManager.parseJwt(token) }
    } catch (err) {
      console.log(`[API] Token downgrade failed: ${this._formatError(err)}`)
    }
  }

  /**
   * Fill token store
   */
  private async _applyToken(token: string, refreshToken?: string) {
    const decoded = ApiManager.parseJwt(token)
    const { jti, level } = decoded
    console.group(`[API] Applying token ${jti}`)
    this.tokens.value[level] = { token, refreshToken, decoded }
    this.securityLevel.value = level
    await Promise.all(
      Array.from({ length: level }, (_, i) => this._downgradeTokenFrom(i as SecurityLevel))
    )
    console.groupEnd()
  }

  async getHeaders() {
    await this.refreshTokens()
    const headers: Record<string, string> = Object.create(null)
    const token = this.effectiveToken.value
    if (token) headers.Authorization = `Bearer ${token.token}`
    return headers
  }

  async login(type: string, payload: unknown) {
    await this.refreshCandidateTokens()
    const resp = await this.public.login.$post({
      json: {
        type,
        payload,
        candidateTokens: Object.values(this.candidateTokens.value).map((t) => t.token)
      }
    })
    await this.checkResponse(resp)
    const { token, refreshToken } = await resp.json()
    await this._synchronized(() => this._applyToken(token, refreshToken), 'apply')
    await this.getSessionClaims()
  }

  async verify(type: string, targetLevel: SecurityLevel, payload: unknown) {
    console.log(`[API] Will verify credential ${type}`)
    const resp = await this.session.upgrade.$post({ json: { type, targetLevel, payload } })
    await this.checkResponse(resp)
    const { token, refreshToken } = await resp.json()
    await this._synchronized(() => this._applyToken(token, refreshToken), 'apply')
    await this.getSessionClaims()
  }

  async deactivateCurrentUser(logout = false) {
    console.log(`[API] Will deactivate user with logout=${logout}`)
    await navigator.locks.request(`tokens`, async () => {
      console.log(`[API] Switching user`)

      // Preserve current hint token as candidate
      const hintToken = this.tokens.value[0]
      if (!logout && hintToken) {
        const candidateClaims = getCandidateClaims(this.claims.value)

        if (candidateClaims) {
          const candidateToken: ICandidateToken = { ...hintToken, claims: candidateClaims }
          // Store candidate token indexed by sub
          const sub = hintToken.decoded.sub
          this.candidateTokens.value[sub] = candidateToken
          console.log(`[API] Preserved hint token as candidate for ${sub}`)
        }
      }

      this.securityLevel.value = -1
      this.tokens.value = []
      this.claims.value = {}
    })
  }

  async logout(redirect = '/') {
    console.log(`[API] Will logout`)
    await this.deactivateCurrentUser(true)
    location.href = redirect
  }

  async switchToCandidate(sub: string, redirect = '/') {
    console.log(`[API] Will switch to candidate ${sub}`)
    await this.deactivateCurrentUser()
    // Activate the candidate
    const ok = await navigator.locks.request(`tokens`, async () => {
      const candidate = this.candidateTokens.value[sub]
      if (!candidate) return false
      const { claims, ...clientToken } = candidate
      this.tokens.value[0] = clientToken
      this.securityLevel.value = 0
      this.claims.value = restoreUserClaims(claims)
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.candidateTokens.value[sub]
      console.log(`[API] Switched to account ${claims.username}`)
      return true
    })
    if (ok) {
      location.href = redirect
    }
  }

  async getSessionClaims(): Promise<IUserClaim[]> {
    const resp = await api.session.claim.$get()
    await this.checkResponse(resp)
    const { claims } = await resp.json()
    this.claims.value = {
      ...this.claims.value,
      ...claims
    }
    return Object.entries(claims).map(([name, claim]) => ({ name, ...claim }))
  }

  async getUserClaims(): Promise<IUserClaim[]> {
    const resp = await api.user.claim.$get()
    const { claims } = await resp.json()
    this.claims.value = {
      ...this.claims.value,
      ...claims
    }
    return Object.entries(claims).map(([name, claim]) => ({ name, ...claim }))
  }

  async getError(resp: Response): Promise<APIErrorType> {
    try {
      // For arktype validator error
      const { code, data, errors, success } = await resp.json()
      if (errors && success === false) {
        return new APIError('INVALID_TYPE', { summary: '' })
      }
      return new APIError(code, data)
    } catch (err) {
      return new APIError('UNKNOWN_ERROR', { msg: this._formatError(err) })
    }
  }

  async checkResponse(resp: Response) {
    if (resp.ok) return
    throw await this.getError(resp)
  }

  private _formatError(err: unknown) {
    return err instanceof Error ? err.message : `${err}`
  }

  static parseJwt(token: string) {
    return JSON.parse(atob(token.split('.')[1] || '')) as ITokenPayload
  }
}

export const api = new ApiManager()
