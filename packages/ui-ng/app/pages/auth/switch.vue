<template>
  <UContainer class="flex items-center justify-center h-full">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="flex flex-col items-center">
          <CommonLogo class="w-32 h-32 mb-4" variant="flat" />
          <div class="flex w-full items-start">
            <div class="flex-1 flex justify-start">
              <UButton
                icon="i-lucide-arrow-left"
                size="sm"
                variant="outline"
                color="primary"
                @click="onBack"
              />
            </div>
            <div class="text-center flex-1">
              <div class="text-xl font-semibold">{{ t('pages.auth.switch') }}</div>
            </div>
            <div class="flex-1" />
          </div>
        </div>
      </template>

      <Transition name="fade" mode="out-in">
        <div class="flex flex-col gap-4 p-4">
          <!-- Current user info -->
          <template v-if="isLoggedIn">
            <div class="text-sm font-medium text-center">{{ t('msg.current-user') }}</div>
            <UserListItem
              active
              rounded
              :user-id="effectiveToken?.decoded.sub"
              :claims="getCandidateClaims(claims)"
            />
          </template>

          <!-- Candidate accounts -->
          <template v-if="hasCandidates">
            <div class="text-sm font-medium text-center">{{ t('msg.other-users') }}</div>
            <div class="space-y-2">
              <UserListItem
                v-for="{ sub, claims } in candidateAccounts"
                :key="sub"
                :user-id="sub"
                :claims="claims"
                :loading="switchRunning && selectedSub === sub"
                :disabled="switchRunning"
                @click="onSwitchAccount(sub)"
              />
            </div>
          </template>

          <USeparator />

          <UButton
            variant="outline"
            color="primary"
            class="justify-start"
            icon="i-lucide-log-in"
            :loading="loginRunning"
            :label="t('msg.login-another-account')"
            @click="login()"
          />
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
  title: 'Select Account'
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { candidateAccounts, hasCandidates, switchAccount, switchRunning } = useAccountSwitch()
const { isLoggedIn, effectiveToken, claims } = useAPI()

const selectedSub = ref<string | null>(null)

async function onSwitchAccount(sub: string) {
  selectedSub.value = sub
  await switchAccount(sub, typeof route.query.redirect === 'string' ? route.query.redirect : '/')
}

const { run: login, running: loginRunning } = useTask(async () => {
  await api.deactivateCurrentUser()
  navigateTo({ path: '/auth/signin', query: route.query }, { replace: true })
  return symNoToast
})

function onBack() {
  router.back()
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
zh-Hans:
  pages:
    auth:
      switch: 切换账号
  msg:
    current-account: 当前账号
    other-accounts: 其他账号
    no-other-accounts: 暂无其他可切换的账号
    login-another-account: 登录其他账号
en:
  pages:
    auth:
      switch: Switch Account
  msg:
    current-account: Current Account
    other-accounts: Other Accounts
    no-other-accounts: No other accounts available for switching
    login-another-account: Login with another account
</i18n>
