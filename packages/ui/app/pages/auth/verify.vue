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
                icon="mdi-arrow-left"
                size="x-small"
                variant="tonal"
                color="info"
                @click="onBack"
              />
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
      <div class="d-flex items-center">
        <div class="flex-1" />
        <div class="text-subtitle-2 text-center">{{ t('msg.current-user') }}</div>
        <div class="flex-1 text-right">
          <VBtn
            v-if="data?.app"
            color="primary"
            variant="text"
            size="small"
            :text="t('actions.switch-account')"
            @click="goToSwitchPage()"
          />
        </div>
      </div>
      <VList mandatory color="info" class="mx-4 pt-0">
        <UserListItem
          active
          rounded
          :user-id="effectiveToken?.decoded.sub"
          :claims="getCandidateClaims(claims)"
        />
      </VList>
      <VDivider />
      <template v-if="data?.allowedTypes.length && te('msg.verify-hint')">
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
        <VAlert type="warning" rounded="0" variant="tonal" :text="uiConfig.verifyNotice" />
        <VDivider />
      </template>
      <VFadeTransition mode="out-in">
        <CredentialForm
          v-if="type"
          action="verify"
          :type="type"
          :target-level="+targetLevel"
          @updated="postVerify"
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
        if (data?.allowedTypes.includes(config?.preferType as any)) {
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
