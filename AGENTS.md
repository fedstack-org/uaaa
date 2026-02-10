# Agent Instructions

## Package Manager

- Use **yarn**: `yarn install`, `yarn docs:dev`, `yarn docs:build`, `yarn docs:preview`

## Key Conventions

- Monorepo workspaces live in `packages/`
- Run package scripts via `yarn workspace <name> <script>`
- Workspace names: `@uaaa/core`, `@uaaa/server`, `@uaaa/proxy`, `@uaaa/ui`

## Code Map

- `@uaaa/core`: shared types/utilities; permission + token model; TypeScript, ArkType
- `@uaaa/server`: auth/OAuth/OIDC backend; manager-based auth/session/token + plugins; Hono, MongoDB
- `@uaaa/proxy`: reverse proxy/login bridge; Fastify proxy with adapters/plugins; Fastify
- `@uaaa/ui`: web console + auth flows; Nuxt app calling server APIs; Nuxt/Vue, Vuetify, UnoCSS, Hono client
