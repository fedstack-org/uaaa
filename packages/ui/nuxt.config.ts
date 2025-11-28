import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

const { host: SERVER_HOST, protocol: SERVER_PROTOCOL } = new URL(
  process.env.SERVER_BASE || 'http://localhost:3030'
)

console.log(`Using backend server: ${SERVER_PROTOCOL}//${SERVER_HOST}`)

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  devtools: { enabled: true },
  modules: [
    '@vueuse/nuxt',
    '@unocss/nuxt',
    '@nuxtjs/i18n',
    '@nuxtjs/device',
    '@nuxt/eslint',
    (_options, nuxt) => {
      nuxt.hooks.hook('vite:extendConfig', (config) => {
        config.plugins!.push(vuetify({ autoImport: true }))
      })
    }
  ],
  runtimeConfig: { public: { appName: 'UAAA' } },
  app: { head: { link: [{ rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }] } },
  css: ['@/assets/main.css'],
  build: { transpile: ['vuetify'] },
  vite: { vue: { template: { transformAssetUrls } } },
  nitro: {
    devProxy: {
      '/api': {
        target: `${SERVER_PROTOCOL}//${SERVER_HOST}/api`,
        changeOrigin: true,
        autoRewrite: true
      },
      '/oauth': {
        target: `${SERVER_PROTOCOL}//${SERVER_HOST}/oauth`,
        changeOrigin: true,
        autoRewrite: true
      },
      '/.well-known': {
        target: `${SERVER_PROTOCOL}//${SERVER_HOST}/.well-known`,
        changeOrigin: true,
        autoRewrite: true
      }
    }
  },
  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'zh-Hans',
    locales: [
      //
      { code: 'en', name: 'English', file: 'en.yml' },
      { code: 'zh-Hans', name: '简体中文', file: 'zh-Hans.yml' }
    ]
  }
})
