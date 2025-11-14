# Developing Plugins

This comprehensive guide covers creating custom UAAA plugins for authentication credentials, claims, and extensions.

## Plugin Structure

### Basic Plugin

```typescript
// index.ts
import { definePlugin } from '@uaaa/server'

export default definePlugin({
  name: 'myplugin',
  version: '1.0.0',
  description: 'My custom UAAA plugin',
  license: 'MIT',
  author: 'Your Name',

  setup: async (ctx) => {
    console.log('Plugin loaded')

    // Plugin initialization code here

    // Optional: return cleanup function
    return () => {
      console.log('Plugin cleanup')
    }
  }
})
```

### With Configuration Schema

```typescript
import { arktype, definePlugin } from '@uaaa/server'

// Define configuration schema
const tConfig = arktype.type({
  'myPluginConfig?': arktype.type({
    apiKey: 'string',
    apiEndpoint: 'string',
    'timeout?': 'number'
  })
})

// Extend IConfig interface
declare module '@uaaa/server' {
  interface IConfig extends typeof tConfig.infer {}
}

export default definePlugin({
  name: 'myplugin',
  version: '1.0.0',
  configType: tConfig,  // Enable validation

  setup: async (ctx) => {
    // Access configuration through your plugin's mechanism
    // Configuration validation happens automatically with configType
  }
})
```

## Creating Credential Plugins

### Credential Interface

```typescript
import { CredentialImpl, SECURITY_LEVEL } from '@uaaa/server'

class MyCredentialImpl extends CredentialImpl {
  readonly type = 'mycred'

  // Show in login UI?
  async showLogin(ctx: CredentialContext): Promise<ICredentialLoginInfo | null> {
    return {
      recommended: true,  // Recommend in login UI
      displayName: 'My Authentication'
    }
  }

  // Show for verification/upgrade?
  async showVerify(
    ctx: CredentialContext,
    userId: string,
    targetLevel: SecurityLevel,
    matchedCredentials: ICredentialDoc[]
  ): Promise<ICredentialVerifyInfo | null> {
    return {
      recommended: true,
      securityLevel: SECURITY_LEVEL.MEDIUM
    }
  }

  // Show for binding to account?
  async showBind(
    ctx: CredentialContext,
    userId: string
  ): Promise<ICredentialBindInfo | null> {
    return {
      securityLevel: SECURITY_LEVEL.MEDIUM,
      canBind: true
    }
  }

  // Authenticate user (login)
  async login(
    ctx: CredentialContext,
    payload: unknown
  ): Promise<ICredentialLoginResult> {
    // Validate payload
    const validated = this.validateLoginPayload(payload)

    // Authenticate with external API
    const userInfo = await this.authenticateExternal(validated)

    // Find or create user
    let user = await ctx.app.db.users.findOne({
      'claims.username.value': userInfo.username
    })

    if (!user) {
      // Create new user
      const userId = generateSnowflake()
      user = await ctx.app.db.users.insertOne({
        _id: userId,
        claims: {
          username: { value: userInfo.username, verified: true },
          realname: { value: userInfo.name, verified: false },
          email: { value: userInfo.email, verified: false }
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    }

    // Update custom claims
    await ctx.app.db.users.updateOne(
      { _id: user._id },
      {
        $set: {
          'claims.mycred:external_id': {
            value: userInfo.externalId,
            verified: true
          },
          updatedAt: Date.now()
        }
      }
    )

    // Return result
    return {
      userId: user._id,
      credentialId: await this.getOrCreateCredential(ctx, user._id, userInfo),
      securityLevel: SECURITY_LEVEL.MEDIUM
    }
  }

  // Verify existing user (for security level upgrade)
  async verify(
    ctx: CredentialContext,
    userId: string,
    targetLevel: number,
    payload: unknown
  ): Promise<ICredentialVerifyResult> {
    // Validate that user has this credential
    const credential = await ctx.app.db.credentials.findOne({
      userId,
      type: this.type
    })

    if (!credential) {
      throw new BusinessError('CREDENTIAL_NOT_FOUND')
    }

    // Verify credential
    const valid = await this.verifyCredential(payload, credential)

    if (!valid) {
      throw new BusinessError('INVALID_CREDENTIAL')
    }

    return {
      userId,
      securityLevel: SECURITY_LEVEL.MEDIUM
    }
  }

  // Bind credential to user account
  async bind(
    ctx: CredentialContext,
    userId: string,
    credentialId: string | undefined,
    payload: unknown
  ): Promise<ICredentialBindResult> {
    const validated = this.validateBindPayload(payload)

    // Create or update credential
    const newCredentialId = await ctx.manager.bindCredential(
      ctx,
      this.type,
      userId,
      credentialId,
      {
        userIdentifier: validated.displayName,
        globalIdentifier: validated.externalId,
        data: JSON.stringify(validated.metadata),
        secret: await this.encryptSecret(validated.token),
        remark: '',
        expiration: 0
      }
    )
    return { credentialId: newCredentialId }
  }

  // Unbind credential
  async unbind(
    ctx: CredentialContext,
    userId: string,
    credentialId: string,
    payload: unknown
  ): Promise<ICredentialUnbindResult> {
    await ctx.manager.unbindCredential(ctx, this.type, userId, credentialId)
    return {}
  }

  // Optional: Auto-provision users
  async ensure(
    ctx: CredentialContext,
    payload: unknown
  ): Promise<ICredentialEnsureResult> {
    // Similar to login, but always creates user
  }
}
```

