<template>
  <UContainer class="flex items-center justify-center h-full">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="flex flex-col items-center">
          <CommonLogo class="w-32 h-32 mb-4" variant="flat" />
          <div class="flex w-full items-start">
            <div class="flex-1 flex justify-start">
              <Transition name="fade" mode="out-in">
                <UButton
                  v-if="type"
                  icon="i-lucide-arrow-left"
                  size="xs"
                  variant="outline"
                  color="primary"
                  @click="type = ''"
                />
              </Transition>
            </div>
            <div class="text-center flex-1">
              <div class="text-xl font-semibold">{{ t('pages.auth.signin') }}</div>
              <div v-if="data?.app" class="text-sm text-gray-500">{{ data.app.name }}</div>
            </div>
            <div class="flex-1 flex justify-end">
              <UButton
                v-if="showRemote && data?.allowRemoteAuthorize"
                icon="i-lucide-qr-code"
                size="xs"
                variant="ghost"
                color="primary"
                :disabled="remoteAuthorizeRunning"
                @click="startRemoteAuthorize"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- Candidate Accounts Section -->
      <Transition name="fade" mode="out-in">
        <div v-if="hasCandidates && !type && !isRemote">
          <div class="text-sm font-medium text-center mt-2 mb-3">
            {{ t('msg.previously-logged-accounts') }}
          </div>
          <div class="mx-4 space-y-2">
            <UserListItem
              v-for="{ sub, claims } in candidateAccounts"
              :key="sub"
              :user-id="sub"
              :claims="claims"
              :loading="switchRunning && selectedSub === sub"
              :disabled="switchRunning"
              @click="onQuickLogin(sub)"
            />
          </div>
          <USeparator class="my-4" />
          <div class="text-sm font-medium text-center mb-2">
            {{ t('msg.login-other-account') }}
          </div>
        </div>
      </Transition>

      <template v-if="te('msg.login-hint')">
        <UAlert color="primary" variant="soft" :title="t('msg.login-hint')" class="whitespace-pre-line" />
        <USeparator class="my-4" />
      </template>
      <template v-if="uiConfig.signInNotice">
        <UAlert color="warning" variant="soft" :title="uiConfig.signInNotice" />
        <USeparator class="my-4" />
      </template>

      <Transition name="fade" mode="out-in">
        <template v-if="isRemote">
          <USkeleton v-if="!userCode" class="h-64" />
          <div v-else class="flex flex-col md:flex-row">
            <div class="text-center p-4">
              <div class="mb-2">{{ t('msg.scan-qrcode-to-authorize') }}</div>
              <img :src="qrcode" alt="QR Code" class="mx-auto" />
            </div>
            <USeparator :vertical="true" class="hidden md:block" />
            <USeparator class="md:hidden my-4" />
            <div class="flex-1 flex flex-col justify-center items-center p-4">
              <div>{{ t('msg.or-visit') }}</div>
              <div class="font-mono text-primary">{{ deviceUrl }}</div>
              <div>{{ t('msg.and-type-code-below') }}</div>
              <div class="text-2xl font-mono text-error font-bold">{{ userCode }}</div>
            </div>
            <UModal v-model="scanned" :ui="{ overlay: { background: 'bg-gray-900/75' } }">
              <div class="text-center p-8">
                <div class="flex justify-center mb-4">
                  <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                </div>
                <div class="text-lg">{{ t('msg.scanned') }}</div>
              </div>
            </UModal>
          </div>
        </template>
        <CredentialForm v-else-if="type" action="login" :type="type" @updated="postLogin" />
        <template v-else-if="data">
          <div v-if="data.allowedTypes.length" class="flex flex-col gap-2 p-4">
            <UButton
              v-for="loginType of data.allowedTypes"
              :key="loginType"
              variant="outline"
              class="justify-start"
              :icon="credentialIcon(loginType)"
              :label="t('msg.login-by', [t(`credentials.${loginType}`)])"
              @click="type = loginType"
            />
          </div>
          <UAlert v-else color="error" :title="t('msg.no-login-methods')" />
        </template>
        <UAlert v-else-if="error" color="error" :title="error.message" />
      </Transition>
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'plain',
  middleware: 'noauth'
})
useHead({
  title: 'Sign-In'
})

