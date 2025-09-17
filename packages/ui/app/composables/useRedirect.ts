export const useRedirect = () => {
  const router = useRouter()
  const route = useRoute()
  const { config } = useTransparentUX()
  const toSignin = () => router.push({ path: '/auth/signin', query: { redirect: route.fullPath } })
  const toVerify = (targetLevel: number) =>
    router.push({ path: '/auth/verify', query: { redirect: route.fullPath, targetLevel } })
  const toApp = async (appId: string, href: string, delayed?: boolean) => {
    const query: Record<string, string> = { appId }
    if (delayed ?? config.value.nonInteractive) {
      query.delayed = '1'
    }
    // Use farewell page as a fallback when href is too slow to load
    await navigateTo({ path: '/farewell', query })
    location.href = href
  }

  return { toSignin, toVerify, toApp }
}
