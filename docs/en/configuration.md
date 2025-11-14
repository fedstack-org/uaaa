# Configuration Reference

This document describes all configuration options available in UAAA.

## Configuration File

UAAA reads configuration from a JSON file. The default location is `/etc/uaaa/config.json` when running in Docker, or specified via the `--config` CLI flag.

**Environment variable:** Set `UAAA_SERVER_CONFIG_PATH` to specify the config file path.

## Core Configuration

### Required Fields

These fields are required for UAAA to start:

```json
{
  "appId": "auth.example.com",
  "mongoUri": "mongodb://mongo:27017/uaaa",
  "plugins": ["password"],
  "port": 3030,
  "deploymentUrl": "https://auth.example.com",
  "jwtTimeout": "30min",
  "refreshTimeout": "7d",
  "tokenTimeout": "30min"
}
```

#### `appId`
- **Type:** `string`
- **Required:** Yes
- **Format:** Must match UAAA app ID format (domain-like identifier)
- **Description:** Unique identifier for this UAAA instance
- **Example:** `"auth.example.com"`, `"id.company.org"`

#### `mongoUri`
- **Type:** `string`
- **Required:** Yes
- **Description:** MongoDB connection string
- **Example:** `"mongodb://localhost:27017/uaaa"`, `"mongodb://user:pass@mongo:27017/uaaa?authSource=admin"`

#### `plugins`
- **Type:** `string[]`
- **Required:** Yes
- **Description:** Array of plugin names to load
- **Built-in plugins:** `"oidc"`, `"password"`, `"email"`, `"sms"`, `"totp"`, `"webauthn"`
- **Example:** `["oidc", "password", "email"]`

#### `port`
- **Type:** `number`
- **Required:** Yes
- **Description:** Port number for the HTTP server
- **Example:** `3030`, `8080`

#### `deploymentUrl`
- **Type:** `string`
- **Required:** Yes
- **Format:** Must NOT end with `/`
- **Description:** Public URL where UAAA is accessible. Used as OAuth2 issuer and in various redirects.
- **Example:** `"https://auth.example.com"`, `"http://localhost:3030"`

#### `jwtTimeout`
- **Type:** `string | string[]`
- **Required:** Yes
- **Description:** JWT access token lifetime. Can be a single value or array of 5 values (one per security level: HINT, LOW, MEDIUM, HIGH, MAX)
- **Format:** `<number><unit>` where unit is `s`, `min`, `h`, `d`, `y`
- **Example:**
  - Single value: `"30min"`
  - Per-level: `["3h", "30min", "10min", "5min", "5min"]`

#### `refreshTimeout`
- **Type:** `string | string[]`
- **Required:** Yes
- **Description:** Refresh token lifetime
- **Format:** Same as `jwtTimeout`
- **Example:** `"7d"`, `["30d", "1d", "1h", "15min", "15min"]`

#### `tokenTimeout`
- **Type:** `string | string[]`
- **Required:** Yes
- **Description:** App token lifetime
- **Format:** Same as `jwtTimeout`
- **Example:** `"30min"`

### Optional Core Fields

#### `realIpHeader`
- **Type:** `string`
- **Required:** No
- **Description:** HTTP header name containing the real client IP (when behind a reverse proxy)
- **Example:** `"X-Real-IP"`, `"X-Forwarded-For"`, `"CF-Connecting-IP"`

#### `trustedUpstreamIssuers`
- **Type:** `string[]`
- **Required:** No
- **Description:** Array of trusted OAuth2/OIDC issuer URLs for upstream authentication
- **Example:** `["https://accounts.google.com"]`

#### `openidClaimConfig`
- **Type:** `Record<string, {alias: string, verifiable?: boolean}>`
- **Required:** No
- **Description:** Mapping of internal claim names to OpenID Connect standard claim names
- **Example:**
```json
{
  "openidClaimConfig": {
    "username": {"alias": "preferred_username", "verifiable": false},
    "realname": {"alias": "name", "verifiable": true}
  }
}
```

#### `openidAdditionalClaims`
- **Type:** `Record<string, string>`
- **Required:** No
- **Description:** Additional static claims to include in OpenID Connect ID tokens
- **Example:**
```json
{
  "openidAdditionalClaims": {
    "organization": "Example Corp",
    "locale": "en-US"
  }
}
```

#### `uiPath`
- **Type:** `string`
- **Required:** No
- **Description:** Path to directory containing static UI files (when using `server` image without built-in UI)
- **Example:** `"/var/www/uaaa"`, `"/app/ui"`

## Plugin Configuration

### Password Plugin

Enabled by adding `"password"` to the `plugins` array.

```json
{
  "plugins": ["password"],
  "passwordLogin": "enabled",
  "passwordExpiration": "100y",
  "passwordTimeout": "5min"
}
```

