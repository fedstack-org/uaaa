# App Manifest Reference

This document describes the app manifest schema used to define UAAA applications. The manifest is commonly stored as `manifest.yml` and defines all metadata, permissions, and configuration for an application.

## Overview

An app manifest declares:
- Application identity and metadata
- Permissions the app provides to other apps
- User claims and permissions the app requests
- OAuth2/OIDC callback URLs
- Security level requirements
- Changelog and version information

## Manifest File Format

UAAA accepts manifests in YAML format. The recommended filename is `manifest.yml`.

## Schema Reference

### Required Fields

#### `appId`
- **Type:** `string`
- **Required:** Yes
- **Format:** Must match pattern `^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$` (lowercase domain-like identifier)
- **Description:** Unique identifier for this application
- **Examples:** `"example.app"`, `"com.company.myapp"`, `"auth.internal"`

#### `name`
- **Type:** `string`
- **Required:** Yes
- **Description:** Human-readable display name for the application
- **Example:** `"My Application"`

#### `version`
- **Type:** `number`
- **Required:** Yes
- **Validation:** Must be a non-negative safe integer, and must equal the length of the `changelog` array
- **Description:** Numeric version identifier that increments with each changelog entry
- **Example:** `3`

#### `providedPermissions`
- **Type:** `IAppProvidedPermission[]`
- **Required:** Yes
- **Description:** Array of permissions this app provides that other apps can request
- **Schema:** Each item has:
  - `name`: `string` - Permission display name
  - `description`: `string` - Human-readable description
  - `path`: `string` - Permission path identifier
- **Example:**
  ```yaml
  providedPermissions:
    - name: Read User Profile
      description: Access basic user profile information
      path: /profile/read
    - name: Write User Profile
      description: Modify user profile information
      path: /profile/write
  ```

#### `requestedClaims`
- **Type:** `IAppRequestedClaim[]`
- **Required:** Yes
- **Description:** Array of user claims (attributes) this app requests access to
- **Schema:** Each item has:
  - `name`: `string` - Claim name (e.g., `email`, `realname`, `phone`)
  - `reason`: `string` - Human-readable explanation of why this claim is needed
  - `required?`: `boolean` - Whether this claim is required for the app to function (optional, default: false)
  - `verified?`: `boolean` - Whether the claim must be verified (optional, default: false)
- **Example:**
  ```yaml
  requestedClaims:
    - name: email
      reason: Used for account notifications and password recovery
      required: true
      verified: true
    - name: realname
      reason: Displayed in the application UI
      required: false
  ```

#### `requestedPermissions`
- **Type:** `IAppRequestedPermission[]`
- **Required:** Yes
- **Description:** Array of permissions this app requests from other apps or UAAA itself
- **Schema:** Each item has:
  - `perm`: `string` - Permission path to request
  - `reason`: `string` - Human-readable explanation of why this permission is needed
  - `required?`: `boolean` - Whether this permission is required (optional, default: false)
- **Example:**
  ```yaml
  requestedPermissions:
    - perm: /console/user
      reason: Required to manage users
      required: true
    - perm: /console/app
      reason: Optional app management capability
      required: false
  ```

#### `callbackUrls`
- **Type:** `string[]`
- **Required:** Yes
- **Description:** Array of allowed OAuth2/OIDC redirect URIs
- **Example:**
  ```yaml
  callbackUrls:
    - https://myapp.example.com/callback
    - https://myapp.example.com/auth/callback
    - http://localhost:3000/callback  # For local development
  ```

#### `variables`
- **Type:** `Record<string, string>`
- **Required:** Yes
- **Description:** Key-value pairs of public configuration variables
- **Example:**
  ```yaml
  variables:
    SUPPORT_EMAIL: support@example.com
    DOCS_URL: https://docs.example.com
  ```

#### `secrets`
- **Type:** `Record<string, string>`
- **Required:** Yes
- **Description:** Key-value pairs of secret configuration values (stored encrypted)
- **Example:**
  ```yaml
  secrets:
    API_KEY: your-api-key-here
    WEBHOOK_SECRET: webhook-secret-value
  ```

#### `changelog`
- **Type:** `IChangelogItem[]`
- **Required:** Yes
- **Validation:** Array length must equal `version` field value
- **Description:** Array of changelog entries, one per version
- **Schema:** Each item has:
  - `versionName`: `string` - Human-readable version name (e.g., `"1.0.0"`, `"v2.1.0"`)
  - `content`: `string` - Description of changes in this version
