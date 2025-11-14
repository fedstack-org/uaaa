# Plugin Ecosystem

UAAA's plugin system allows extending authentication capabilities with custom credential providers and functionality.

## Overview

Plugins are npm packages that implement the UAAA plugin interface. They can:

- Register custom credential types
- Add user claims
- Extend HTTP endpoints
- Hook into authentication flows
- Integrate external identity providers

## Built-in Plugins

UAAA includes several built-in credential plugins:

### password
Username/password authentication with bcrypt hashing.

**Security Level:** MEDIUM
**Configuration:** Password complexity rules, bcrypt rounds

### email
Email-based OTP (One-Time Password) verification.

**Security Level:** MEDIUM (2)
**Configuration:** SMTP settings, OTP length, TTL

### sms
SMS-based OTP verification.

**Security Level:** HIGH (3)
**Configuration:** SMS gateway (Twilio, etc.), OTP settings

### totp
Time-based One-Time Password (Google Authenticator).

**Security Level:** HIGH
**Configuration:** Issuer name, time window

### webauthn
WebAuthn/FIDO2 hardware key authentication.

**Security Level:** HIGH (3)
**Configuration:** Relying Party ID, origin, timeout

## External Plugins

### @pku-uaaa/plugin-iaaa

Integrates PKU's IAAA (Identity Authentication and Authorization) system.

**Features:**
- OAuth token validation
- Direct credential authentication
- PKU identity claims mapping
- Email auto-inference

**Installation:**
```bash
npm install @pku-uaaa/plugin-iaaa
```

**Configuration:**
```json
{
  "plugins": ["password", "totp", "@pku-uaaa/plugin-iaaa"],
  "iaaaConfig": {
    "id": "app-id",
    "name": "My App",
    "key": "app-secret",
    "redirect": "https://auth.example.com/callback"
  }
}
```

See [IAAA Plugin Guide](./iaaa-plugin) for details.

## Plugin Architecture

### Plugin Interface

```typescript
interface IPlugin {
  name: string
  version: string
  description?: string
  license?: string
  author?: string
  configType?: ArkType           // Config schema validation
  setup(ctx: PluginContext): void | Cleanup | Promise<void | Cleanup>
}
```

### Plugin Context

```typescript
class PluginContext {
  app: App                       // Access to application instance
  manager: PluginManager         // Plugin manager
  metadata: IPluginMetadata      // Plugin metadata
}
```

### Credential Interface

Credential plugins implement `CredentialImpl`:

```typescript
abstract class CredentialImpl {
  abstract type: CredentialType

  // Availability checks
  showLogin(ctx: CredentialContext): Promise<ICredentialLoginInfo | null>
  showVerify(ctx: CredentialContext, userId: string, targetLevel: SecurityLevel, matchedCredentials: ICredentialDoc[]): Promise<ICredentialVerifyInfo | null>
  showBind(ctx: CredentialContext, userId: string): Promise<ICredentialBindInfo | null>

  // Authentication operations
  login?(ctx: CredentialContext, payload: unknown): Promise<ICredentialLoginResult>
  verify(ctx: CredentialContext, userId: string, targetLevel: SecurityLevel, payload: unknown): Promise<ICredentialVerifyResult>
  bind(ctx: CredentialContext, userId: string, credentialId: string | undefined, payload: unknown): Promise<ICredentialBindResult>
  unbind(ctx: CredentialContext, userId: string, credentialId: string, payload: unknown): Promise<ICredentialUnbindResult>

  // Optional: auto-provisioning
  ensure?(ctx: CredentialContext, payload: unknown): Promise<ICredentialEnsureResult>
}
```

## Plugin Lifecycle

1. **Loading**: Plugin module imported
2. **Validation**: Config schema validated
3. **Setup**: `setup()` function called
4. **Registration**: Credentials/claims registered
5. **Ready**: Plugin active
6. **Cleanup**: Optional cleanup on shutdown

## Installing Plugins

### From npm

```bash
npm install @org/uaaa-plugin-name

# Add to config
{
  "plugins": ["password", "@org/uaaa-plugin-name"]
}
```

