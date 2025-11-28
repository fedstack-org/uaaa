<template>
  <div v-if="data?.length" class="space-y-1">
    <div
      v-for="{ description, name, path } of data"
      :key="path"
      class="flex items-start justify-between gap-4 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      <div class="flex items-start gap-2 flex-1 min-w-0">
        <UIcon name="i-lucide-plus" class="w-4 h-4 mt-1 flex-shrink-0" />
        <div class="flex-1 min-w-0">
          <div class="font-medium">{{ name }}</div>
          <div class="text-sm text-gray-500">{{ description }}</div>
        </div>
      </div>
      <div class="text-right flex-shrink-0">
        <div>
          <code class="text-xs text-gray-500">{{ url.host }}</code>
        </div>
        <div>
          <code class="text-xs text-gray-500">{{ path }}</code>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="text-sm text-gray-500 p-2">
    {{ t('msg.no-permissions') }}
  </div>
</template>

<script setup lang="ts">
import { URL } from 'whatwg-url'
import { minimatch } from 'minimatch'

const props = defineProps<{
  permission: string
}>()

const { t } = useI18n()
const url = computed(() => new URL(`uperm://${props.permission}`))

const { data } = await useAsyncData(props.permission, async () => {
  const resp = await api.public.app[':id'].provided_permissions.$get({
    param: { id: url.value.host }
  })
  await api.checkResponse(resp)
  const { permissions } = await resp.json()
  return permissions.filter((p) => minimatch(p.path, url.value.pathname || '/'))
})
</script>