### Register Credential

```typescript
export default definePlugin({
  name: 'mycred',
  version: '1.0.0',

  setup: (ctx) => {
    ctx.app.credential.provide(new MyCredentialImpl(ctx.app))
  }
})
```

## Adding Custom Claims

```typescript
export default definePlugin({
  name: 'myplugin',
  version: '1.0.0',

  setup: (ctx) => {
    // Register custom claims
    ctx.app.claim.addClaimDescriptor({
      name: 'myplugin:external_id',
      description: 'External system user ID',
      securityLevel: SECURITY_LEVEL.LOW,
      editable: false,  // Cannot be edited by user
      hidden: false,    // Visible in UI
      basic: true       // Include in basic profile
    })

    ctx.app.claim.addClaimDescriptor({
      name: 'myplugin:department',
      description: 'User department',
      securityLevel: SECURITY_LEVEL.LOW,
      editable: false,
      openid: {
        alias: 'department',  // Map to OpenID claim
        verifiable: true
      }
    })

    // Add claim validation hook
    ctx.app.claim.hook('validate:myplugin:external_id', (ctx, value) => {
      if (!/^[A-Z0-9]+$/.test(value)) {
        throw new Error('Invalid external ID format')
      }
    })
  }
})
```

## Adding HTTP Endpoints

```typescript
export default definePlugin({
  name: 'myplugin',
  version: '1.0.0',

  setup: (ctx) => {
    ctx.app.hook('extendApp', (router) => {
      // Public endpoint
      router.get('/api/plugin/myplugin/config', (c) => {
        return c.json({
          name: 'My Plugin',
          version: '1.0.0'
        })
      })

      // Protected endpoint
      router.get(
        '/api/plugin/myplugin/data',
        verifyAuthorizationJwt(ctx.app),
        verifyPermission({ securityLevel: SECURITY_LEVEL.LOW }),
        async (c) => {
          const user = c.get('user')
          const data = await fetchUserData(user.sub)
          return c.json(data)
        }
      )

      // Admin endpoint
      router.post(
        '/api/plugin/myplugin/admin',
        verifyAuthorizationJwt(ctx.app),
        verifyPermission({
          securityLevel: SECURITY_LEVEL.HIGH,
          required: ['myplugin/admin/**']
        }),
        async (c) => {
          const body = await c.req.json()
          // Admin operation
          return c.json({ success: true })
        }
      )
    })
  }
})
```

## Complete Example: External OAuth Plugin

