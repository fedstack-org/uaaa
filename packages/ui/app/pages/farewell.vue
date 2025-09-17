<template>
  <VContainer
    ref="container"
    class="fill-height justify-center"
    :class="{ 'opacity-0': !isVisible }"
    :style="{ transition: 'opacity 500ms ease-in-out' }"
  >
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
  layout: 'zen'
})

useHead({
  title: 'Farewell'
})

// FIXME: only allow internal route to this page

const { t } = useI18n()
const appId = useRouteQuery('appId', '')
const delayed = useRouteQuery('delayed', '')
const { data: app } = useApp(appId)

const isVisible = ref(false)

onMounted(() => {
  if (!delayed.value) {
    isVisible.value = true
  } else {
    setTimeout(() => {
      isVisible.value = true
    }, 500)
  }
})
</script>
