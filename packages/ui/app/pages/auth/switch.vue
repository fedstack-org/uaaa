<template>
  <VContainer class="flex flex-wrap items-center justify-center h-full lg:h-auto lg:pt-40!">
    <VCard class="min-w-xs lg:min-w-md">
      <VCardTitle class="d-flex flex-col items-center">
        <VIcon size="128">
          <CommonLogo variant="flat" />
        </VIcon>
        <div class="flex self-stretch items-start">
          <div class="flex-1 flex justify-start">
            <VBtn icon="mdi-arrow-left" size="small" variant="tonal" color="info" @click="onBack" />
          </div>
          <div class="text-center">
            <div>{{ t('pages.auth.switch') }}</div>
          </div>
          <div class="flex-1"></div>
        </div>
      </VCardTitle>
      <VDivider />
      <VFadeTransition mode="out-in">
        <VCardText class="flex flex-col gap-2">
          <!-- Current user info -->
          <template v-if="isLoggedIn">
            <div class="text-subtitle-2 text-center">{{ t('msg.current-user') }}</div>
            <VList mandatory color="info">
              <UserListItem
                active
                rounded
                :user-id="effectiveToken?.decoded.sub"
                :claims="getCandidateClaims(claims)"
              />
            </VList>
          </template>

          <!-- Candidate accounts -->
          <template v-if="hasCandidates">
            <div class="text-subtitle-2 text-center mb-2">{{ t('msg.other-users') }}</div>
            <VList mandatory color="primary">
              <UserListItem
                v-for="{ sub, claims } in candidateAccounts"
                :key="sub"
                :user-id="sub"
                :claims="claims"
                :loading="switchRunning && selectedSub === sub"
                :disabled="switchRunning"
                @click="onSwitchAccount(sub)"
              />
            </VList>
          </template>
          <VDivider />
          <VBtn
            variant="tonal"
            color="primary"
            class="justify-start"
            prepend-icon="mdi-login"
            :loading="loginRunning"
            @click="login()"
          >
            {{ t('msg.login-another-account') }}
          </VBtn>
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
