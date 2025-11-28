// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IUseTaskOptions {
  //
}

export const symNoToast = Symbol('noToast')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useTask = <T extends any[], R>(
  task: (...args: T) => Promise<R | typeof symNoToast>,
  _options?: IUseTaskOptions
) => {
  const running = ref(false)
  const error = ref<unknown>(null)
  const toast = useToast()
  const errToast = useErrorToast()
  const { t } = useI18n({ useScope: 'global' })
  const run = async (...args: T) => {
    running.value = true
    error.value = null
    try {
      const result = await task(...args)
      if (result !== symNoToast) {
        toast.success(t('msg.task-succeeded'))
      }
      return result
    } catch (e) {
      error.value = e
      errToast.notify(e)
    } finally {
      running.value = false
    }
  }
  return { running, error, run }
}
