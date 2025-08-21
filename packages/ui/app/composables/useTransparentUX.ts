import type { LocationQuery } from '#vue-router'

export interface ITransparentUXConfig {
  preferType?: string
  nonInteractive?: boolean
}

export const useTransparentUX = () => {
  const router = useRouter()
  const route = useRoute()

  const parseTransparentUXConfig = (query: LocationQuery) => {
    console.log(`parseTransparentUXConfig`, query)
    const config: ITransparentUXConfig = {}
    if (query.preferType) {
      config.preferType = toSingle(query.preferType, '')
    }
    if (query.nonInteractive) {
      config.nonInteractive = ['1', 'true'].includes(toSingle(query.nonInteractive, '1'))
    }
    if (query.params) {
      try {
        Object.assign(config, parseTransparentUXConfig(JSON.parse(toSingle(query.params, '{}'))))
      } catch {}
    }
    if (query.redirect) {
      const originalRoute = router.resolve(toSingle(query.redirect, '/'))
      Object.assign(config, parseTransparentUXConfig(originalRoute.query))
    }
    return config
  }

  const config = computed(() => parseTransparentUXConfig(route.query))

  const silentFail = () => {
    history.go(1 - history.length)
  }
  return { config, silentFail }
}
