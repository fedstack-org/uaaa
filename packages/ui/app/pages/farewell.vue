<template>
  <VContainer class="fill-height justify-center">
    <VCard class="min-w-xs lg:min-w-md">
      <VCardTitle class="d-flex flex-col items-center">
        <VIcon size="128">
          <CommonLogo variant="flat" />
        </VIcon>
        <div>{{ t('pages.farewell') }}</div>
        <div v-if="app" class="text-caption">{{ app.name }}</div>
      </VCardTitle>
      <VDivider />
      <VCardText class="text-center">
        <VProgressCircular indeterminate />
      </VCardText>
    </VCard>
  </VContainer>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'plain'
})

useHead({
  title: 'Farewell'
})

const { t } = useI18n()
const appId = useRouteQuery('appId', '')
const { data: app } = useApp(appId)
</script>
