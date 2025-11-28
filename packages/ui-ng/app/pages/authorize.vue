<template>
  <UContainer class="flex items-center justify-center h-full">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="flex flex-col items-center">
          <CommonLogo class="w-32 h-32 mb-4" variant="flat" />
          <div class="text-center">
            <div class="text-xl font-semibold">{{ t('pages.authorize') }}</div>
            <div v-if="data" class="text-sm text-gray-500">{{ data.name }}</div>
          </div>
        </div>
      </template>

      <USeparator />

      <div class="flex items-center p-4">
        <div class="flex-1" />
        <div class="text-sm font-medium text-center">{{ t('msg.current-user') }}</div>
        <div class="flex-1 text-right">
          <UButton
            variant="ghost"
            size="xs"
            :label="t('actions.switch-account')"
            @click="goToSwitchPage()"
          />
        </div>
      </div>

      <div class="px-4 pb-4">
        <UserListItem
          :user-id="effectiveToken?.decoded.sub"
          :claims="getCandidateClaims(claims)"
          class="border-2 border-primary"
        />
      </div>

      <USeparator />

      <UAlert
        v-if="'error' in params"
        color="error"
        :title="t('msg.bad-arguments', [params.error])"
        class="m-4"
      />
      <SessionAuthorize v-else :params="params" />
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'authorize',
  middleware: 'verifyauth'
})

useHead({
  title: 'Authorize'
})

const { t } = useI18n()
const { params } = useAuthorize()
const appId = computed(() => ('error' in params.value ? '' : params.value.appId))
const { data } = useApp(appId)
const { goToSwitchPage } = useAccountSwitch()
const { effectiveToken, claims } = useAPI()
</script>
