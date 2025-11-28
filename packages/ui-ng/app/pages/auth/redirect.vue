<template>
  <UContainer class="flex items-center justify-center min-h-screen">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="text-xl font-semibold text-center">{{ t('pages.auth.redirect') }}</div>
      </template>
      <UAlert color="primary">
        <template #title>{{ t('msg.redirecting') }}</template>
      </UAlert>
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'plain'
})
useHead({
  title: 'Redirect Callback'
})

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authRedirect = useLocalStorage('authRedirect', '')

onMounted(() => {
  const value = authRedirect.value
  authRedirect.value = ''
  if (value) {
    if (value === 'false') return
    const { path, query, hash } = router.resolve(value)
    router.replace({
      path,
      query: { ...query, ...route.query },
      hash
    })
  } else if (!route.query.stub) {
    router.replace('/')
  }
})
</script>