#### `passwordLogin`
- **Type:** `"enabled" | "hidden" | "disabled"`
- **Required:** No
- **Default:** `"enabled"`
- **Description:** Controls password login UI visibility
  - `"enabled"`: Show in UI
  - `"hidden"`: Hide from UI but API still works
  - `"disabled"`: Completely disable

#### `passwordExpiration`
- **Type:** `number | string`
- **Required:** No
- **Default:** `"100y"`
- **Description:** Password expiration time (in milliseconds or time string)
- **Example:** `"90d"`, `"1y"`, `7776000000`

#### `passwordTimeout`
- **Type:** `number | string`
- **Required:** No
- **Description:** Password challenge timeout for multi-factor authentication
- **Example:** `"5min"`, `300000`

### Email Plugin

Enabled by adding `"email"` to the `plugins` array.

```json
{
  "plugins": ["email"],
  "emailTransport": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "your-email@gmail.com",
      "pass": "app-password"
    }
  },
  "emailFrom": "UAAA <noreply@example.com>",
  "emailAllowSignup": false,
  "emailWhitelist": ["@example.com", "@company.org"],
  "emailLogin": "enabled",
  "emailRateLimitPerIP": 30,
  "emailRateLimitPerIPEmail": 10,
  "emailRateLimitWindow": 3600000
}
```

#### `emailTransport`
- **Type:** `object`
- **Required:** Yes (when using email plugin)
- **Description:** Nodemailer SMTP transport configuration
- **Fields:**
  - `host`: SMTP server hostname
  - `port`: SMTP port (587 for TLS, 465 for SSL)
  - `secure`: Use SSL (true for port 465, false for 587)
  - `auth.user`: SMTP username
  - `auth.pass`: SMTP password or app-specific password

#### `emailFrom`
- **Type:** `string`
- **Required:** Yes (when using email plugin)
- **Description:** Sender email address (can include name)
- **Example:** `"UAAA <noreply@example.com>"`, `"auth@example.com"`

#### `emailHtml`
- **Type:** `string`
- **Required:** No
- **Description:** Custom HTML template for email OTP messages (use `{{code}}` placeholder)

#### `emailAllowSignup`
- **Type:** `boolean`
- **Required:** No
- **Default:** `false`
- **Description:** Allow new user registration via email

#### `emailWhitelist`
- **Type:** `string[]`
- **Required:** No
- **Description:** Array of allowed email patterns (domain wildcards with `@`)
- **Example:** `["@example.com", "@*.company.org"]`

#### `emailLogin`
- **Type:** `"enabled" | "hidden" | "disabled"`
- **Required:** No
- **Default:** `"enabled"`
- **Description:** Controls email login UI visibility

#### `emailRateLimitPerIP`
- **Type:** `number`
- **Required:** No
- **Default:** `30`
- **Description:** Maximum email OTP requests per IP within window

#### `emailRateLimitPerIPEmail`
- **Type:** `number`
- **Required:** No
- **Default:** `10`
- **Description:** Maximum OTP requests per IP-email combination within window

#### `emailRateLimitWindow`
- **Type:** `number`
- **Required:** No
- **Default:** `3600000` (1 hour)
- **Description:** Rate limit window in milliseconds

### SMS Plugin

Enabled by adding `"sms"` to the `plugins` array.

```json
{
  "plugins": ["sms"],
  "smsGateway": "https://sms.example.com/send",
  "smsGatewayContext": {
    "apiKey": "your-api-key"
  },
  "smsGatewayVariables": {
    "phone": "phone",
    "message": "text"
  },
  "smsCodeVariable": "code",
  "smsAllowSignup": false,
  "smsWhitelist": ["+1*", "+86*"],
  "smsLogin": "enabled",
  "smsRateLimitPerIP": 30,
  "smsRateLimitPerIPPhone": 10,
  "smsRateLimitWindow": 3600000
}
```

#### `smsGateway`
- **Type:** `string`
- **Required:** Yes (when using sms plugin)
- **Description:** SMS gateway API endpoint URL

#### `smsGatewayContext`
- **Type:** `object`
- **Required:** No
- **Description:** Static context data sent with every SMS request (e.g., API keys, sender ID)

#### `smsGatewayVariables`
- **Type:** `object`
- **Required:** No
- **Description:** Mapping of UAAA variables to gateway API parameter names

#### `smsCodeVariable`
- **Type:** `string`
- **Required:** No
- **Default:** `"code"`
- **Description:** Template variable name for OTP code in SMS messages

#### `smsAllowSignup`
- **Type:** `boolean`
- **Required:** No
- **Default:** `false`
- **Description:** Allow new user registration via SMS

#### `smsWhitelist`
- **Type:** `string[]`
- **Required:** No
- **Description:** Array of allowed phone number patterns (use `*` as wildcard)

