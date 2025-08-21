import type { LocationQuery } from '#vue-router'

export interface ITransparentUXConfig {
  preferType?: string
  nonInteractive?: boolean
}

const parseTransparentUXConfig = (query: LocationQuery) => {
  const config: ITransparentUXConfig = {}
  if (query.preferType) {
    config.preferType = toSingle(query.preferType, '')
  }
  if (query.nonInteractive) {
    config.nonInteractive = ['1', 'true'].includes(toSingle(query.nonInteractive, '1'))
  }
  return config
}

export const useTransparentUX = () => {
  const route = useRoute()
  const config = computed(() => parseTransparentUXConfig(route.query))
  const silentFail = () => {
    history.go(1 - history.length)
  }
  return { config, silentFail }
}
