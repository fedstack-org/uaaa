<template>
  <div>
    <div class="mb-2 font-medium">{{ t('msg.security-level') }}</div>
    <UButtonGroup>
      <UButton
        v-for="i in 5"
        :key="i"
        :label="t(`securityLevel.${i - 1}`)"
        :variant="model === i - 1 ? 'solid' : 'outline'"
        :color="model === i - 1 ? 'primary' : 'neutral'"
        @click="model = i - 1"
      />
    </UButtonGroup>
  </div>
</template>

<script setup lang="ts">
const model = defineModel<number>({ required: true })
const { t } = useI18n()
</script>
