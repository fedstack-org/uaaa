<template>
  <UContainer class="flex items-center justify-center min-h-screen">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="flex flex-col items-center">
          <CommonLogo class="w-32 h-32 mb-4" variant="flat" />
          <div class="text-xl font-semibold">{{ t('pages.logout') }}</div>
        </div>
      </template>
      <UAlert
        v-if="'error' in params"
        color="error"
        :title="t('msg.bad-arguments', [params.error])"
      />
      <SessionLogout v-else :params="params" />
    </UCard>
  </UContainer>
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
