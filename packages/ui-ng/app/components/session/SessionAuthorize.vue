<template>
  <div v-if="appPending || checkPending" class="flex justify-center p-8">
    <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin" />
  </div>
  <UAlert v-else-if="appError || checkError" color="error" :title="t('msg.bad-arguments')" />
  <UAlert v-else-if="!app" color="error" :title="t('msg.app-not-found')" />
  <template v-else>
    <div class="p-4 space-y-4">
      <UAlert v-if="params.userCode" color="warning" class="whitespace-pre-line">
        {{ t('msg.remote-warn', { code: params.userCode }) }}
      </UAlert>
      <UAlert v-else :title="t('msg.authorize-warn', { app: app.name })" />

      <div class="flex gap-2">
        <UButton
          class="flex-1"
          variant="solid"
          color="primary"
          :label="
            timerRunning
              ? t('msg.do-in-seconds', [rest, t('actions.authorize')])
              : t('actions.authorize')
          "
          :loading="running"
          @click="authorize"
        />
        <UButton
          variant="outline"
          color="error"
          :label="t('actions.cancel')"
          :disabled="running"
          @click="cancel"
        />
      </div>

      <template v-if="author || showGrant">
        <USeparator />
        <div class="flex justify-between items-center">
          <div v-if="author" class="text-sm text-gray-500">{{ author }}</div>
          <UButton
            v-if="showGrant"
            variant="ghost"
            size="xs"
            :label="t('msg.show-grant')"
            :disabled="running"
            @click="grantDialogOpen = true"
          />
        </div>
      </template>
    </div>

    <UModal v-if="showGrant" v-model="grantDialogOpen">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-shield-check" class="w-5 h-5" />
            <h3 class="text-lg font-semibold">{{ t('msg.grants') }}</h3>
          </div>
        </template>
        <AppGrantEditor :app="app" readonly />
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              variant="outline"
              :label="t('actions.edit', [t('msg.grants')])"
              @click="editGrants"
            />
            <UButton
              variant="solid"
              :label="t('actions.close')"
              @click="grantDialogOpen = false"
            />
          </div>
        </template>
      </UCard>
    </UModal>
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
const grantDialogOpen = ref(false)
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
    toast.add({ title: t('msg.bad-arguments'), color: 'error' })
    return symNoToast
  }
  try {
    await props.params.connector.onAuthorize(props.params, app.value)
    if (config.value.nonInteractive) {
      return symNoToast
    }
  } catch (err) {
    if (isAPIError(err)) {
      switch (err.code) {
        case 'APP_NOT_INSTALLED':
          toast.add({ title: t('msg.app-not-installed'), color: 'error' })
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

const tryAuthorize = async () => {
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
      authorize()
    }
  } catch (err) {
    if (isAPIError(err)) {
      switch (err.code) {
        case 'APP_NOT_INSTALLED':
          toast.add({ title: t('msg.app-not-installed'), color: 'error' })
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
    if (config.value.nonInteractive) {
      silentFail()
    }
    return
  }
}

const stopAppWatcher = watch(
  app,
  (app) => {
    if (!app) return
    stopAppWatcher()
    tryAuthorize()
  },
  { immediate: true }
)
</script>
