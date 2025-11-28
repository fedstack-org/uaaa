// useToast is auto-imported from Nuxt UI
// This composable provides additional error handling utilities

export const useErrorToast = () => {
  const toast = useToast()
  const router = useRouter()
  const route = useRoute()
  const { t } = useI18n({ useScope: 'global' })

  const notify = (err: unknown) => {
    if (isAPIError(err)) {
      if (t(`errors.api.${err.code}`) !== `errors.api.${err.code}`) {
        toast.add({
          title: t(`errors.api.${err.code}`, err.data),
          color: 'error',
          icon: 'i-lucide-alert-circle'
        })
        if (t(`errors.api-hint.${err.code}`) !== `errors.api-hint.${err.code}`) {
          toast.add({
            title: t(`errors.api-hint.${err.code}`, err.data),
            color: 'info',
            icon: 'i-lucide-info'
          })
        }
      } else {
        toast.add({
          title: t('errors.api.unknown', err as { code: string }),
          color: 'error',
          icon: 'i-lucide-alert-circle'
        })
      }
      switch (err.code) {
        case 'INSUFFICIENT_SECURITY_LEVEL': {
          router.replace({
            path: '/auth/verify',
            query: { redirect: route.fullPath, targetLevel: err.data.required }
          })
          break
        }
      }
      return
    }
    if (err instanceof Error) {
      toast.add({
        title: t('errors.error', { message: err.message }),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      return
    }
    toast.add({
      title: t('errors.unknown', { value: `${err}` }),
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
    console.error(err)
  }

  const trap = async <T>(fn: () => Promise<T>): Promise<[T, null] | [null, unknown]> => {
    try {
      return [await fn(), null]
    } catch (err) {
      notify(err)
      return [null, err]
    }
  }

  return { notify, trap }
}