const { t, te } = useI18n()
const route = useRoute()
const router = useRouter()
const type = useRouteQuery<string>('signin_type', '')
const { config } = useTransparentUX()
const { candidateAccounts, hasCandidates, switchAccount, switchRunning } = useAccountSwitch()

const selectedSub = ref<string | null>(null)
const authorizeParams = computed(() => {
  const originalRoute = router.resolve(toSingle(route.query.redirect, '/'))
  if (!originalRoute.path.startsWith('/authorize')) return null
  const params = parseAuthorizeParams(originalRoute.query)
  if ('error' in params) {
    console.error(`Error parsing authorize params: ${params.error}`)
    return null
  }
  return params
})

const { data, error } = await useAsyncData(
  () => `login-params-${authorizeParams.value?.appId ?? ':self:'}`,
  async () => {
    const typesResp = await api.public.login.$get()
    const { types } = await typesResp.json()
    let allowedTypes = Object.keys(types)
    // Filter UI Supported types
    allowedTypes = allowedTypes.filter((type) => te(`credentials.${type}`))
    if (!authorizeParams.value) return { allowedTypes, allowRemoteAuthorize: true, app: null }
    const { appId } = authorizeParams.value
    const appResp = await api.public.app[':id'].$get({ param: { id: appId } })
    await api.checkResponse(appResp)
    const { app } = await appResp.json()
    if (app.variables['ui:allowed_login_types']) {
      const whitelist = app.variables['ui:allowed_login_types'].split(',').map((t) => t.trim())
      allowedTypes = allowedTypes.filter((type) => whitelist.includes(type))
    }
    const allowRemoteAuthorize = (app.variables['ui:allow_remote_authorize'] ?? 'true') === 'true'
    return { allowedTypes, allowRemoteAuthorize, app }
  }
)

const { status } = await useAsyncData(
  () =>
    `login-preauth-${config.value.preAuthType}-${btoa(JSON.stringify(config.value.preAuthPayload))}`,
  async () => {
    if (!config.value.preAuthType || !config.value.preAuthPayload)
      throw new Error('PreAuth Skipped')
    await api.login(config.value.preAuthType, config.value.preAuthPayload)
  }
)

function postLogin() {
  // Invalidate any existing candidate for this user since they've done a fresh login
  const currentSub = api.effectiveToken.value?.decoded.sub
  if (currentSub && api.candidateTokens.value[currentSub]) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete api.candidateTokens.value[currentSub]
    console.log(`[Login] Invalidated candidate token for ${currentSub} due to fresh login`)
  }

  const target = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  console.log(`Login finished, redirecting to ${target}`)
  router.replace(target)
}

watch(
  [data, config, status],
  ([data, config, status]) => {
    switch (status) {
      case 'error':
        if (data?.allowedTypes.includes(config?.preferType as string)) {
          type.value = config?.preferType as string
        }
        break
      case 'success':
        postLogin()
        break
    }
  },
  { immediate: true }
)

async function onQuickLogin(sub: string) {
  selectedSub.value = sub
  try {
    await switchAccount(sub, typeof route.query.redirect === 'string' ? route.query.redirect : '/')
  } catch (error) {
    console.error('Quick login failed:', error)
    selectedSub.value = null
  }
}

const {
  showRemote,
  isRemote,
  userCode,
  qrcode,
  scanned,
  startRemoteAuthorize,
  remoteAuthorizeRunning
} = useRemoteAuthorize()

const deviceUrl = new URL('/remote', location.href)

const { data: uiConfig } = useUIConfig()
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
  msg:
    previously-logged-accounts: 曾登录的账号
    login-other-account: 登录其他账号
en:
  msg:
    previously-logged-accounts: Previously logged in accounts
    login-other-account: Login with other account
</i18n>
