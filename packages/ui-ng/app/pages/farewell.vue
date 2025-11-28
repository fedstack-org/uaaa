<template>
  <UContainer
    ref="container"
    class="flex items-center justify-center min-h-screen transition-opacity duration-500 ease-in-out"
    :class="{ 'opacity-0': !isVisible }"
  >
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="flex flex-col items-center">
          <CommonLogo class="w-32 h-32 mb-4" variant="flat" />
          <div class="text-xl font-semibold">{{ t('pages.farewell') }}</div>
          <div v-if="app" class="text-sm text-gray-500">{{ app.name }}</div>
        </div>
      </template>

      <div class="flex justify-center p-8">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin" />
      </div>
    </UCard>
  </UContainer>
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
