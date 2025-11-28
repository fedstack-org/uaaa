<template>
  <UContainer class="flex items-center justify-center min-h-screen">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="flex flex-col items-center">
          <CommonLogo class="w-32 h-32 mb-4" variant="flat" />
          <div class="text-xl font-semibold">{{ t('pages.auth.signout') }}</div>
        </div>
      </template>

      <Transition name="fade" mode="out-in">
        <div v-if="actionSelected" class="p-4">
          <UAlert :color="loggingOut ? 'primary' : 'success'">
            <template #title>
              {{ loggingOut ? t('scoped.logging-out') : t('scoped.logged-out') }}
            </template>
          </UAlert>
        </div>
        <div v-else class="p-4">
          <UAlert color="primary" variant="soft" class="mb-4">
            <template #title>{{ t('scoped.choice-hint') }}</template>
          </UAlert>
          <div class="flex flex-col space-y-2">
            <UButton
              variant="outline"
              color="primary"
              icon="i-lucide-users"
              :label="t('scoped.switch-account')"
              block
              to="/auth/switch"
            />
            <UButton
              variant="solid"
              color="error"
              icon="i-lucide-log-out"
              :label="t('scoped.logout-completely')"
              block
              @click="onLogout"
            />
          </div>
        </div>
      </Transition>
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'plain'
})
useHead({
  title: 'Sign-Out'
})

const { t } = useI18n()

const actionSelected = ref(false)

// Delayed logout with UX feedback
const { run: performLogout, running: loggingOut } = useTask(async () => {
  // Show logging out message for 1.5 seconds
  await new Promise((resolve) => setTimeout(resolve, 1500))
  await api.logout()
  return symNoToast
})

function onLogout() {
  actionSelected.value = true
  performLogout()
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<i18n>
en:
  scoped:
    choice-hint: You can switch to another account or sign out completely.
    switch-account: Switch to another account
    logout-completely: Sign out completely
    logging-out: Signing out...
    logged-out: You have successfully signed out, redirecting to home page
zh-Hans:
  scoped:
    choice-hint: 您可以切换账号，或安全退出。
    switch-account: 切换账号
    logout-completely: 安全退出
    logging-out: 正在退出...
    logged-out: 您已成功登出，即将跳转到首页
</i18n>
