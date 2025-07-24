export interface IUIConfig {
  signInNotice?: string
  verifyNotice?: string
}

const _useUIConfig = () => {
  return useAsyncData(
    'ui-config-data',
    async () => {
      const resp = await fetch('/ui_config.json')
      if (!resp.ok) {
        if (resp.status === 404) return {} as IUIConfig
        throw new Error('Failed to fetch UI config')
      }
      const data = await resp.json()
      if ('signInNotice' in data && typeof data.signInNotice !== 'string') {
        throw new Error('Invalid signInNotice in UI config')
      }
      if ('verifyNotice' in data && typeof data.verifyNotice !== 'string') {
        throw new Error('Invalid verifyNotice in UI config')
      }
      return data as IUIConfig
    },
    { default: () => ({}) as IUIConfig }
  )
}

const uiKey: InjectionKey<ReturnType<typeof _useUIConfig>> = Symbol('ui')

export const useUIConfig = () => {
  const provided = inject(uiKey, null)
  if (provided) return provided
  const created = _useUIConfig()
  provide(uiKey, created)
  return created
}
