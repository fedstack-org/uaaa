import { type } from 'arktype'
import { definePlugin } from '../../_common.js'

export default definePlugin({
  name: 'simple',
  configType: type({}),
  setup: async (ctx) => {
    ctx.app.registerAdapter({
      name: 'simple',
      getTransform: async (_req, _rep, token) => {
        return {
          rewriteRequestHeaders: (headers) => ({
            ...headers,
            'x-user-id': token.sub,
            'x-client-app-id': token.client_id,
            authorization: undefined
          })
        }
      }
    })
  }
})
