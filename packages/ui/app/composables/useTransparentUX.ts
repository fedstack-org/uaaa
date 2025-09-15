import { type } from 'arktype'

const tTransparentUXConfig = type({
  preferType: 'string?',
  nonInteractive: 'boolean?',
  preAuthType: 'string?',
  preAuthPayload: 'unknown?'
})

export const useTransparentUX = () => {
  const router = useRouter()
  const route = useRoute()

  const parseTransparentUXConfig = (params: unknown) => {
    const parsed = type('string.json.parse').to(tTransparentUXConfig)(params)
    return parsed instanceof type.errors ? {} : parsed
  }
  const resolveConfig = () => {
    let params = route.query.params
    switch (route.path) {
      case '/auth/signin':
      case '/auth/verify':
        if (route.query.redirect && typeof route.query.redirect === 'string') {
          params = router.resolve(route.query.redirect).query.params
        }
      case '/logout':
      case '/authorize':
        return parseTransparentUXConfig(params)
    }
    return {}
  }

  const config = computed(() => resolveConfig())

  const silentFail = () => {
    history.go(1 - history.length)
  }
  return { config, silentFail }
}
