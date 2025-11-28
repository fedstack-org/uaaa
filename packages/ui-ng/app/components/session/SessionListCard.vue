<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-list" class="w-5 h-5" />
        <h2 class="text-xl font-semibold">{{ t('msg.session-list') }}</h2>
      </div>
    </template>

    <UTable
      v-model:page="page"
      v-model:page-size="perPage"
      :rows="data ?? []"
      :columns="columns"
      :loading="status === 'pending'"
      :total="cachedCount"
      :page-size-options="[15, 30, 50, 100]"
    >
      <template #_id-data="{ row }">
        <code class="text-sm">{{ row._id }}</code>
      </template>
      <template #authorized-data="{ row }">
        <div class="flex gap-1">
          <AppAvatar v-for="app of row.authorized" :key="app" :app-id="app" size="xs" />
        </div>
      </template>
      <template #createdAt-data="{ row }">
        <UBadge variant="subtle" class="font-mono">
          {{ new Date(row.createdAt).toLocaleString() }}
        </UBadge>
      </template>
      <template #lastActiveAt-data="{ row }">
        <UBadge variant="subtle" class="font-mono">
          {{ new Date(row.lastActiveAt).toLocaleString() }}
        </UBadge>
      </template>
      <template #_actions-data="{ row }">
        <div class="flex gap-2">
          <UButton
            :label="t('actions.view')"
            variant="outline"
            size="xs"
            icon="i-lucide-eye"
            @click="$router.push(`/session/${row._id}`)"
          />
          <UButton
            :label="t('actions.terminate')"
            variant="outline"
            color="error"
            size="xs"
            icon="i-lucide-x-circle"
            @click="run(row._id)"
          />
        </div>
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
const { t } = useI18n()
const columns = [
  { id: '_id', key: '_id', label: t('msg.session-id') },
  { id: 'authorized', key: 'authorized', label: t('msg.authorized-apps') },
  { id: 'createdAt', key: 'createdAt', label: t('msg.created-at') },
  { id: 'lastActiveAt', key: 'lastActiveAt', label: t('msg.last-active-at') },
  { id: '_actions', key: '_actions', label: t('msg.actions') }
]

const { page, perPage, data, cachedCount, status, execute } = usePagination(
  async (skip, limit, doCount) => {
    const resp = await api.user.session.$get({
      query: { skip: '' + skip, limit: '' + limit, count: doCount ? '1' : '0' }
    })
    await api.checkResponse(resp)
    const { sessions, count } = await resp.json()
    return { items: sessions, count }
  }
)

const { run } = useTask(async (id: string) => {
  if (!confirm(t('msg.confirm-operation'))) return symNoToast
  const resp = await api.user.session[':id'].terminate.$post({
    param: { id }
  })
  await api.checkResponse(resp)
  execute()
})
</script>
