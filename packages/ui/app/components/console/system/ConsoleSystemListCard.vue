<template>
  <VCard>
    <VCardTitle class="d-flex align-center">
      <div>{{ t('msg.system-settings') }}</div>
    </VCardTitle>
    <VDataTableServer
      v-model:page="page"
      v-model:items-per-page="perPage"
      :headers="headers"
      :items-length="cachedCount"
      :items="data ?? []"
      :items-per-page-options="[15, 30, 50, 100]"
      :loading="status === 'pending'"
      item-value="_id"
    >
      <template #[`item._id`]="{ item }">
        <code v-text="item._id" />
      </template>
      <template #[`item.value`]="{ item }">
        <code v-text="item.value" />
      </template>
      <template #[`item._actions`]>
        <div class="flex gap-2" />
      </template>
    </VDataTableServer>
  </VCard>
</template>

<script setup lang="ts">
const { t } = useI18n()
const headers = [
  { title: t('msg.id'), key: '_id', sortable: false },
  { title: t('msg.value'), key: 'value', sortable: false },
  { title: t('msg.actions'), key: '_actions', sortable: false }
] as const

const { page, perPage, data, cachedCount, status } = usePagination(async (skip, limit, doCount) => {
  const resp = await api.console.system.$get({
    query: { skip: '' + skip, limit: '' + limit, count: doCount ? '1' : '0' }
  })
  await api.checkResponse(resp)
  const { docs, count } = await resp.json()
  return { items: docs, count }
})
</script>
