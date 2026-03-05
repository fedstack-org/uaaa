<template>
  <VContainer class="flex flex-wrap items-center justify-center h-full lg:h-auto lg:pt-40!">
    <VCard class="min-w-xs lg:min-w-md">
      <VCardTitle class="d-flex flex-col items-center">
        <VIcon size="128">
          <CommonLogo variant="flat" />
        </VIcon>
        <div class="flex self-stretch items-start">
          <div class="flex-1 flex justify-start">
            <VFadeTransition mode="out-in">
              <VBtn
                v-if="type"
                icon="mdi-arrow-left"
                size="x-small"
                variant="tonal"
                color="info"
                @click="type = ''"
              />
            </VFadeTransition>
          </div>
          <div class="text-center">
            <div>{{ t('pages.auth.signin') }}</div>
            <div v-if="data?.app" class="text-body-small">{{ data.app.name }}</div>
          </div>
          <div class="flex-1 flex justify-end">
            <VBtn
              v-if="showRemote && data?.allowRemoteAuthorize"
              icon="mdi-qrcode"
              size="x-small"
              variant="text"
              color="info"
              :disabled="remoteAuthorizeRunning"
              @click="startRemoteAuthorize"
            />
          </div>
        </div>
      </VCardTitle>
      <VDivider />

      <!-- Candidate Accounts Section -->
      <VFadeTransition mode="out-in">
        <div v-if="hasCandidates && !type && !isRemote">
          <div class="text-label-large text-center mt-2">
            {{ t('msg.previously-logged-accounts') }}
          </div>
          <VList mandatory color="primary" density="compact" class="mx-4 pt-0">
            <UserListItem
              v-for="{ sub, claims } in candidateAccounts"
              :key="sub"
              :user-id="sub"
              :claims="claims"
              :loading="switchRunning && selectedSub === sub"
              :disabled="switchRunning"
              @click="onQuickLogin(sub)"
            />
          </VList>
          <VDivider />
          <div class="text-label-large text-center mt-2">
            {{ t('msg.login-other-account') }}
          </div>
        </div>
      </VFadeTransition>

      <template v-if="te('msg.login-hint')">
        <VAlert type="info" rounded="0" variant="tonal" class="whitespace-pre-line">
          {{ t('msg.login-hint') }}
        </VAlert>
        <VDivider />
      </template>
      <template v-if="uiConfig.signInNotice">
        <VAlert type="warning" rounded="0" variant="tonal" :text="uiConfig.signInNotice" />
        <VDivider />
      </template>
      <VFadeTransition mode="out-in">
        <template v-if="isRemote">
          <VSkeletonLoader v-if="!userCode" type="image" />
          <div v-else class="flex">
            <div class="text-center p-4">
              <div>{{ t('msg.scan-qrcode-to-authorize') }}</div>
              <img :src="qrcode" />
            </div>
            <VDivider vertical />
            <div class="flex-1 self-stretch flex flex-col justify-center items-center p-4">
              <div>{{ t('msg.or-visit') }}</div>
              <div class="font-mono text-blue">{{ deviceUrl }}</div>
              <div>{{ t('msg.and-type-code-below') }}</div>
              <div class="text-2xl font-mono text-red">{{ userCode }}</div>
            </div>
            <VOverlay
              v-model="scanned"
              :close-on-back="false"
              class="justify-center items-center"
              contained
            >
              <div class="text-white text-center">
                <VProgressCircular :size="48" indeterminate color="white" />
                <div class="pt-4">{{ t('msg.scanned') }}</div>
              </div>
            </VOverlay>
          </div>
        </template>
        <CredentialForm v-else-if="type" action="login" :type="type" @updated="postLogin" />
        <template v-else-if="data">
          <VCardText v-if="data.allowedTypes.length" class="flex flex-col gap-2">
            <VBtn
              v-for="loginType of data.allowedTypes"
              :key="loginType"
              variant="tonal"
              class="justify-start"
              :prepend-icon="credentialIcon(loginType)"
              :text="t('msg.login-by', [t(`credentials.${loginType}`)])"
              @click="type = loginType"
            />
          </VCardText>
          <VAlert v-else type="error" :title="t('msg.no-login-methods')" />
        </template>
        <VAlert v-else-if="error" type="error" :text="error.message" />
      </VFadeTransition>
    </VCard>
  </VContainer>
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
