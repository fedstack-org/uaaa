export const useAccountSwitch = () => {
  const router = useRouter()

  const candidateAccounts = computed(() => {
    return Object.entries(api.candidateTokens.value).map(([sub, { claims }]) => ({ sub, claims }))
  })

  const hasCandidates = computed(() => candidateAccounts.value.length > 0)

  const { run: switchAccount, running: switchRunning } = useTask(
    async (sub: string, redirect = '/') => {
      await api.switchToCandidate(sub, redirect)
      return symNoToast
    }
  )

  const goToSwitchPage = (redirect?: string) => {
    const query: Record<string, string> = {}
    if (redirect) {
      query.redirect = redirect
    }
    router.push({ path: '/auth/switch', query })
  }

  return {
    candidateAccounts,
    hasCandidates,
    switchAccount,
    switchRunning,
    goToSwitchPage
  }
}
