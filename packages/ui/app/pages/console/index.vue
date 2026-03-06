<template>
  <div>
    <div class="text-h5 font-weight-bold mb-6">{{ t('console.dashboard') }}</div>

    <VRow>
      <VCol v-for="stat of stats" :key="stat.key" cols="12" sm="6" md="3">
        <VCard variant="tonal" :color="stat.color" :loading="status === 'pending'">
          <VCardText class="d-flex align-center pa-5">
            <VIcon :icon="stat.icon" size="48" class="mr-4 opacity-80" />
            <div>
              <div class="text-h4 font-weight-bold">{{ data?.[stat.key] ?? '—' }}</div>
              <div class="text-body-2 text-medium-emphasis mt-1">{{ t(stat.label) }}</div>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VCard class="mt-6" variant="outlined">
      <VCardTitle class="text-body-1 font-weight-medium">{{ t('console.quick-links') }}</VCardTitle>
      <VCardText>
        <VRow>
          <VCol v-for="link of quickLinks" :key="link.to" cols="12" sm="6" md="4">
            <VBtn
              :to="link.to"
              :prepend-icon="link.icon"
              :text="t(link.label)"
              variant="tonal"
              block
              class="justify-start text-none"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
useHead({ title: t('console.dashboard') })

const stats = [
  { key: 'userCount' as const, label: 'console.user-count', icon: 'mdi-account-group', color: 'primary' },
  { key: 'appCount' as const, label: 'console.app-count', icon: 'mdi-application-cog', color: 'info' },
  { key: 'activeSessionCount' as const, label: 'console.active-sessions', icon: 'mdi-account-key', color: 'success' },
  { key: 'activeTokenCount' as const, label: 'console.active-tokens', icon: 'mdi-key-chain', color: 'warning' }
]

const quickLinks = [
  { to: '/console/user', icon: 'mdi-account-group', label: 'pages.console.user' },
  { to: '/console/app', icon: 'mdi-application-cog-outline', label: 'pages.console.app' },
  { to: '/console/system', icon: 'mdi-cog', label: 'pages.console.setting' }
]

const { data, status } = await useAsyncData('console-stats', async () => {
  const resp = await api.console.stats.$get()
  await api.checkResponse(resp)
  return await resp.json()
})
</script>
