<template>
  <UCard>
    <template #header>
      <h2 class="text-xl font-semibold">{{ t('msg.system-settings') }}</h2>
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
      <template #value-data="{ row }">
        <code class="text-sm">{{ row.value }}</code>
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
  { id: '_id', key: '_id', label: t('msg.id') },
  { id: 'value', key: 'value', label: t('msg.value') },
  { id: '_actions', key: '_actions', label: t('msg.actions') }
]

const { page, perPage, data, cachedCount, status } = usePagination(async (skip, limit, doCount) => {
  const resp = await api.console.system.$get({
    query: { skip: '' + skip, limit: '' + limit, count: doCount ? '1' : '0' }
  })
  await api.checkResponse(resp)
  const { docs, count } = await resp.json()
  return { items: docs, count }
})
</script>
