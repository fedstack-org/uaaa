<template>
  <UDashboardNavbar>
    <template #left>
      <NuxtLink to="/" class="flex items-center gap-4 no-underline">
        <CommonLogo class="w-10 h-10" />
        <div v-if="mdAndUp" class="text-2xl font-mono font-bold">
          {{ config.public.appName }}
        </div>
      </NuxtLink>
    </template>

    <template #right>
      <UiUserMenu :dense="!mdAndUp" />
      <UiLocaleSelector v-if="!showNavIcon" />
    </template>
  </UDashboardNavbar>
</template>

<script setup lang="ts">
import { useBreakpoints } from '@vueuse/core'

const props = defineProps<{ mode?: 'authorize' | 'console' | 'plain'; console?: boolean }>()

const config = useRuntimeConfig()
const breakpoints = useBreakpoints({
  md: 768
})
const mdAndUp = breakpoints.greaterOrEqual('md')

const showNavIcon = computed(() => props.mode !== 'authorize' && props.mode !== 'plain')
</script>
