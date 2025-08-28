export const useRedirect = () => {
  const router = useRouter()
  const route = useRoute()
  const toSignin = () => router.push({ path: '/auth/signin', query: { redirect: route.fullPath } })
  const toVerify = (targetLevel: number) =>
    router.push({ path: '/auth/verify', query: { redirect: route.fullPath, targetLevel } })
  return { toSignin, toVerify }
}
