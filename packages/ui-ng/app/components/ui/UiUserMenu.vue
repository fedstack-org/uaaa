<template>
  <template v-if="isLoggedIn">
    <UButton
      :icon="'i-lucide-shield'"
      :label="
        dense
          ? t(`securityLevel.${effectiveToken?.decoded.level}`)
          : t('msg.current-security-level', [t(`securityLevel.${effectiveToken?.decoded.level}`)])
      "
      variant="outline"
      :color="color"
      class="mr-2"
    />

    <UDropdownMenu :items="menuItems">
      <UButton
        icon="i-lucide-user"
        :label="dense ? t('msg.user-menu') : username || t('msg.user-menu')"
        variant="outline"
        color="primary"
      />
    </UDropdownMenu>
  </template>
  <template v-else>
    <UButton
      v-if="route.path !== '/auth/signin'"
      :to="{ path: '/auth/signin', query: { redirect: route.fullPath } }"
      icon="i-lucide-log-in"
      :label="t('pages.auth.signin')"
      variant="outline"
      color="primary"
    />
  </template>
</template>

<script setup lang="ts">
defineProps<{
  dense?: boolean
}>()

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const menuItems = computed(() => [
  [
    {
      label: t('pages.setting'),
      icon: 'i-lucide-settings',
      to: '/setting'
    },
    {
      label: t('pages.auth.signout'),
      icon: 'i-lucide-log-out',
      to: '/auth/signout'
    }
  ]
])

const { effectiveToken, claims, isLoggedIn } = api
const username = computed(() => claims.value?.username?.value)
const color = computed(() => {
  switch (effectiveToken.value?.decoded.level) {
    case 4:
    case 3:
      return 'error'
    case 2:
      return 'warning'
    case 1:
    default:
      return 'primary'
  }
})

watch(
  () => effectiveToken.value,
  () => effectiveToken.value || router.replace('/auth/signin')
)
</script>
