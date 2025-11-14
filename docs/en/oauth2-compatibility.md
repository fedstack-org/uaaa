# OAuth2 and OIDC Compatibility

This document describes UAAA's compliance with standard OAuth 2.0 and OpenID Connect protocols, as well as its extensions.

## Standards Compliance

### OAuth 2.0 (RFC 6749)

UAAA implements the following OAuth 2.0 specifications:

✅ **Authorization Code Grant** (RFC 6749 Section 4.1)
- Full implementation with standard parameters
- `response_type=code` support
- State parameter for CSRF protection

✅ **Refresh Token Grant** (RFC 6749 Section 6)
- Refresh token rotation
- Automatic expiration handling
- Confidential client support

✅ **Client Authentication** (RFC 6749 Section 2.3)
- HTTP Basic Authentication
- Client credentials in request body
- Support for public clients (no secret required)

✅ **Error Responses** (RFC 6749 Section 5.2)
- Standard error codes: `invalid_request`, `invalid_client`, `invalid_grant`, etc.
- JSON error responses with `error` and `error_description`

### PKCE (RFC 7636)

✅ **Proof Key for Code Exchange**
- Required for public clients
- Optional for confidential clients
- Support for `S256` (SHA-256) and `plain` challenge methods
- Standard `code_challenge` and `code_verifier` parameters

### Device Authorization Grant (RFC 8628)

✅ **Device Flow Implementation**
- `/oauth/device/code` endpoint
- `device_code` and `user_code` generation
- Polling with `interval` and slow-down handling
- `authorization_pending` and `slow_down` errors

### OpenID Connect 1.0

✅ **Core Specification**
- `/.well-known/openid-configuration` discovery endpoint
- ID Token generation with standard claims
- `/oauth/userinfo` endpoint
- `openid` scope requirement

✅ **Standard Claims**
- `sub`: Subject identifier (user ID)
- `name`: Full name
- `email`: Email address
- `email_verified`: Email verification status
- `phone_number`: Phone number
- `phone_number_verified`: Phone verification status

✅ **RP-Initiated Logout** (OpenID Connect RP-Initiated Logout 1.0)
- `/oauth/logout` endpoint
- `id_token_hint` parameter support
- `post_logout_redirect_uri` parameter

## UAAA Extensions to Standard OAuth2/OIDC

UAAA extends standard OAuth 2.0 and OpenID Connect with additional features for fine-grained access control and security levels.

### 1. Non-Standard JWT Claims

UAAA access tokens include three non-standard claims:

#### `perm` Claim (Permission Array)

**Type:** `string[]`
**Standard OAuth2 Equivalent:** `scope` (but more granular)

**Format:**
- Array of scoped permission strings
- Each permission starts with `/`
- Uses wildcard patterns (`*` and `**`)

**Purpose:**
- Fine-grained resource access control
- Hierarchical permission matching
- Application-specific permissions

**Example:**
```json
{
  "perm": ["/api/read", "/api/write", "/admin/**"]
}
```

**Comparison with OAuth2 `scope`:**

| Aspect | OAuth2 `scope` | UAAA `perm` |
|--------|----------------|-------------|
| Format | Space-separated string | JSON array of strings |
| Granularity | Application-level | Resource-level |
| Wildcards | No | Yes (`*` and `**`) |
| Hierarchy | No | Yes (path-based) |
| Location | Query parameter | JWT claim |

#### `level` Claim (Security Level)

**Type:** `number` (0-4)
**No Standard OAuth2 Equivalent**

**Values:**
- `0`: HINT - Session lasting, user presence undetermined
- `1`: LOW - User likely present, identity not ensured
- `2`: MEDIUM - User present, weak credentials (password, email OTP)
- `3`: HIGH - Identity ensured (WebAuthn, TOTP, SMS OTP)
- `4`: MAX - Trusted admin credentials

**Purpose:**
- Authentication strength indication
- Step-up authentication requirements
- Operation-specific security requirements

**Example:**
```json
{
  "level": 2
}
```

**Use Cases:**
- Require HIGH level for financial transactions
- Allow LOW level for read-only operations
- Enforce MAX level for admin console access

#### `sid` Claim (Session ID)

**Type:** `string`
**No Standard OAuth2 Equivalent**

