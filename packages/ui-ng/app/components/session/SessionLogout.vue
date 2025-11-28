<template>
  <div v-if="status === 'pending'" class="flex justify-center p-8">
    <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin" />
  </div>
  <template v-else>
    <div class="p-4 space-y-4">
      <UAlert :color="type" :title="text" />
      <div class="grid grid-cols-2 gap-2">
        <UButton
          variant="solid"
          color="error"
          :label="t('actions.logout')"
          :loading="logoutRunning"
          :disabled="cancelRunning"
          @click="logout"
        />
        <UButton
          variant="outline"
          color="primary"
          :label="t('actions.cancel')"
          :loading="cancelRunning"
          :disabled="logoutRunning"
          @click="cancel"
        />
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
const { params } = defineProps<{
  params: ILogoutParams
}>()

const { t } = useI18n()
const { config } = useTransparentUX()

const { data, status } = await useAsyncData(async () => {
  return params.connector.preLogout(params)
})

const type = computed(() => (data.value?.trusted ? 'info' : 'warning'))
const text = computed(() => {
  if (data.value?.app) {
    if (data.value.trusted) {
      return t('msg.logout_hint', { name: data.value.app.name })
    }
    return t('msg.logout_hint_untrusted', { name: data.value.app.name })
  }
  return t('msg.logout_hint_generic')
})

const { run: logout, running: logoutRunning } = useTask(async () => {
  if (!data.value) return
  await params.connector.onLogout(data.value, params)
  return symNoToast
})

const { run: cancel, running: cancelRunning } = useTask(async () => {
  if (!data.value) return
  await params.connector.onCancel(data.value, params)
  return symNoToast
})

watch(
  config,
  ({ nonInteractive }) => {
    if (nonInteractive) {
      logout()
    }
  },
  { immediate: true }
)
</script>

<i18n>
zh-Hans:
  msg:
    logout_hint: 您已成功登出{name}。点按登出将使您也退出UAAA身份认证系统。
    logout_hint_untrusted: 您似乎刚刚登出了{name}。点按登出将使您退出UAAA身份认证系统。
    logout_hint_generic: 您正在执行登出操作。点按登出将使您退出UAAA身份认证系统。
en:
  msg:
    logout_hint: You have successfully logged out of {name}. Press Logout to log out of UAAA.
    logout_hint_untrusted: You seem to have just logged out of {name}. Press Logout to log out of UAAA.
    logout_hint_generic: You are performing a logout operation. Press Logout to log out of UAAA.
</i18n>