### From Local Path

```json
{
  "plugins": ["password", "/path/to/local/plugin"]
}
```

### Shorthand Resolution

Plugin names are resolved in order:

1. Exact name: `@org/plugin-name`
2. Local path: `/path/to/plugin`
3. Shorthand: `name` → `@uaaa/plugin-name`
4. Built-in: `builtin/name`

## Plugin Configuration

Plugin-specific configuration is merged into main config:

```json
{
  "plugins": ["@org/plugin-custom"],
  "customPluginOption": "value",
  "customPluginConfig": {
    "nested": "option"
  }
}
```

Plugins validate their configuration using ArkType schemas.

## Developing Plugins

See [Plugin Development Guide](./developing-plugins) for:

- Creating credential plugins
- Registering custom claims
- Adding HTTP endpoints
- Publishing plugins
- Best practices

## Plugin Examples

### Simple Credential Plugin

```typescript
// index.ts
import { definePlugin, CredentialImpl, SECURITY_LEVEL } from '@uaaa/server'

class MyCredImpl extends CredentialImpl {
  readonly type = 'mycred'

  async showLogin(ctx) {
    return { recommended: false }
  }

  async showVerify(ctx, userId, targetLevel, matchedCredentials) {
    return { recommended: true }
  }

  async showBind(ctx, userId) {
    return { securityLevel: SECURITY_LEVEL.MEDIUM }
  }

  async verify(ctx, userId, targetLevel, payload) {
    // Verify user with external API
    const valid = await this.validateExternal(payload.token)
    if (!valid) throw new Error('Invalid token')

    return {
      userId,
      securityLevel: SECURITY_LEVEL.MEDIUM
    }
  }

  async bind(ctx, userId, credentialId, payload) {
    const newCredentialId = await ctx.manager.bindCredential(
      ctx,
      this.type,
      userId,
      credentialId,
      {
        userIdentifier: '',
        globalIdentifier: payload.externalId,
        data: '',
        secret: payload.token,
        remark: '',
        expiration: 0
      }
    )
    return { credentialId: newCredentialId }
  }

  async unbind(ctx, userId, credentialId, payload) {
    await ctx.manager.unbindCredential(ctx, this.type, userId, credentialId)
    return {}
  }
}

export default definePlugin({
  name: 'mycred',
  version: '1.0.0',
  setup: (ctx) => {
    ctx.app.credential.provide(new MyCredImpl(ctx.app))
  }
})
```

### Plugin with Custom Endpoint

```typescript
export default definePlugin({
  name: 'myplugin',
  version: '1.0.0',
  setup: (ctx) => {
    // Register credential
    ctx.app.credential.provide(new MyCredImpl(ctx.app))

    // Add custom endpoint
    ctx.app.hook('extendApp', (router) => {
      router.get('/api/plugin/myplugin/data', async (c) => {
        return c.json({ data: 'custom data' })
      })
    })

    // Register custom claim
    ctx.app.claim.addClaimDescriptor({
      name: 'myplugin:custom_field',
      description: 'Custom field from plugin',
      securityLevel: SECURITY_LEVEL.LOW,
      editable: false
    })
  }
})
```

## Plugin Discovery

Browse plugins:

- [npm: @uaaa/plugin-*](https://www.npmjs.com/search?q=%40uaaa%2Fplugin-)
- [GitHub: uaaa-plugin-*](https://github.com/topics/uaaa-plugin)

## Plugin Security

**Best Practices:**

- Validate all inputs with ArkType
- Use secure credential storage
- Avoid storing secrets in plain text
- Log security-relevant events
- Rate limit external API calls
- Handle errors gracefully
- Document security considerations

**Plugin Review:**

Before installing third-party plugins:

- Review source code
- Check npm downloads and stars
- Verify maintainer identity
- Test in development first
- Monitor logs after installation

## Next Steps

- **[Developing Plugins](./developing-plugins)**: Create your own plugins
- **[IAAA Plugin](./iaaa-plugin)**: Example external plugin
- **[Configuration](../configuration)**: Configure plugins
