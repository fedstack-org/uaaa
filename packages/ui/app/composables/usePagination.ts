export const usePagination = <T>(
  executor: (
    skip: number,
    limit: number,
    count: boolean,
    extra?: { search?: string; disabled?: string }
  ) => Promise<{
    items: T[]
    count: number
  }>,
  key?: MaybeRefOrGetter<string>
) => {
  const page = useRouteQuery('page', '1', { transform: Number })
  const perPage = useRouteQuery('perPage', '10', { transform: Number })
  const search = ref('')
  const filters = ref<Record<string, string>>({})
  const cachedCount = ref(0)
  let countLoaded = false
  const { data, error, execute, status } = useAsyncData(
    key ?? useId(),
    async () => {
      const skip = (page.value - 1) * perPage.value
      const extra: { search?: string; disabled?: string } = {}
      if (search.value) extra.search = search.value
      if (filters.value.disabled) extra.disabled = filters.value.disabled
      const { items, count } = await executor(skip, perPage.value, !countLoaded, extra)
      if (!countLoaded) {
        countLoaded = true
        cachedCount.value = count
      }
      return items
    },
    {
      deep: true
    }
  )
  watch([page, perPage], () => {
    execute()
  })

  const debouncedSearch = refDebounced(search, 300)
  watch([debouncedSearch, filters], () => {
    countLoaded = false
    page.value = 1
    execute()
  }, { deep: true })

  return { page, perPage, search, filters, data, error, cachedCount, execute, status }
}
