---
layout: home

hero:
  name: "UAAA"
  text: "Unified Authentication And Authorization"
  tagline: Enterprise-grade authentication and authorization platform with extensible plugin architecture
  actions:
    - theme: brand
      text: Get Started
      link: /en/deployment
    - theme: alt
      text: Architecture
      link: /en/architecture

features:
  - title: Multi-Level Security
    details: Five-tier security level system (HINT/LOW/MEDIUM/HIGH/MAX) with graduated verification requirements and configurable session timeouts
  - title: Extensible Credentials
    details: Support for multiple authentication methods including password, email OTP, SMS OTP, TOTP, WebAuthn, and custom plugins
  - title: OAuth2 & OIDC
    details: Full OAuth2 and OpenID Connect implementation with PKCE, device flow, refresh tokens, and discovery endpoints
  - title: Plugin Architecture
    details: Modular plugin system for integrating external identity providers with built-in IAAA support
  - title: Session Management
    details: Sophisticated session and token management with security level upgrades and multi-app token delegation
  - title: Claims System
    details: Extensible user claims with verification status, security levels, and OpenID Connect mapping
---

## What is UAAA?

UAAA (Unified Authentication And Authorization) is an enterprise-grade authentication and authorization platform designed to centralize identity management across multiple applications. It provides a flexible, secure, and extensible framework for managing user authentication, permissions, and sessions.

## Key Features

### Security-First Design

- **Five-Level Security Model**: HINT → LOW → MEDIUM → HIGH → MAX
- **Session Upgradability**: Users can elevate their security level without re-authentication
- **Token-Based Architecture**: Separate session tokens (upgradeable) and app tokens (fixed level)
- **WebAuthn Support**: Hardware key authentication for maximum security

### Flexible Authentication

- **Multiple Credential Types**: Password, Email OTP, SMS OTP, TOTP, WebAuthn
- **Plugin System**: Integrate external identity providers (LDAP, AD, IAAA, etc.)
- **Pre-Authentication**: Bridge external authentication systems seamlessly
- **Non-Interactive Mode**: Silent authentication for integrated applications

### Standards Compliant

- **OAuth 2.0**: Full authorization code flow with PKCE
- **OpenID Connect**: Discovery endpoints, ID tokens, UserInfo endpoint
- **Device Flow**: Authentication for devices without browsers
- **Refresh Tokens**: Long-lived sessions with automatic renewal

### Developer Friendly

- **RESTful API**: Clean, well-documented HTTP endpoints
- **SDK Support**: Client libraries for Node.js, Nuxt, and web applications
- **Type Safety**: Full TypeScript support with runtime validation
- **Extensible**: Plugin system with comprehensive hooks

## Architecture Overview

UAAA is built as a modern monorepo with the following packages:

- **@uaaa/core**: Core types, utilities, and shared logic
- **@uaaa/server**: Backend service with Hono framework
- **@uaaa/ui**: Frontend application with Nuxt 3 and Vuetify
- **@uaaa/proxy**: Reverse proxy for integrated deployments

### Technology Stack

**Backend:**
- Node.js with Hono framework
- MongoDB for data persistence
- ArkType for runtime type validation
- JWT for token management
- bcrypt for password hashing

**Frontend:**
- Nuxt 3 with Vue 3 Composition API
- Vuetify for Material Design UI
- UnoCSS for utility-first styling
- Vite for fast development

## Use Cases

### Centralized Authentication

Replace multiple authentication systems with a single, unified platform. Users maintain one account across all your applications.

### External Identity Integration

Bridge external identity providers (like university authentication systems) to your applications using plugins and pre-authentication.

### Microservices Authorization

Issue application-specific tokens with fine-grained permissions for microservices architectures.

### Multi-Factor Authentication

Enforce security requirements with progressive authentication levels and multiple credential types.

## Quick Start

```bash
# Install UAAA server
npm install @uaaa/server

# Create configuration file
cat > config.json <<EOF
{
  "port": 3000,
  "db": {
    "uri": "mongodb://localhost:27017/uaaa"
  },
  "jwt": {
    "issuer": "https://auth.example.com",
    "secret": "your-secret-key-change-this"
  }
}
EOF

# Initialize database
npx @uaaa/server init

# Start server
npx @uaaa/server serve
```

Visit `http://localhost:3000` to access the UAAA interface.

## Next Steps

- **[Architecture](./architecture)**: Understand UAAA's design and components
- **[Deployment](./deployment)**: Deploy UAAA to production
- **[Configuration](./configuration)**: Configure UAAA for your environment
- **[Plugin Development](./plugins/developing-plugins)**: Create custom authentication plugins
- **[Integration Guides](./integrations/oauth2-oidc)**: Integrate your applications with UAAA

## Community and Support

UAAA is actively developed and maintained. For questions, issues, or contributions:

- **GitHub**: [github.com/fedstack-org/uaaa](https://github.com/fedstack-org/uaaa)
- **China Mirror**: [git.pku.edu.cn/uaaa/uaaa](https://git.pku.edu.cn/uaaa/uaaa)
- **Documentation**: [uaaa.docs](https://uaaa.docs)
- **License**: MIT

## Credits

UAAA is developed and maintained by the UAAA team, with inspiration from modern authentication standards and best practices in identity management.
