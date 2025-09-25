<template>
  <VContainer class="fill-height justify-center">
    <VCard class="min-w-xs lg:min-w-md">
      <VCardTitle class="d-flex flex-col items-center">
        <VIcon size="128">
          <CommonLogo variant="flat" />
        </VIcon>
        <div class="flex self-stretch">
          <div class="flex-1 flex justify-start"/>
          <div>{{ t('pages.auth.signout') }}</div>
          <div class="flex-1 flex justify-start"/>
        </div>
      </VCardTitle>
      <VDivider />

      <VFadeTransition mode="out-in">
        <VCardText v-if="actionSelected">
          <VAlert :type="loggingOut ? 'info' : 'success'">
            {{ loggingOut ? t('scoped.logging-out') : t('scoped.logged-out') }}
          </VAlert>
        </VCardText>
        <VCardText v-else>
          <VAlert type="info" variant="tonal" :text="t('scoped.choice-hint')" />
          <div class="d-flex flex-col space-y-2 mt-4">
            <VBtn
              variant="tonal"
              color="primary"
              prepend-icon="mdi-account-switch"
              block
              :text="t('scoped.switch-account')"
              to="/auth/switch"
            />
            <VBtn
              variant="tonal"
              color="error"
              prepend-icon="mdi-logout"
              block
              :text="t('scoped.logout-completely')"
              @click="onLogout"
            />
          </div>
        </VCardText>
      </VFadeTransition>
    </VCard>
  </VContainer>
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
