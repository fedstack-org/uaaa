<template>
  <UModal v-model="isOpen">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-pencil" class="w-5 h-5" />
          <h3 class="text-lg font-semibold">{{ t('actions.edit', [t('msg.claim')]) }}</h3>
        </div>
      </template>

      <div class="p-4 space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">{{ t('msg.claim-name') }}</label>
          <code class="block p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">{{
            claimKey
          }}</code>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">{{ t('msg.claim-value') }}</label>
          <UTextarea v-model="value" :rows="5" />
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            variant="outline"
            :label="t('actions.cancel')"
            :disabled="running"
            @click="isOpen = false"
          />
          <UButton
            variant="solid"
            color="primary"
            :label="t('actions.save')"
            :loading="running"
            @click="save"
          />
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  claimKey: string
  claimValue: string
}>()

const emit = defineEmits<{
  updated: []
}>()

const model = defineModel<boolean>({ default: false })
const { t } = useI18n()
const toast = useToast()

const isOpen = computed({
  get: () => model.value,
  set: (val) => {
    model.value = val
  }
})

const value = ref('')

watch(
  () => props.claimValue,
  (newValue) => {
    value.value = newValue
  },
  { immediate: true }
)

const { run: save, running } = useTask(async () => {
  try {
    const parsedValue = JSON.parse(value.value)
    const resp = await api.user.$patch({
      json: {
        claims: { [props.claimKey]: parsedValue }
      }
    })
    await api.checkResponse(resp)
    toast.add({ title: t('msg.task-succeeded'), color: 'success' })
    isOpen.value = false
    emit('updated')
  } catch (err) {
    if (err instanceof SyntaxError) {
      toast.add({ title: t('msg.invalid-json'), color: 'error' })
      return symNoToast
    }
    throw err
  }
})
</script>
