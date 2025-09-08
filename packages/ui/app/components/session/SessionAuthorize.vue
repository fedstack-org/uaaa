<template>
  <VSkeletonLoader v-if="appPending || checkPending" type="card" />
  <VAlert v-else-if="appError || checkError" type="error" :text="t('msg.bad-arguments')" />
  <VAlert v-else-if="!app" type="error" :text="t('msg.app-not-found')" />
  <template v-else>
    <VCardText>
      <VAlert v-if="params.userCode" type="warning" class="whitespace-pre-line">
        {{ t('msg.remote-warn', { code: params.userCode }) }}
      </VAlert>
      <VAlert v-else :text="t('msg.authorize-warn', { app: app.name })" />
    </VCardText>
    <VCardActions class="d-flex">
      <VBtn
        variant="tonal"
        color="primary"
        class="flex-1"
        :text="
          timerRunning
            ? t('msg.do-in-seconds', [rest, t('actions.authorize')])
            : t('actions.authorize')
        "
        :loading="running"
        @click="authorize"
      />
      <VBtn
        variant="tonal"
        color="error"
        :text="t('actions.cancel')"
        :disabled="running"
        @click="cancel"
      />
    </VCardActions>
    <template v-if="author || showGrant">
      <VDivider />
      <div class="d-flex justify-between items-center">
        <div>
          <div class="text-caption px-2">{{ author }}</div>
        </div>
        <div>
          <VDialog v-if="showGrant" activator="parent" max-width="800">
            <template v-slot:activator="{ props }">
              <VBtn
                variant="text"
                size="small"
                :text="t(`msg.show-grant`)"
                :disabled="running"
                v-bind="props"
              />
            </template>
            <template v-slot:default="{ isActive }">
              <VCard :title="t('msg.grants')">
                <AppGrantEditor :app="app" readonly />
                <VCardActions class="justify-end">
                  <VBtn 
                    variant="text" 
                    :text="t('actions.edit', [t('msg.grants')])" 
                    @click="editGrants"
                  />
                  <VBtn variant="text" :text="t('actions.close')" @click="isActive.value = false" />
                </VCardActions>
              </VCard>
            </template>
          </VDialog>
        </div>
      </div>
    </template>
  </template>
</template>

<script setup lang="ts">
const props = defineProps<{
  params: IAuthorizeParams
}>()
const { t } = useI18n()

const toast = useToast()
const route = useRoute()
const router = useRouter()
const { config, silentFail } = useTransparentUX()
const grantedPermissions = ref<string[]>([])

const { data: app, pending: appPending, error: appError } = useApp(() => props.params.appId)
const { pending: checkPending, error: checkError } = await useAsyncData(
  () => `pre-authorize-check-${props.params.type}-${app.value?._id ?? ''}`,
  async () => {
    if (!app.value) return
    await props.params.connector.preAuthorize(props.params, app.value)
  }
)
const author = computed(() => app.value?.variables['meta:author'] ?? '')
const showGrant = computed(() => app.value?.variables['ui:authorize_show_grant'] !== 'false')

const { run: authorize, running } = useTask(async () => {
  if (!app.value) {
    toast.error(t('msg.bad-arguments'))
    return symNoToast
  }
  try {
    await props.params.connector.onAuthorize(props.params, app.value)
  } catch (err) {
    if (isAPIError(err)) {
      switch (err.code) {
        case 'APP_NOT_INSTALLED':
          toast.error(t('msg.app-not-installed'))
          router.replace({
            path: '/install',
            query: {
              appId: props.params.appId,
              redirect: route.fullPath
            }
          })
          return symNoToast
      }
    }
    throw err
  }
})

function cancel() {
  if (!app.value) return
  props.params.connector.onCancel(props.params, app.value)
}

function editGrants() {
  router.push({
    path: '/install',
    query: {
      appId: props.params.appId,
      redirect: route.fullPath
    }
  })
}

const { rest, running: timerRunning } = useTimer({
  onTimeout: () => authorize()
})

onMounted(async () => {
  try {
    const resp = await api.session.try_derive.$post({
      json: {
        appId: props.params.appId,
        securityLevel: props.params.securityLevel,
        permissions: props.params.permissions,
        optionalPermissions: props.params.optionalPermissions,
        confidential: props.params.confidential,
        remote: !!props.params.userCode
      }
    })
    await api.checkResponse(resp)
    const { permissions } = await resp.json()
    grantedPermissions.value = permissions
    const parsedPermissions = permissions
      .map((perm) => Permission.fromCompactString(perm))
      .filter((perm) => perm.appId === api.appId.value)
    if (parsedPermissions.some((perm) => perm.test('/session/silent_authorize'))) {
      // start(5)
      authorize()
    }
  } catch (err) {
    if (isAPIError(err)) {
      switch (err.code) {
        case 'APP_NOT_INSTALLED':
          toast.error(t('msg.app-not-installed'))
          router.replace({
            path: '/install',
            query: {
              appId: props.params.appId,
              redirect: route.fullPath
            }
          })
          return
        case 'INSUFFICIENT_SECURITY_LEVEL':
          router.replace({
            path: '/auth/verify',
            query: { redirect: route.fullPath, targetLevel: err.data.required }
          })
          return
      }
    }
    // TODO: Handle error
    if (config.value.nonInteractive) {
      silentFail()
    }
    return
  }
})
</script>
