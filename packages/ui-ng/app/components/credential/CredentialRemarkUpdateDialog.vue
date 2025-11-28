<template>
  <UModal v-model="isOpen">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-edit" class="w-5 h-5" />
          <h3 class="text-lg font-semibold">{{ t('actions.edit-remark') }}</h3>
        </div>
      </template>
      <UTextarea v-model="value" :label="t('remark')" :rows="3" />
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton :label="t('actions.cancel')" variant="ghost" @click="isOpen = false" />
          <UButton
            :label="t('actions.save')"
            @click="
              run().then(() => {
                isOpen = false
              })
            "
          />
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  id: string
  remark: string
}>()
const emit = defineEmits<{
  updated: []
}>()

const value = ref(props.remark)
const isOpen = defineModel<boolean>({ default: false })

const { t } = useI18n()
const { run } = useTask(async () => {
  const resp = await api.user.credential[':id'].$patch({
    param: { id: props.id },
    json: { remark: value.value }
  })
  if (resp.ok) {
    emit('updated')
  }
})
</script>

<i18n>
zh-Hans:
  remark: 备注
en:
  remark: Remark
</i18n>
