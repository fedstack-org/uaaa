<template>
  <UCard>
    <template #header>
      <h2 class="text-xl font-semibold">{{ t('msg.user-list') }}</h2>
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
        <div class="flex items-center gap-2">
          <code class="text-sm">{{ row._id }}</code>
          <UBadge
            v-if="row._id === currentUser"
            :label="t('msg.current-user')"
            color="info"
          />
        </div>
      </template>
      <template #_username-data="{ row }">
        {{ row.claims?.username.value }}
      </template>
      <template #disabled-data="{ row }">
        <UBadge v-if="row.disabled" color="error" :label="t('msg.disabled')" />
        <UBadge v-else color="success" :label="t('msg.enabled')" />
      </template>
      <template #_actions-data>
        <div class="flex gap-2" />
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
const { t } = useI18n()
const columns = [
  { id: '_id', key: '_id', label: t('msg.user-id') },
  { id: '_username', key: '_username', label: t('msg.username') },
  { id: 'disabled', key: 'disabled', label: t('msg.is-disabled') },
  { id: '_actions', key: '_actions', label: t('msg.actions') }
]
const currentUser = computed(() => api.effectiveToken.value?.decoded.sub)

const { page, perPage, data, cachedCount, status } = usePagination(async (skip, limit, doCount) => {
  const resp = await api.console.user.$get({
    query: { skip: '' + skip, limit: '' + limit, count: doCount ? '1' : '0' }
  })
  await api.checkResponse(resp)
  const { users, count } = await resp.json()
  return { items: users, count }
})
</script>
