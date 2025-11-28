<template>
  <UDashboardSidebar>
    <UNavigationMenu :items="navigationItems" orientation="vertical" />

    <template #footer>
      <div class="flex-1 p-2 sm:p-3 flex items-center gap-2">
        <div class="text-xs font-mono text-gray-600 dark:text-gray-400 leading-tight">
          <div class="font-semibold">UAAA-UI</div>
          <div class="text-[10px] -mt-0.5">v{{ version }}</div>
        </div>
        <div class="flex-1" />
        <UiLocaleSelector />
      </div>
    </template>
  </UDashboardSidebar>
</template>

<script setup lang="ts">
import { version } from '~~/package.json'

const { t } = useI18n()
const { isAdmin } = api

const navigationItems = computed(() => {
  const items = [
    [
      { label: t('pages.index'), to: '/', icon: 'i-lucide-home' },
      { label: t('pages.session'), to: '/session', icon: 'i-lucide-key-round' },
      { label: t('pages.app'), to: '/app', icon: 'i-lucide-app-window' },
      { label: t('pages.credential'), to: '/credential', icon: 'i-lucide-shield-check' },
      { label: t('pages.setting'), to: '/setting', icon: 'i-lucide-settings' },
      ...(isAdmin.value
        ? [
            {
              label: t('pages.console.index'),
              icon: 'i-lucide-terminal',
              children: [
                { label: t('pages.console.user'), to: '/console/user' },
                { label: t('pages.console.app'), to: '/console/app' },
                { label: t('pages.console.setting'), to: '/console/system' }
              ]
            }
          ]
        : [])
    ]
  ]

  return items
})

console.log(
  `%cUAAA-UI-NG%cVersion%c${version}`,
  'background: #35495e; color: #fff; padding: 2px 4px; border-radius: 4px 0 0 4px',
  'background: #41b883; color: #fff; padding: 2px 4px',
  'background: #35495e; color: #fff; padding: 2px 4px; border-radius: 0 4px 4px 0'
)
</script>