**Purpose:**
- Session tracking across tokens
- Token family management
- Logout and revocation

**Example:**
```json
{
  "sid": "session_abc123xyz"
}
```

### 2. Permission Scopes

UAAA extends the OAuth2 `scope` parameter with special formats:

#### Required Permissions
```
scope=uperm://app-id/resource/action
```

Example:
```
scope=openid profile uperm://myapp/api/read uperm://myapp/api/write
```

These permissions MUST be granted for the authorization to succeed.

#### Optional Permissions
```
scope=uperm+optional://app-id/resource/action
```

Example:
```
scope=uperm://myapp/api/read uperm+optional://myapp/admin/**
```

Optional permissions are granted if available but don't cause authorization failure.

#### Custom Parameters
```
scope=uaaa+param://base64(json_params)
```

Example:
```
scope=uaaa+param://eyJ0eXBlIjoiYm9vbCJ9
```

Allows passing custom parameters through the OAuth flow.

### 3. Security Level Requirements

Non-standard parameter in authorization request:

```
GET /oauth/authorize?
  client_id=myapp
  &response_type=code
  &redirect_uri=https://myapp.com/callback
  &scope=openid profile
  &security_level=3
```

**Purpose:** Request a minimum security level for the token.

**Values:** 0-4 (HINT/LOW/MEDIUM/HIGH/MAX)

**Behavior:**
- If user's current session level is insufficient, they'll be prompted to upgrade
- App tokens will be issued with the requested level (or current level if higher)
- Falls back to application's default `baseSecurityLevel` if not specified

### 4. Upgradable Tokens

Non-standard scope value:

```
scope=openid profile upgradable
```

**Purpose:** Request a session token instead of an app token.

**Difference:**
- **App Token**: Fixed security level, cannot be upgraded
- **Session Token**: Security level can be upgraded during the session

**Use Case:** Long-lived sessions where users might need to elevate privileges (e.g., admin actions in a dashboard).

## JWT Token Structure Comparison

### Standard OAuth2 Access Token

```json
{
  "iss": "https://auth.example.com",
  "sub": "user_123",
  "aud": "myapp.com",
  "iat": 1699999000,
  "exp": 1700000000,
  "scope": "read write"
}
```

### UAAA Access Token (App Token)

```json
{
  "iss": "https://auth.example.com",
  "sub": "user_123",
  "aud": "myapp.com",
  "client_id": "myapp.com",
  "sid": "session_abc123",
  "jti": "token_xyz789",
  "perm": ["/api/read", "/api/write"],
  "level": 2,
  "iat": 1699999000,
  "exp": 1700000000
}
```

**Additional Claims:**
- `client_id`: OAuth2 client identifier
- `sid`: Session ID (UAAA-specific)
- `jti`: JWT ID for revocation
- `perm`: Permission array (UAAA-specific, replaces `scope`)
- `level`: Security level (UAAA-specific)

### UAAA ID Token (OIDC)

```json
{
  "iss": "https://auth.example.com",
  "sub": "user_123",
  "aud": "myapp.com",
  "iat": 1699999000,
  "exp": 1700000000,
  "nonce": "random_nonce",
  "name": "John Doe",
  "email": "john@example.com",
  "email_verified": true,
  "phone_number": "+1234567890",
  "phone_number_verified": true
}
```

**Note:** ID tokens are standard OIDC compliant and do NOT include `perm`, `level`, or `sid` claims.

## Permission System

### Storage Format (Database)

Permissions are stored in database as **compact strings**:

```
<app_id><path><query_params>
```

Examples:
- `"uaaa/session"`
- `"myapp/api/read"`
- `"myapp/admin/**"`

### JWT Format (Access Tokens)

Permissions in JWTs are **scoped strings** (app ID prefix removed):

```
/<path><query_params>
```

Examples:
- `"/session"`
- `"/api/read"`
- `"/admin/**"`

### Transformation

```
Database: "myapp/api/read"
    ↓ Permission.fromCompactString()
Parse: Permission { appId: "myapp", path: "/api/read" }
    ↓ Filter by targetAppId
    ↓ permission.toScopedString()
JWT: "/api/read"
```

### Wildcard Matching

UAAA supports two wildcard types:

1. **Single-level wildcard (`*`)**: Matches one path segment
   ```
   /api/*/read matches:
   ✓ /api/users/read
   ✓ /api/posts/read
   ✗ /api/users/posts/read (too many segments)
   ```

2. **Multi-level wildcard (`**`)**: Matches any number of path segments (must be at end)
   ```
   /admin/** matches:
   ✓ /admin/users
   ✓ /admin/users/delete
   ✓ /admin/settings/security/2fa
   ```

### Permission Inheritance

Permissions are hierarchical:

```
User has: ["/api/**"]

Can access:
✓ /api/read
✓ /api/write
✓ /api/admin/delete
✗ /other/resource (different path)
```

## Client Authentication

UAAA supports both **public** and **confidential** clients:

### Public Clients

- No client secret required
- PKCE is **mandatory**
- Typical use: SPAs, mobile apps, native applications

Example:
```bash
curl -X POST https://auth.example.com/oauth/token \
  -d "grant_type=authorization_code" \
  -d "code=auth_code_123" \
  -d "client_id=myapp" \
  -d "code_verifier=random_verifier" \
  -d "redirect_uri=https://myapp.com/callback"
```

### Confidential Clients

- Client secret required
- PKCE is optional (but recommended)
- Typical use: Backend services, server-side applications

Example with Basic Auth:
```bash
curl -X POST https://auth.example.com/oauth/token \
  -H "Authorization: Basic base64(client_id:client_secret)" \
  -d "grant_type=authorization_code" \
  -d "code=auth_code_123" \
  -d "redirect_uri=https://myapp.com/callback"
```

Example with Body Parameters:
```bash
curl -X POST https://auth.example.com/oauth/token \
  -d "grant_type=authorization_code" \
  -d "code=auth_code_123" \
  -d "client_id=myapp" \
  -d "client_secret=secret_123" \
  -d "redirect_uri=https://myapp.com/callback"
```

## Discovery Endpoint

UAAA provides a standard OpenID Connect discovery endpoint:

```
GET /.well-known/openid-configuration
```

**Response:**
```json
{
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/oauth/authorize",
  "token_endpoint": "https://auth.example.com/oauth/token",
  "userinfo_endpoint": "https://auth.example.com/oauth/userinfo",
  "end_session_endpoint": "https://auth.example.com/oauth/logout",
  "jwks_uri": "https://auth.example.com/api/public/jwks",
  "response_types_supported": ["code", "id_token"],
  "grant_types_supported": [
    "authorization_code",
    "refresh_token",
    "urn:ietf:params:oauth:grant-type:device_code"
  ],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "code_challenge_methods_supported": ["S256", "plain"]
}
```

## Token Validation

### Standard OAuth2 Token Introspection

UAAA access tokens are **self-contained JWTs** and can be validated without introspection endpoint:

1. **Verify JWT Signature** using JWKS from `jwks_uri`
2. **Validate Standard Claims**:
   - `exp`: Token not expired
   - `iss`: Matches UAAA issuer
   - `aud`: Matches your application ID
   - `iat`: Token issued time is valid

3. **Validate UAAA-Specific Claims**:
   - `client_id`: Matches expected client
   - `perm`: Contains required permissions
   - `level`: Meets minimum security level requirement

Example validation (Node.js with `jose`):
```javascript
import { jwtVerify, createRemoteJWKSet } from 'jose'

const JWKS = createRemoteJWKSet(
  new URL('https://auth.example.com/api/public/jwks')
)

async function validateToken(token) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: 'https://auth.example.com',
    audience: 'myapp.com'
  })

  // Validate UAAA-specific claims
  if (!payload.perm || !Array.isArray(payload.perm)) {
    throw new Error('Invalid perm claim')
  }

  if (typeof payload.level !== 'number' || payload.level < 0 || payload.level > 4) {
    throw new Error('Invalid security level')
  }

  // Check permission
  if (!payload.perm.includes('/api/read')) {
    throw new Error('Insufficient permissions')
  }

  // Check security level
  if (payload.level < 2) {
    throw new Error('Security level too low')
  }

  return payload
}
```

## Migration from Standard OAuth2

If you're migrating from a standard OAuth2 provider to UAAA:

### 1. Standard OAuth2 Flow