```typescript
// index.ts
import { definePlugin, CredentialImpl, SECURITY_LEVEL, BusinessError } from '@uaaa/server'
import { arktype } from '@uaaa/server'
import axios from 'axios'

// Configuration schema
const tConfig = arktype.type({
  'externalOAuthConfig?': arktype.type({
    clientId: 'string',
    clientSecret: 'string',
    authEndpoint: 'string',
    tokenEndpoint: 'string',
    userInfoEndpoint: 'string'
  })
})

declare module '@uaaa/server' {
  interface IConfig extends typeof tConfig.infer {}
  interface ICredentialTypeMap {
    external_oauth: string
  }
}

// Credential implementation
class ExternalOAuthImpl extends CredentialImpl {
  readonly type = 'external_oauth'

  constructor(
    public app: App,
    private config: typeof tConfig.infer['externalOAuthConfig']
  ) {
    super()
  }

  async showLogin(ctx) {
    return { recommended: true, displayName: 'External OAuth' }
  }

  async showVerify(ctx, userId, targetLevel, matchedCredentials) {
    return { recommended: true, securityLevel: SECURITY_LEVEL.MEDIUM }
  }

  async showBind(ctx, userId) {
    return { securityLevel: SECURITY_LEVEL.MEDIUM, canBind: true }
  }

  async login(ctx, payload: { token: string }) {
    // Validate OAuth token with external provider
    const userInfo = await this.validateToken(payload.token)

    // Find or create user
    let user = await ctx.app.db.users.findOne({
      'claims.external_oauth:user_id.value': userInfo.id
    })

    if (!user) {
      const userId = generateSnowflake()
      await ctx.app.db.users.insertOne({
        _id: userId,
        claims: {
          username: { value: `oauth_${userInfo.id}`, verified: true },
          realname: { value: userInfo.name, verified: false },
          email: { value: userInfo.email, verified: false },
          'external_oauth:user_id': { value: userInfo.id, verified: true },
          'external_oauth:username': { value: userInfo.username, verified: true }
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
      user = { _id: userId }
    }

    // Get or create credential
    let credential = await ctx.app.db.credentials.findOne({
      userId: user._id,
      type: this.type
    })

    if (!credential) {
      const credId = await ctx.manager.bindCredential(
        ctx,
        this.type,
        user._id,
        undefined,
        {
          userIdentifier: userInfo.username,
          globalIdentifier: userInfo.id,
          data: '',
          secret: payload.token,
          remark: '',
          expiration: 0
        }
      )
      credential = { _id: credId }
    }

    return {
      userId: user._id,
      credentialId: credential._id,
      securityLevel: SECURITY_LEVEL.MEDIUM
    }
  }

  async verify(ctx, userId, targetLevel, payload: { token: string }) {
    const credential = await ctx.app.db.credentials.findOne({
      userId,
      type: this.type
    })

    if (!credential) {
      throw new BusinessError('CREDENTIAL_NOT_FOUND')
    }

    await this.validateToken(payload.token)

    return {
      userId,
      securityLevel: SECURITY_LEVEL.MEDIUM
    }
  }

  async bind(ctx, userId, credentialId, payload: { token: string }) {
    const userInfo = await this.validateToken(payload.token)

    const newCredentialId = await ctx.manager.bindCredential(
      ctx,
      this.type,
      userId,
      credentialId,
      {
        userIdentifier: userInfo.username,
        globalIdentifier: userInfo.id,
        data: '',
        secret: payload.token,
        remark: '',
        expiration: 0
      }
    )
    return { credentialId: newCredentialId }
  }

  async unbind(ctx, userId, credentialId) {
    await ctx.manager.unbindCredential(ctx, this.type, userId, credentialId)
    return {}
  }

  private async validateToken(token: string) {
    try {
      const response = await axios.get(this.config.userInfoEndpoint, {
        headers: { Authorization: `Bearer ${token}` }
      })

      return response.data
    } catch (error) {
      throw new BusinessError('INVALID_TOKEN')
    }
  }
}

// Plugin definition
export default definePlugin({
  name: 'external-oauth',
  version: '1.0.0',
  description: 'External OAuth provider integration',
  configType: tConfig,

  setup: (ctx) => {
    // Access config through environment or plugin-specific mechanism
    const config = process.env.EXTERNAL_OAUTH_CONFIG
      ? JSON.parse(process.env.EXTERNAL_OAUTH_CONFIG)
      : null

    if (!config) {
      console.warn('External OAuth config not provided, plugin disabled')
      return
    }

    // Register credential
    ctx.app.credential.provide(new ExternalOAuthImpl(ctx.app, config))

    // Register claims
    ctx.app.claim.addClaimDescriptor({
      name: 'external_oauth:user_id',
      description: 'External OAuth User ID',
      securityLevel: SECURITY_LEVEL.LOW,
      editable: false
    })

    ctx.app.claim.addClaimDescriptor({
      name: 'external_oauth:username',
      description: 'External OAuth Username',
      securityLevel: SECURITY_LEVEL.LOW,
      editable: false
    })

    // Add discovery endpoint
    ctx.app.hook('extendApp', (router) => {
      router.get('/.well-known/external-oauth-configuration', (c) => {
        return c.json({
          authEndpoint: config.authEndpoint,
          clientId: config.clientId
        })
      })
    })

    console.log('External OAuth plugin initialized')
  }
})
```

## Package Structure

```
@yourorg/uaaa-plugin-myplugin/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts        # Plugin entry
│   ├── credential.ts   # Credential implementation
│   ├── claims.ts       # Claim definitions
│   └── utils.ts        # Helper functions
├── lib/                # Compiled output
│   └── index.js
└── README.md
```

### package.json

```json
{
  "name": "@yourorg/uaaa-plugin-myplugin",
  "version": "1.0.0",
  "description": "My UAAA plugin",
  "main": "lib/index.js",
  "types": "lib/index.d.ts",
  "files": ["lib"],
  "scripts": {
    "build": "tsc",
    "prepack": "npm run build"
  },
  "keywords": ["uaaa", "uaaa-plugin", "authentication"],
  "peerDependencies": {
    "@uaaa/server": "^0.7.0"
  },
  "devDependencies": {
    "@uaaa/server": "^0.7.0",
    "typescript": "^5.0.0"
  }
}
```

## Publishing

```bash
# Build
npm run build

# Test
npm link
cd /path/to/uaaa-server
npm link @yourorg/uaaa-plugin-myplugin

# Publish
npm publish --access public
```

## Best Practices

1. **Type Safety**: Use TypeScript and ArkType for validation
2. **Error Handling**: Use BusinessError for user-facing errors
3. **Logging**: Use console.log/console.error for debugging
4. **Security**: Validate all inputs, encrypt secrets
5. **Documentation**: Provide clear README and examples
6. **Testing**: Write unit tests for credential logic
7. **Versioning**: Follow semantic versioning

## Next Steps

- **[Plugin Ecosystem](./index)**: Browse existing plugins
- **[IAAA Plugin Example](./iaaa-plugin)**: Real-world plugin example
- **[Architecture](../architecture)**: Understand UAAA internals
