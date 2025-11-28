<template>
  <UContainer>
    <div class="py-8">
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">{{ t('pages.console.index') }}</h2>
        </template>
        <div class="p-4">
          <p>{{ t('msg.console-welcome') }}</p>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({
  level: 4
})

const { t } = useI18n()

useHead({
  title: 'Home'
})
</script>
