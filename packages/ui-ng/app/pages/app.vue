<template>
  <UContainer>
    <div class="py-8">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-app-window" class="w-5 h-5" />
            <h2 class="text-xl font-semibold">{{ t('msg.manage-app') }}</h2>
          </div>
        </template>

        <div v-if="apps?.length" class="divide-y">
          <div
            v-for="app in apps"
            :key="app.appId"
            class="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <AppAvatar :app-id="app.appId" :icon="app.app.icon" :name="app.app.name" size="md" />
            <div class="flex-1 min-w-0">
              <div class="font-semibold">{{ app.app.name }}</div>
              <div class="text-sm text-gray-500">{{ app.app.description }}</div>
            </div>
            <UButton
              icon="i-lucide-pencil"
              variant="ghost"
              :to="{ path: '/install', query: { appId: app.appId, redirect: route.fullPath } }"
            />
          </div>
        </div>
        <UAlert v-else color="info" :title="t('msg.no-app-installed')" />
      </UCard>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({
  level: 2
})

useHead({
  title: 'App Management'
})

const { t } = useI18n()
const route = useRoute()

const { data: apps } = await useAsyncData(async () => {
  const resp = await api.user.installation.$get()
  const { installations } = await resp.json()
  return installations
})
</script>
