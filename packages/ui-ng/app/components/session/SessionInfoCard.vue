<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-info" class="w-5 h-5" />
        <h2 class="text-xl font-semibold">{{ t('msg.session-info') }}</h2>
      </div>
    </template>

    <div v-if="data" class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-3 items-start">
        <dt class="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {{ t('jti') }}
        </dt>
        <dd class="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
          {{ data.jti }}
        </dd>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-3 items-start">
        <dt class="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {{ t('sid') }}
        </dt>
        <dd class="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
          {{ data.sid }}
        </dd>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-3 items-start">
        <dt class="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {{ t('level') }}
        </dt>
        <dd>
          <UBadge :label="t(`securityLevel.${data.level}`)" :color="getSecurityColor(data.level)" />
        </dd>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-3 items-start">
        <dt class="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {{ t('authorized') }}
        </dt>
        <dd>
          <div class="flex gap-1 flex-wrap">
            <AppAvatar v-for="app of data.authorized" :key="app" :app-id="app" size="xs" />
          </div>
        </dd>
      </div>
    </div>
    <div v-else class="p-4 text-center text-gray-500">
      {{ t('msg.loading') }}
    </div>
  </UCard>
</template>

<script setup lang="ts">
const { t } = useI18n()

const getSecurityColor = (level: number) => {
  switch (level) {
    case 4:
    case 3:
      return 'success'
    case 2:
      return 'warning'
    case 1:
    default:
      return 'error'
  }
}

const { data } = await useAsyncData(async () => {
  const token = api.effectiveToken.value
  if (!token) return null
  const { decoded } = token
  const resp = await api.session.index.$get()
  const { authorizedApps } = await resp.json()
  return {
    jti: decoded.jti,
    sid: decoded.sid,
    level: decoded.level,
    authorized: authorizedApps
  }
})
</script>

<i18n>
zh-Hans:
  jti: JTI
  sid: SID
  level: 安全等级
  authorized: 已授权应用
en:
  jti: JTI
  sid: SID
  level: Security Level
  authorized: Authorized Apps
</i18n>
