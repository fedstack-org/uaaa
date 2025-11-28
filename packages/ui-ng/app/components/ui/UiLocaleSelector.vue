<template>
  <UDropdownMenu :items="items">
    <UButton icon="i-lucide-languages" variant="ghost" color="neutral" />
  </UDropdownMenu>
</template>

<script setup lang="ts">
const lang = useRouteQuery('lang')
const { locale, locales, setLocale } = useI18n({ useScope: 'global' })
type Locale = typeof locale.value
const persisted = useLocalStorage<Locale>('locale', locale.value)

const items = computed(() => [
  locales.value.map((loc) => ({
    label: loc.name,
    icon: persisted.value === loc.code ? 'i-lucide-check' : undefined,
    onClick: () => {
      persisted.value = loc.code as Locale
    }
  }))
])

watch(
  () => persisted.value,
  (value) => {
    if (locales.value.some((locale) => locale.code === value)) {
      console.log(`[Locale] Changing locale to ${value}`)
      setLocale(value)
    } else {
      console.log(`[Locale] Invalid locale: ${value}, changing to ${locale.value}`)
      nextTick(() => {
        persisted.value = locale.value
      })
    }
  },
  { immediate: true }
)

if (lang.value) {
  if (
    typeof lang.value === 'string' &&
    locales.value.some((locale) => locale.code === lang.value)
  ) {
    console.log(`[Locale] Persisting locale into ${lang.value}`)
    persisted.value = lang.value as Locale
  }
  lang.value = null
}
</script>
