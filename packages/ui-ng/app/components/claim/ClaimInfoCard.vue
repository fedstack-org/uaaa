<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-user-circle" class="w-5 h-5" />
        <h2 class="text-xl font-semibold">{{ t('msg.user-profile') }}</h2>
      </div>
    </template>

    <UTable v-if="data" :rows="rows" :columns="columns">
      <template #key-data="{ row }">
        <code class="text-sm">{{ row.key }}</code>
      </template>
      <template #value-data="{ row }">
        <div class="flex items-center gap-2">
          <span>{{ row.value }}</span>
          <UButton
            v-if="row.editable"
            icon="i-lucide-pencil"
            variant="ghost"
            size="xs"
            @click="openEditDialog(row.key, row.value)"
          />
        </div>
      </template>
      <template #verified-data="{ row }">
        <UBadge v-if="row.verified" color="success" :label="t('msg.verified')" />
        <UBadge v-else color="warning" :label="t('msg.not-verified')" />
      </template>
    </UTable>
    <div v-else class="p-4 text-center text-gray-500">
      {{ t('msg.loading') }}
    </div>

    <ClaimInfoEditDialog
      v-model="editDialogOpen"
      :claim-key="editingKey"
      :claim-value="editingValue"
      @updated="refresh()"
    />
  </UCard>
</template>

<script setup lang="ts">
const { t } = useI18n()

const columns = [
  { id: 'key', key: 'key', label: t('msg.claim-name') },
  { id: 'value', key: 'value', label: t('msg.claim-value') },
  { id: 'verified', key: 'verified', label: t('msg.verified') }
]

const editDialogOpen = ref(false)
const editingKey = ref('')
const editingValue = ref('')

const { data, refresh } = await useAsyncData(async () => {
  const resp = await api.user.$get()
  await api.checkResponse(resp)
  const { claims, verified } = await resp.json()
  return { claims, verified }
})

const rows = computed(() => {
  if (!data.value) return []
  return Object.entries(data.value.claims).map(([key, value]) => ({
    key,
    value: typeof value === 'string' ? value : JSON.stringify(value),
    verified: data.value.verified.includes(key),
    editable: !['_id', 'username'].includes(key)
  }))
})

function openEditDialog(key: string, value: string) {
  editingKey.value = key
  editingValue.value = value
  editDialogOpen.value = true
}
</script>
