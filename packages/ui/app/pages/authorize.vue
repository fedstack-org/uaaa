<template>
  <VContainer class="fill-height justify-center">
    <VCard class="min-w-xs lg:min-w-md">
      <VCardTitle class="d-flex flex-col items-center">
        <VIcon size="128">
          <CommonLogo variant="flat" />
        </VIcon>
        <div class="text-center">
          <div>{{ t('pages.authorize') }}</div>
          <div v-if="data" class="text-caption">{{ data.name }}</div>
        </div>
      </VCardTitle>
      <VDivider />
      <div class="d-flex items-center">
        <div class="flex-1" />
        <div class="text-subtitle-2 text-center">{{ t('msg.current-user') }}</div>
        <div class="flex-1 text-right">
          <VBtn
            color="primary"
            variant="text"
            size="small"
            :text="t('actions.switch-account')"
            @click="goToSwitchPage()"
          />
        </div>
      </div>
      <VList mandatory color="info" class="mx-4 pt-0">
        <UserListItem
          active
          rounded
          :user-id="effectiveToken?.decoded.sub"
          :claims="getCandidateClaims(claims)"
        />
      </VList>
      <VDivider />
      <VAlert
        v-if="'error' in params"
        type="error"
        :text="t('msg.bad-arguments', [params.error])"
      />
      <SessionAuthorize v-else :params="params" />
    </VCard>
  </VContainer>
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
