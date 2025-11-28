<template>
  <UModal v-model="model" :ui="{ width: 'max-w-screen-xl' }">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-pencil" class="w-5 h-5" />
          <h3 class="text-lg font-semibold">{{ t('actions.edit', [t('msg.app')]) }}</h3>
        </div>
      </template>

      <AppManifestEditor v-model="value" />

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            variant="outline"
            :label="t('actions.cancel')"
            @click="model = false"
          />
          <UButton
            variant="outline"
            color="error"
            :label="t('actions.reset')"
            @click="value = JSON.parse(JSON.stringify(props.manifest))"
          />
          <UButton
            variant="solid"
            color="primary"
            :label="t('actions.submit')"
            @click="run()"
          />
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
import type { IAppManifest } from '@uaaa/server'

const props = defineProps<{
  manifest: IAppManifest
}>()

const model = defineModel<boolean>()
const emit = defineEmits<{
  updated: []
}>()
const { t } = useI18n()
const value = ref<IAppManifest>(JSON.parse(JSON.stringify(props.manifest)))

watch(
  () => props.manifest,
  () => {
    value.value = JSON.parse(JSON.stringify(props.manifest))
  },
  { immediate: true, deep: true }
)

const { run } = useTask(async () => {
  await api.console.app[':id'].$patch({
    param: { id: value.value.appId },
    json: value.value
  })
  model.value = false
  emit('updated')
})
</script>
