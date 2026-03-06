import { describe, it, expect, beforeAll } from 'vitest'
import { CASManager } from '../src/cas/_common.js'

// Mock app for testing
const mockApp = {
  config: {
    get: (key) => {
      const config = {
        deploymentUrl: 'https://auth.example.com'
      }
      return config[key]
    }
  },
  db: {
    tokens: {
      insertOne: async () => ({ insertedId: 'test-id' }),
      findOneAndDelete: async () => ({ userId: 'test-user', sessionId: 'test-session' })
    },
    sessions: {
      findOne: async () => ({ _id: 'test-session', userId: 'test-user' })
    },
    users: {
      findOne: async () => ({ _id: 'test-user', claims: {} })
    }
  },
  claim: {
    filterBasicClaims: async () => ({})
  }
}

describe('CAS Manager', () => {
  let casManager

  beforeAll(() => {
    casManager = new CASManager(mockApp)
  })

  it('should create CAS manager instance', () => {
    expect(casManager).toBeDefined()
    expect(casManager.app).toBe(mockApp)
  })

  it('should validate login request', () => {
    const validRequest = { service: 'https://example.com/app' }
    const result = CASManager.tLoginRequest(validRequest)
    expect(result).toEqual(validRequest)
  })

  it('should reject invalid login request', () => {
    const invalidRequest = { invalid: 'request' }
    const result = CASManager.tLoginRequest(invalidRequest)
    expect(result.constructor.name).toBe('ArkErrors')
  })

  it('should validate service validate request', () => {
    const validRequest = { 
      service: 'https://example.com/app',
      ticket: 'ST-1234567890'
    }
    const result = CASManager.tServiceValidateRequest(validRequest)
    expect(result).toEqual(validRequest)
  })

  it('should build error response XML', () => {
    const xml = casManager._buildErrorResponse('INVALID_TICKET', 'Test error')
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<cas:serviceResponse')
    expect(xml).toContain('<cas:authenticationFailure code="INVALID_TICKET">')
    expect(xml).toContain('Test error')
  })

  it('should build success response XML', () => {
    const xml = casManager._buildSuccessResponse('testuser', { email: 'test@example.com' })
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<cas:serviceResponse')
    expect(xml).toContain('<cas:authenticationSuccess>')
    expect(xml).toContain('<cas:user>testuser</cas:user>')
    expect(xml).toContain('<cas:email>test@example.com</cas:email>')
  })

  it('should build success response JSON', () => {
    const json = casManager._buildSuccessResponse('testuser', { email: 'test@example.com' }, 'JSON')
    const parsed = JSON.parse(json)
    expect(parsed.serviceResponse.authenticationSuccess.user).toBe('testuser')
    expect(parsed.serviceResponse.authenticationSuccess.attributes.email).toBe('test@example.com')
  })

  it('should escape XML special characters', () => {
    const xml = casManager._buildErrorResponse('TEST', 'Error with <tags> & "quotes"')
    expect(xml).toContain('Error with &lt;tags&gt; &amp; &quot;quotes&quot;')
  })

  it('should generate login URL', async () => {
    const mockCtx = {}
    const request = { service: 'https://example.com/app' }
    
    const url = await casManager.loginToUI(mockCtx, request)
    expect(url).toContain('https://auth.example.com/ui/authorize')
    expect(url).toContain('type=cas')
    expect(url).toContain('appId=cas')
  })
})