- **Example:**
  ```yaml
  changelog:
    - versionName: "1.0.0"
      content: Initial release with basic functionality
    - versionName: "1.1.0"
      content: Added user profile editing feature
    - versionName: "1.2.0"
      content: Bug fixes and performance improvements
  ```

#### `securityLevel`
- **Type:** `number` (0-4)
- **Required:** Yes
- **Description:** Minimum security level required for tokens issued to this app
- **Values:**
  - `0` (HINT): Lasting session, cannot determine user presence. Limited operations only.
  - `1` (LOW): User likely present but identity not ensured. Low-privilege operations.
  - `2` (MEDIUM): User considered present. Weak credentials accepted (password, email OTP). In-session sensitive operations.
  - `3` (HIGH): User present with ensured identity. Strong credentials required (WebAuthn, TOTP). Cross-session sensitive operations.
  - `4` (MAX): Authenticated with trusted credentials (e.g., admin-added hardware key).
- **Example:** `2`

### Optional Fields

#### `description`
- **Type:** `string`
- **Required:** No
- **Description:** Detailed description of the application
- **Example:** `"A comprehensive project management tool for teams"`

#### `icon`
- **Type:** `string`
- **Required:** No
- **Description:** URL or data URI for the application icon
- **Example:** `"https://myapp.example.com/icon.png"`

#### `config`
- **Type:** `IAppGeneralConfig`
- **Required:** No
- **Description:** General configuration options for the app
- **Schema:**
  - `promoted?`: `boolean` - Whether this app is promoted/featured (optional)
  - `autoInstall?`: `boolean | object` - Auto-install configuration (optional)
    - When `boolean`: If `true`, app is auto-installed for users
    - When `object`:
      - `grantedPermissions?`: `string[]` - Permissions to auto-grant
      - `grantedClaims?`: `string[]` - Claims to auto-grant
- **Example:**
  ```yaml
  config:
    promoted: true
    autoInstall:
      grantedPermissions:
        - /profile/read
      grantedClaims:
        - email
        - realname
  ```

#### `openid`
- **Type:** `IAppOpenIdConfig`
- **Required:** No
- **Description:** OpenID Connect specific configuration
- **Schema:**
  - `additionalClaims?`: `Record<string, string>` - Additional claims to include in ID tokens
  - `allowPublicClient?`: `boolean` - Allow public (non-confidential) clients
  - `defaultPublicClient?`: `boolean` - Default to public client mode
  - `logoutUrls?`: `string[]` - Allowed post-logout redirect URIs
- **Example:**
  ```yaml
  openid:
    additionalClaims:
      organization: example-org
    allowPublicClient: true
    defaultPublicClient: false
    logoutUrls:
      - https://myapp.example.com/logged-out
  ```

#### `delegation`
- **Type:** `IAppDelegationConfig`
- **Required:** No
- **Description:** Configuration for delegated authentication (service account)
- **Schema:**
  - `userId`: `string` - User ID to delegate to
  - `requestedPermissions`: `IAppRequestedPermission[]` - Permissions to request for delegation
- **Example:**
  ```yaml
  delegation:
    userId: service-account-user-id
    requestedPermissions:
      - perm: /api/admin
        reason: Required for background processing
        required: true
  ```

#### `baseSecurityLevel`
- **Type:** `number` (0-4)
- **Required:** No
- **Description:** Base security level for this app. If not specified, defaults to `securityLevel`.
- **Values:** Same as `securityLevel`
- **Example:** `1`

## Complete Example

Below is a complete `manifest.yml` example demonstrating all available fields:

