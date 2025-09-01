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
                size="sm"
                variant="tonal"
                color="info"
                @click="type = ''"
              />
            </VFadeTransition>
          </div>
          <div class="text-center">
            <div>{{ t('pages.auth.signin') }}</div>
            <div v-if="data?.app" class="text-caption">{{ data.app.name }}</div>
          </div>
          <div class="flex-1 flex justify-end">
            <VBtn
              v-if="showRemote && data?.allowRemoteAuthorize"
              icon="mdi-qrcode"
              size="sm"
              variant="text"
              color="info"
              :disabled="remoteAuthorizeRunning"
              @click="startRemoteAuthorize"
            />
          </div>
        </div>
      </VCardTitle>
      <VDivider />
      <VAlert
        v-if="te('msg.login-hint')"
        type="info"
        rounded="0"
        variant="tonal"
        class="whitespace-pre-line"
      >
        {{ t('msg.login-hint') }}
      </VAlert>
      <template v-if="uiConfig.signInNotice">
        <VDivider />
        <VAlert type="warning" rounded="0" variant="tonal" :text="uiConfig.signInNotice" />
      </template>
      <VDivider />
      <VFadeTransition mode="out-in">
        <template v-if="isRemote">
          <VSkeletonLoader type="image" v-if="!userCode" />
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
          <VCardText class="flex flex-col gap-2" v-if="data.allowedTypes.length">
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
          <VAlert type="error" :title="t('no-login-methods')" />
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

watch(
  [data, config],
  ([data, config], [oldData, oldConfig]) => {
    if (config?.preferType === oldConfig?.preferType) return
    if (data?.allowedTypes.includes(config?.preferType as any)) {
      type.value = config?.preferType as string
    }
  },
  { immediate: true }
)

function postLogin() {
  const target = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  console.log(`Login finished, redirecting to ${target}`)
  router.replace(target)
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