#### `smsLogin`
- **Type:** `"enabled" | "hidden" | "disabled"`
- **Required:** No
- **Default:** `"enabled"`
- **Description:** Controls SMS login UI visibility

#### `smsRateLimitPerIP`
- **Type:** `number`
- **Required:** No
- **Default:** `30`
- **Description:** Maximum SMS OTP requests per IP within window

#### `smsRateLimitPerIPPhone`
- **Type:** `number`
- **Required:** No
- **Default:** `10`
- **Description:** Maximum OTP requests per IP-phone combination within window

#### `smsRateLimitWindow`
- **Type:** `number`
- **Required:** No
- **Default:** `3600000` (1 hour)
- **Description:** Rate limit window in milliseconds

### TOTP Plugin

Enabled by adding `"totp"` to the `plugins` array.

```json
{
  "plugins": ["totp"],
  "totpSecurityLevel": 3
}
```

#### `totpSecurityLevel`
- **Type:** `number` (0-4)
- **Required:** No
- **Default:** `3` (HIGH)
- **Description:** Security level for TOTP credentials

### WebAuthn Plugin

Enabled by adding `"webauthn"` to the `plugins` array.

```json
{
  "plugins": ["webauthn"],
  "webauthnRpName": "UAAA Authentication",
  "webauthnRpId": "auth.example.com",
  "webauthnOrigin": "https://auth.example.com"
}
```

#### `webauthnRpName`
- **Type:** `string`
- **Required:** No
- **Default:** `"Unified Authentication and Authorization System"`
- **Description:** Relying Party display name shown to users

#### `webauthnRpId`
- **Type:** `string`
- **Required:** No
- **Default:** Hostname from `deploymentUrl`
- **Description:** Relying Party ID (must match domain)

#### `webauthnOrigin`
- **Type:** `string`
- **Required:** No
- **Default:** Value of `deploymentUrl`
- **Description:** Expected origin for WebAuthn ceremonies

## Complete Example

```json
{
  "appId": "auth.example.com",
  "mongoUri": "mongodb://mongo:27017/uaaa",
  "plugins": ["oidc", "password", "email", "totp", "webauthn"],
  "port": 3030,
  "deploymentUrl": "https://auth.example.com",
  "jwtTimeout": ["3h", "30min", "10min", "5min", "5min"],
  "refreshTimeout": ["30d", "1d", "1h", "15min", "15min"],
  "tokenTimeout": ["3h", "30min", "10min", "5min", "5min"],
  "realIpHeader": "X-Real-IP",
  "passwordLogin": "enabled",
  "passwordExpiration": "90d",
  "emailTransport": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "noreply@example.com",
      "pass": "app-password"
    }
  },
  "emailFrom": "UAAA <noreply@example.com>",
  "emailAllowSignup": false,
  "emailWhitelist": ["@example.com"],
  "totpSecurityLevel": 3,
  "webauthnRpName": "Example Corp Authentication",
  "webauthnRpId": "auth.example.com",
  "webauthnOrigin": "https://auth.example.com"
}
```

## Environment Variables

All configuration can be loaded from environment variables. UAAA does not support automatic environment variable substitution in the config file itself.

**Special environment variables:**
- `UAAA_SERVER_CONFIG_PATH`: Path to configuration file (default: `/etc/uaaa/config.json` in Docker)
- `UAAA_SERVER_CONFIG_JSON`: Inline configuration as JSON string (overrides file)

## Security Best Practices

1. **Never commit secrets** - Use environment variables or secret management systems for sensitive data
2. **Use strong random values** - UAAA generates its own RS256 key pairs, no manual secret needed
3. **Enable HTTPS** - Always set `deploymentUrl` to an HTTPS URL in production
4. **Configure rate limiting** - Adjust email/SMS rate limits based on your usage patterns
5. **Restrict signups** - Set `emailAllowSignup: false` and `smsAllowSignup: false` unless you need public registration
6. **Use whitelists** - Configure `emailWhitelist` and `smsWhitelist` to restrict allowed users
7. **Enable MongoDB authentication** - Protect your MongoDB instance
8. **Set realistic timeouts** - Use shorter timeouts for higher security levels

## Validation

UAAA validates configuration at startup using ArkType schemas. Common validation errors:

- **Invalid `appId`**: Must match domain-like format (e.g., `auth.example.com`)
- **Invalid `deploymentUrl`**: Must not end with `/`
- **Invalid timeout format**: Must be number (milliseconds) or string like `"30min"`
- **Missing required fields**: Check all required fields are present
- **Invalid plugin names**: Check plugin names match available plugins

Check server logs for detailed validation error messages:

```bash
docker compose logs server
```

## Next Steps

- **[Deployment Guide](./deployment)**: Deploy UAAA with this configuration
- **[Architecture](./architecture)**: Understand how configuration affects system behavior
- **[Plugin Development](./plugins/developing-plugins)**: Create custom plugins with configuration options