Your existing code should work without modification:

```javascript
// Standard OAuth2 - Works with UAAA
const authUrl = `https://auth.example.com/oauth/authorize?` +
  `client_id=myapp&response_type=code&redirect_uri=${redirectUri}&scope=openid profile`

// Token exchange - Standard
const tokenResponse = await fetch('https://auth.example.com/oauth/token', {
  method: 'POST',
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authCode,
    redirect_uri: redirectUri,
    client_id: 'myapp',
    client_secret: 'secret'
  })
})
```

### 2. Accessing UAAA Extensions

To use UAAA-specific features, add permission scopes:

```javascript
const authUrl = `https://auth.example.com/oauth/authorize?` +
  `client_id=myapp&response_type=code&redirect_uri=${redirectUri}` +
  `&scope=openid profile uperm://myapp/api/read uperm://myapp/api/write` +
  `&security_level=2`
```

### 3. Token Validation

Update your validation to handle `perm` and `level` claims:

```javascript
// Old: Check scope string
if (!token.scope.includes('read')) { ... }

// New: Check perm array
if (!token.perm.includes('/api/read')) { ... }

// New: Check security level
if (token.level < 2) { ... }
```

## Limitations and Differences

### 1. No `scope` in Access Tokens

Unlike standard OAuth2, UAAA access tokens use `perm` claim instead of `scope`:

❌ **Not Included:** `scope` claim in access tokens
✅ **Included:** `perm` array in access tokens

### 2. Client ID in Access Tokens

UAAA includes `client_id` in access tokens (not standard but common practice):

✅ **Included:** `client_id` claim
ℹ️ **Purpose:** Client identification and multi-tenant support

### 3. Session ID in Tokens

UAAA includes session tracking (not standard):

✅ **Included:** `sid` claim
ℹ️ **Purpose:** Token family management and revocation

### 4. Fixed Security Level in App Tokens

App tokens cannot be upgraded:

❌ **Cannot:** Increase security level of existing token
✅ **Can:** Request new token with higher level via refresh

## Best Practices

### 1. Use Standard OAuth2 When Possible

For maximum compatibility, use standard OAuth2 scopes when UAAA-specific features aren't needed:

```javascript
// Good: Standard OAuth2
scope=openid profile email

// Good: When you need fine-grained control
scope=openid profile uperm://myapp/api/read uperm://myapp/api/write
```

### 2. Validate Both Standard and UAAA Claims

```javascript
// Validate standard claims
if (!token.iss || token.iss !== 'https://auth.example.com') {
  throw new Error('Invalid issuer')
}

// Validate UAAA-specific claims
if (!Array.isArray(token.perm)) {
  throw new Error('Invalid permissions')
}

if (typeof token.level !== 'number') {
  throw new Error('Invalid security level')
}
```

### 3. Document UAAA Extensions in API

If your API requires specific security levels or permissions, document them:

```
POST /api/admin/delete-user
Authorization: Bearer <token>

Requirements:
- Security Level: HIGH (3) or above
- Permission: /admin/users/delete
```

### 4. Graceful Fallback

Handle missing UAAA claims gracefully:

```javascript
const securityLevel = token.level ?? 1  // Default to LOW if missing
const permissions = token.perm ?? []     // Default to empty array
```

## Resources

- **OAuth 2.0 Specification**: [RFC 6749](https://tools.ietf.org/html/rfc6749)
- **PKCE Specification**: [RFC 7636](https://tools.ietf.org/html/rfc7636)
- **Device Flow Specification**: [RFC 8628](https://tools.ietf.org/html/rfc8628)
- **OpenID Connect Core**: [Specification](https://openid.net/specs/openid-connect-core-1_0.html)
- **UAAA GitHub**: [github.com/fedstack-org/uaaa](https://github.com/fedstack-org/uaaa)
- **UAAA China Mirror**: [git.pku.edu.cn/uaaa/uaaa](https://git.pku.edu.cn/uaaa/uaaa)

## Next Steps

- **[Architecture](./architecture)**: Understand UAAA's complete design
- **[OAuth2/OIDC Integration](./integrations/oauth2-oidc)**: Implementation examples
- **[Configuration](./configuration)**: Configure OAuth2 settings
