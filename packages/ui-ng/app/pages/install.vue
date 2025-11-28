<template>
  <UContainer>
    <div class="py-8">
      <UCard v-if="app">
        <template #header>
          <h2 class="text-xl font-semibold text-center">{{ t('msg.install-app') }}</h2>
        </template>

        <div class="flex items-center gap-4 p-4">
          <AppAvatar :app-id="app._id" :icon="app.icon" :name="app.name" class="flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-semibold">{{ app.name }}</h3>
            <p class="text-sm text-gray-500">{{ app.description }}</p>
          </div>
        </div>

        <template v-if="app.variables['ui:install_description']">
          <USeparator />
          <UAlert color="primary" variant="soft">
            <template #title>{{ app.variables['ui:install_description'] }}</template>
          </UAlert>
        </template>

        <USeparator />
        <div class="p-4">
          <h3 class="text-lg font-semibold text-center mb-4">{{ t('msg.grants') }}</h3>
          <AppGrantEditor
            v-model:claims="claims"
            v-model:permissions="permissions"
            :app="app"
            fill-required
          />
        </div>

        <template #footer>
          <div class="flex justify-center gap-2">
            <UButton
              variant="solid"
              color="primary"
              :label="t('actions.install')"
              @click="install"
            />
            <UButton variant="outline" color="error" :label="t('actions.cancel')" @click="cancel" />
          </div>
        </template>
      </UCard>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({
  level: 2,
  layout: 'authorize'
})

useHead({
  title: 'Install App'
})

const { t } = useI18n()

const appId = useRouteQuery<string>('appId', '')
const router = useRouter()
const route = useRoute()
const toast = useToast()
const permissions = ref<Record<string, boolean>>({})
const claims = ref<Record<string, boolean>>({})

const { data: app } = useApp(appId)

async function install() {
  const resp = await api.user.installation.$put({
    json: {
      appId: appId.value,
      grantedClaims: Object.entries(claims.value)
        .filter(([, v]) => v)
        .map(([k]) => k),
      grantedPermissions: Object.entries(permissions.value)
        .filter(([, v]) => v)
        .map(([k]) => k)
    }
  })
  if (resp.ok) {
    toast.add({ title: t('msg.task-succeeded'), color: 'success' })
    router.replace(typeof route.query.redirect === 'string' ? route.query.redirect : '/')
  } else {
    const err = await api.getError(resp)
    switch (err.code) {
      case 'MISSING_REQUIRED_CLAIMS':
        toast.add({ title: t('msg.missing-required-claims', [err.data.claims.join(', ')]), color: 'error' })
        break
      case 'MISSING_VERIFIED_CLAIMS':
        toast.add({ title: t('msg.missing-verified-claims', [err.data.claims.join(', ')]), color: 'error' })
        break
      case 'MISSING_REQUIRED_PERMISSIONS':
        toast.add({ title: t('msg.missing-required-permissions', [err.data.perms.join(', ')]), color: 'error' })
        break
      default:
        toast.add({ title: t('msg.task-failed-with', [err.code]), color: 'error' })
    }
  }
}

function cancel() {
  router.back()
}
</script>