```yaml
# App Manifest for Example Application
# This file defines the application's identity, permissions, and configuration

# Unique application identifier (lowercase, dot-separated)
appId: com.example.myapp

# Human-readable display name
name: My Example Application

# Numeric version (must equal changelog array length)
version: 3

# Optional description
description: A comprehensive example application demonstrating UAAA integration

# Optional application icon URL
icon: https://myapp.example.com/assets/icon.png

# Permissions this app provides to other applications
providedPermissions:
  - name: Read Data
    description: Read access to application data
    path: /data/read
  - name: Write Data
    description: Write access to application data
    path: /data/write
  - name: Admin Access
    description: Full administrative access
    path: /admin

# User claims (attributes) this app requests
requestedClaims:
  - name: email
    reason: Used for account notifications and password recovery
    required: true
    verified: true
  - name: realname
    reason: Displayed in the user interface
    required: false
  - name: avatar
    reason: Shown in comments and activity feed
    required: false

# Permissions this app requests from other apps or UAAA
requestedPermissions:
  - perm: /console/user
    reason: Required to display user information
    required: true
  - perm: /webhook/send
    reason: Send webhook notifications
    required: false

# OAuth2/OIDC callback URLs
callbackUrls:
  - https://myapp.example.com/auth/callback
  - https://myapp.example.com/oauth/callback
  - http://localhost:3000/auth/callback  # Development

# Public configuration variables
variables:
  APP_ENV: production
  SUPPORT_EMAIL: support@example.com
  DOCS_URL: https://docs.example.com/myapp

# Secret configuration values (stored encrypted)
secrets:
  WEBHOOK_SECRET: your-webhook-secret
  ENCRYPTION_KEY: your-encryption-key

# Version history (length must equal version field)
changelog:
  - versionName: "1.0.0"
    content: Initial release with core functionality
  - versionName: "1.1.0"
    content: |
      - Added user profile management
      - Improved OAuth2 flow
      - Bug fixes
  - versionName: "2.0.0"
    content: |
      - Major UI redesign
      - Added WebAuthn support
      - Performance improvements

# Minimum security level required for tokens (0-4)
# 2 = MEDIUM: User considered present, weak credentials accepted
securityLevel: 2

# Optional: Base security level (defaults to securityLevel if not specified)
baseSecurityLevel: 1

# Optional: General app configuration
config:
  # Whether this app is featured/promoted
  promoted: true
  # Auto-install configuration
  autoInstall:
    grantedPermissions:
      - /data/read
    grantedClaims:
      - email

# Optional: OpenID Connect configuration
openid:
  # Additional claims in ID tokens
  additionalClaims:
    app_role: user
  # Allow public (non-confidential) OAuth2 clients
  allowPublicClient: true
  # Default to public client mode
  defaultPublicClient: false
  # Allowed post-logout redirect URIs
  logoutUrls:
    - https://myapp.example.com/logged-out
    - https://myapp.example.com/goodbye

# Optional: Delegation (service account) configuration
delegation:
  userId: svc-myapp-background
  requestedPermissions:
    - perm: /api/internal
      reason: Required for background job processing
      required: true
```

## Minimal Example

A minimal manifest with only required fields:

```yaml
appId: simple.app
name: Simple Application
version: 1
providedPermissions: []
requestedClaims: []
requestedPermissions: []
callbackUrls:
  - https://simple.example.com/callback
variables: {}
secrets: {}
changelog:
  - versionName: "1.0.0"
    content: Initial release
securityLevel: 2
```

## Security Levels Explained

| Level | Name | Description | Authentication Examples |
|-------|------|-------------|------------------------|
| 0 | HINT | Session exists but user presence unknown | Refresh token only |
| 1 | LOW | User likely present | Session cookie |
| 2 | MEDIUM | User technically present | Password, Email OTP, Federated login |
| 3 | HIGH | User present with verified identity | WebAuthn, TOTP, Biometric |
| 4 | MAX | Trusted credential authentication | Admin-provisioned hardware key |

## Validation Rules

1. **`appId` format**: Must start with a lowercase letter, contain only lowercase letters, numbers, underscores, and dots. Dots separate segments, each segment must start with a letter.

2. **`version` and `changelog` sync**: The `version` field must exactly equal the length of the `changelog` array.

3. **Permission paths**: Permission paths should start with `/` and follow a hierarchical structure.

4. **Callback URLs**: Must be valid URLs. Use HTTPS in production.

## API Usage

### Create App
```bash
POST /api/console/app
Content-Type: application/json

{
  "appId": "example.app",
  "name": "Example App",
  ...
}
```

The response includes the generated `secret` for the app.

### Update App
```bash
PATCH /api/console/app/:appId
Content-Type: application/json

{
  "appId": "example.app",  # Must match path parameter
  "name": "Updated Name",
  ...
}
```

Note: Updates only apply if the new `version` is greater than or equal to the existing version.

## Next Steps

- **[OAuth2/OIDC Integration](./integrations/oauth2-oidc)**: Implement OAuth2 authentication
- **[Configuration Reference](./configuration)**: Configure UAAA server
- **[Deployment Guide](./deployment)**: Deploy your application with UAAA
