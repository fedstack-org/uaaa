<template>
  <VContainer class="fill-height d-flex align-center flex-wrap justify-center">
    <VCard class="min-w-xs lg:min-w-md">
      <VCardTitle class="d-flex flex-col items-center">
        <VIcon size="128">
          <CommonLogo variant="flat" />
        </VIcon>
        <div>{{ t('pages.logout') }}</div>
      </VCardTitle>
      <VDivider />
      <VAlert
        v-if="'error' in params"
        type="error"
        :text="t('msg.bad-arguments', [params.error])"
      />
      <SessionLogout v-else :params="params" />
    </VCard>
  </VContainer>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'authorize',
  middleware: 'verifyauth',
  level: 0
})

useHead({
  title: 'Logout'
})

const { t } = useI18n()
const { params } = useLogout()
</script>
