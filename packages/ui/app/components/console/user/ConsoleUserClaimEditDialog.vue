<template>
  <VDialog v-model="model" max-width="500">
    <VCard>
      <VCardTitle>{{ t('console.edit-claim-title') }}</VCardTitle>
      <VCardText>
        <VTextField
          :model-value="claimName"
          :label="t('console.claim-name')"
          variant="outlined"
          readonly
          class="mb-4"
        />
        <VTextField
          v-model="editValue"
          :label="t('console.claim-value')"
          variant="outlined"
        />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn :text="t('actions.cancel')" @click="model = false" />
        <VBtn :text="t('actions.save')" color="primary" :loading="running" @click="run()" />
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<script setup lang="ts">
const props = defineProps<{
  userId: string
  claimName: string
  claimValue: string
}>()

const emit = defineEmits<{
  updated: []
}>()

const model = defineModel<boolean>()
const { t } = useI18n()
const editValue = ref(props.claimValue)

watch(
  () => props.claimValue,
  (v) => {
    editValue.value = v
  }
)

const { run, running } = useTask(async () => {
  const resp = await api.console.user[':id'].claim[':name'].$patch({
    param: { id: props.userId, name: props.claimName },
    json: { value: editValue.value }
  })
  await api.checkResponse(resp)
  model.value = false
  emit('updated')
})
</script>
