import { definePlugin } from '../../_common.js'
import { SmsPlugin, tSmsConfig } from './plugin.js'

export type ISmsApi = ReturnType<SmsPlugin['getApiRouter']>

export default definePlugin({
  name: 'sms',
  configType: tSmsConfig,
  setup: async (ctx) => {
    const plugin = new SmsPlugin(ctx.app)
    await plugin.setup(ctx)
  }
})