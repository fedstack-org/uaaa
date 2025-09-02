export const useApp = (appId: MaybeRef<string>) => {
  const appIdRef = toRef(appId)
  return useAsyncData(
    () => `app-${appIdRef.value}`,
    async () => {
      if (!appIdRef.value) return null
      const resp = await api.public.app[':id'].$get({ param: { id: appIdRef.value } })
      await api.checkResponse(resp)
      const { app } = await resp.json()
      return app
    },
    { default: () => null }
  )
}
