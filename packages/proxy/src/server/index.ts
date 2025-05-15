import { fastifyHttpProxy } from '@fastify/http-proxy'
import { fastify } from 'fastify'
import type { App } from '../index.js'

export class ServerManager {
  server

  constructor(public app: App) {
    this.server = fastify()
    this.server.register(fastifyHttpProxy, {
      upstream: app.config.get('upstream'),
      replyOptions: {},
      preValidation: async (req) => {
        //
      }
    })
  }

  async init() {
    await this.server.ready()
  }

  async start() {
    await this.server.listen({ port: 3000 })
  }

  async stop() {
    await this.server.close()
  }
}
