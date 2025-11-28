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
                  icon="i-lucide-arrow-left"
                  size="xs"
                  variant="outline"
                  color="primary"
                  @click="onBack"
                />
              </Transition>
            </div>
            <div class="text-center flex-1">
              <div class="text-xl font-semibold">{{ t('pages.auth.verify') }}</div>
              <div v-if="data?.app" class="text-sm text-gray-500">{{ data.app.name }}</div>
            </div>
            <div class="flex-1 flex justify-start" />
          </div>
        </div>
      </template>

      <div class="flex items-center px-4 py-2">
        <div class="flex-1" />
        <div class="text-sm font-medium">{{ t('msg.current-user') }}</div>
        <div class="flex-1 text-right">
          <UButton
            v-if="data?.app"
            color="primary"
            variant="ghost"
            size="xs"
            :label="t('actions.switch-account')"
            @click="goToSwitchPage()"
          />
        </div>
      </div>
      <div class="mx-4 mb-4">
        <UserListItem
          active
          rounded
          :user-id="effectiveToken?.decoded.sub"
          :claims="getCandidateClaims(claims)"
        />
      </div>
      <USeparator />

      <template v-if="data?.allowedTypes.length && te('msg.verify-hint')">
        <UAlert color="primary" variant="soft" class="whitespace-pre-line">
          <template #title>
            {{
              t('msg.verify-hint', {
                currentLevel: t(`securityLevel.${currentLevel}`),
                targetLevel: t(`securityLevel.${targetLevel}`)
              })
            }}
          </template>
        </UAlert>
        <USeparator />
      </template>
      <template v-if="uiConfig.verifyNotice">
        <UAlert color="warning" variant="soft" :title="uiConfig.verifyNotice" />
        <USeparator />
      </template>

      <Transition name="fade" mode="out-in">
        <CredentialForm
          v-if="type"
          action="verify"
          :type="type"
          :target-level="+targetLevel"
          @updated="postVerify"
        />
        <template v-else-if="data">
          <div v-if="data.allowedTypes.length" class="flex flex-col gap-2 p-4">
            <UButton
              v-for="item of data.allowedTypes"
              :key="item"
              variant="outline"
              class="justify-start"
              :icon="credentialIcon(item)"
              :label="t('msg.verify-by', [t(`credentials.${item}`)])"
              @click="type = item"
            />
          </div>
          <UAlert v-else color="primary" variant="soft" class="whitespace-pre-line m-4">
            <template #title>
              {{ t('msg.no-verify-methods') }}
            </template>
            <template #description>
              {{ t('msg.no-verify-methods-hint') }}
            </template>
            <template #actions>
              <UButton
                variant="solid"
                color="primary"
                :label="t('actions.goto', { target: t('pages.credential') })"
                icon="i-lucide-external-link"
                @click="navigateTo({ path: '/credential', query: { bind: targetLevel } })"
              />
            </template>
          </UAlert>
        </template>
        <UAlert v-else-if="error" color="error" :title="error.message" class="m-4" />
      </Transition>
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
  title: 'User Verify'
})

const { t, te } = useI18n()
const route = useRoute()
const router = useRouter()
const type = useRouteQuery<string>('verify_type', '')
const currentLevel = api.securityLevel
const targetLevel = useRouteQuery('targetLevel', '0')
const { config } = useTransparentUX()
const { goToSwitchPage } = useAccountSwitch()
const { effectiveToken, claims } = useAPI()
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
  () => `verify-params-${authorizeParams.value?.appId ?? ':self:'}`,
  async () => {
    const resp = await api.session.upgrade.$get({ query: { targetLevel: targetLevel.value } })
    const { types } = await resp.json()
    let allowedTypes = Object.keys(types)
    allowedTypes = allowedTypes.filter((type) => t(`credentials.${type}`) !== `credentials.${type}`)
    if (!authorizeParams.value) return { allowedTypes, app: null }
    const { appId } = authorizeParams.value
    const appResp = await api.public.app[':id'].$get({ param: { id: appId } })
    await api.checkResponse(appResp)
    const { app } = await appResp.json()
    if (app.variables['ui:allowed_verify_types']) {
      const whitelist = app.variables['ui:allowed_verify_types'].split(',').map((t) => t.trim())
      allowedTypes = allowedTypes.filter((type) => whitelist.includes(type))
    }
    return { allowedTypes, app }
  }
)

const { status } = await useAsyncData(
  () =>
    `verify-preauth-${config.value.preAuthType}-${btoa(JSON.stringify(config.value.preAuthPayload))}`,
  async () => {
    if (!config.value.preAuthType || !config.value.preAuthPayload)
      throw new Error('PreAuth Skipped')
    await api.verify(
      config.value.preAuthType,
      +targetLevel.value as SecurityLevel,
      config.value.preAuthPayload
    )
  }
)

let redirected = false

function postVerify() {
  if (redirected) return
  redirected = true
  router.replace(typeof route.query.redirect === 'string' ? route.query.redirect : '/')
}

function onBack() {
  if (type.value) {
    type.value = ''
  } else {
    router.back()
  }
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
        postVerify()
        break
    }
  },
  { immediate: true }
)

watch(
  () => api.effectiveToken.value?.decoded.level,
  (level) => {
    if ((level ?? 0) >= +targetLevel) {
      postVerify()
    }
  },
  { immediate: true }
)

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
