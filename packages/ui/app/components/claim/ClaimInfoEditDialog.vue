<template>
  <VDialog v-model="model" max-width="340">
    <VCard prepend-icon="mdi-note-edit" :title="t(`actions.edit`, [t(`claims.${name}`)])">
      <VCardText>
        <VTextarea v-model="localValue" :label="t(`claims.${name}`)" />
      </VCardText>
      <VCardActions>
        <VBtn :text="t('actions.cancel')" color="secondary" @click="model = false" />
        <VBtn :text="t('actions.reset')" color="error" @click="localValue = value" />
        <VBtn :text="t('actions.submit')" color="primary" @click="run()" />
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<script setup lang="ts">
const { name, value } = defineProps<{
  name: string
  value: string
}>()

const model = defineModel<boolean>()
const emit = defineEmits<{
  updated: []
}>()
const { t } = useI18n()
const localValue = ref('')

watch(
  () => value,
  () => {
    localValue.value = value
  },
  { immediate: true }
)

const { run } = useTask(async () => {
  const resp = await api.user.claim[':name'].$patch({
    param: { name },
    json: { value: localValue.value }
  })
  await api.checkResponse(resp)
  model.value = false
  emit('updated')
})
</script>
