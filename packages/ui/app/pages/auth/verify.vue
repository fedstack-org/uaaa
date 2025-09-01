<template>
  <VContainer class="flex flex-wrap items-center justify-center h-full lg:h-auto lg:pt-40!">
    <VCard class="min-w-xs lg:min-w-md">
      <VCardTitle class="d-flex flex-col items-center">
        <VIcon size="128">
          <CommonLogo variant="flat" />
        </VIcon>
        <div class="flex self-stretch">
          <div class="flex-1 flex justify-start">
            <VFadeTransition mode="out-in">
              <VBtn icon="mdi-arrow-left" size="sm" variant="tonal" color="info" @click="onBack" />
            </VFadeTransition>
          </div>
          <div class="text-center">
            <div>{{ t('pages.auth.verify') }}</div>
            <div v-if="data?.app" class="text-caption">{{ data.app.name }}</div>
          </div>
          <div class="flex-1 flex justify-start"></div>
        </div>
      </VCardTitle>
      <VDivider />
      <template v-if="data?.allowedTypes.length">
        <VAlert type="info" rounded="0" variant="tonal" class="whitespace-pre-line">
          {{
            t('msg.verify-hint', {
              currentLevel: t(`securityLevel.${currentLevel}`),
              targetLevel: t(`securityLevel.${targetLevel}`)
            })
          }}
        </VAlert>
        <VDivider />
      </template>
      <template v-if="uiConfig.verifyNotice">
        <VDivider />
        <VAlert type="warning" rounded="0" variant="tonal" :text="uiConfig.verifyNotice" />
      </template>
      <VFadeTransition mode="out-in">
        <CredentialForm
          v-if="type"
          action="verify"
          :type="type"
          :target-level="+targetLevel"
          @updated="onUpdated"
        />
        <template v-else-if="data">
          <VCardText class="flex flex-col gap-2" v-if="data.allowedTypes.length">
            <VBtn
              v-for="item of data.allowedTypes"
              :key="item"
              variant="tonal"
              class="justify-start"
              :prepend-icon="credentialIcon(item)"
              :text="t('msg.verify-by', [t(`credentials.${item}`)])"
              @click="type = item"
            />
          </VCardText>
          <VAlert v-else type="info" variant="tonal" class="whitespace-pre-line">
            <template #title>
              {{ t('msg.no-verify-methods') }}
            </template>
            {{ t('msg.no-verify-methods-hint') }}
            <VSpacer />
            <VBtn
              :to="{ path: '/credential', query: { bind: targetLevel } }"
              variant="flat"
              color="info"
              :text="t('actions.goto', { target: t('pages.credential') })"
              prepend-icon="mdi-open-in-new"
            />
          </VAlert>
        </template>
        <VAlert v-else-if="error" type="error" :text="error.message" />
      </VFadeTransition>
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
  title: 'User Verify'
})

const { t, te } = useI18n()
const route = useRoute()
const router = useRouter()
const type = useRouteQuery<string>('verify_type', '')
const currentLevel = api.securityLevel
const targetLevel = useRouteQuery('targetLevel', '0')
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

let redirected = false

function onUpdated() {
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
  () => api.effectiveToken.value?.decoded.level,
  (level) => {
    if ((level ?? 0) >= +targetLevel) {
      onUpdated()
    }
  }
)

const { data: uiConfig } = useUIConfig()
</script>
