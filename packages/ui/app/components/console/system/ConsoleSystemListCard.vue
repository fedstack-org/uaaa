<template>
  <div>
    <VAlert type="warning" variant="tonal" class="mb-4" icon="mdi-alert-outline">
      {{ t('console.system-readonly-warning') }}
    </VAlert>
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
          <code class="text-caption">{{ formatValue(item.value) }}</code>
        </template>
      </VDataTableServer>
    </VCard>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const headers = [
  { title: t('msg.id'), key: '_id', sortable: false },
  { title: t('msg.value'), key: 'value', sortable: false }
] as const

const { page, perPage, data, cachedCount, status } = usePagination(
  async (skip, limit, doCount) => {
    const resp = await api.console.system.$get({
      query: { skip: '' + skip, limit: '' + limit, count: doCount ? '1' : '0' }
    })
    await api.checkResponse(resp)
    const { docs, count } = await resp.json()
    return { items: docs, count }
  }
)

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
</script>
