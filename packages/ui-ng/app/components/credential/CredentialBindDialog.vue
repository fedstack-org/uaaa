<template>
  <UModal v-model="isOpen">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-key" class="w-5 h-5" />
          <h3 class="text-lg font-semibold">{{ t(`actions.${action}`) }}</h3>
        </div>
      </template>
      <CredentialForm :type="type" :action="action" :credential-id="id" @updated="onUpdated" />
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
defineProps<{
  id?: string
  type: string
  action: 'bind' | 'unbind'
}>()
const emit = defineEmits<{
  updated: []
}>()

const { t } = useI18n()
const isOpen = defineModel<boolean>({ default: false })

function onUpdated() {
  emit('updated')
  isOpen.value = false
}
</script>

<i18n>
zh-Hans:
  remark: 备注
en:
  remark: Remark
</i18n>
