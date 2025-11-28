export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/hints',
    '@nuxt/scripts',
    '@vueuse/nuxt',
    '@nuxtjs/i18n',
    '@nuxtjs/device'
  ],
  ssr: false,
  devtools: { enabled: true },
  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }]
    }
  },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      appName: 'UAAA'
    }
  },
  compatibilityDate: '2025-01-15',
  nitro: {
    devProxy: {
      '/api': 'http://localhost:3030/api',
      '/oauth': 'http://localhost:3030/oauth',
      '/.well-known': 'http://localhost:3030/.well-known'
    }
  },
  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },
  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'zh_cn',
    locales: [
      { code: 'en', name: 'English', file: 'en.yml' },
      { code: 'zh_cn', name: '简体中文', file: 'zh_cn.yml' }
    ]
  }
})
