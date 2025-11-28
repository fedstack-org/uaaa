<template>
  <div class="flex flex-col md:flex-row">
    <div class="md:w-48 border-r">
      <UNavigationMenu :items="items" orientation="vertical" />
    </div>
    <div class="flex-1 min-w-0">
      <div v-show="tab === 0">
        <AppManifestFile v-model="manifest" />
      </div>
      <div v-show="tab === 1">
        <AppManifestBasic v-model="manifest" />
      </div>
      <div v-show="tab === 2">
        <AppManifestProvidedPerm v-model="manifest" />
      </div>
      <div v-show="tab === 3">
        <AppManifestRequestedPerm v-model="manifest" />
      </div>
      <div v-show="tab === 4">
        <AppManifestRequestedClaim v-model="manifest" />
      </div>
      <div v-show="tab === 5">
        <AppManifestVariable v-model="manifest" />
      </div>
      <div v-show="tab === 6">
        <AppManifestSecret v-model="manifest" />
      </div>
      <div v-show="tab === 7">
        <AppManifestDelegation v-model="manifest" />
      </div>
      <div v-show="tab === 8">
        <AppManifestMisc v-model="manifest" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IAppManifest } from '@uaaa/server'

const manifest = defineModel<IAppManifest>({ required: true })
const tab = ref(0)

const items = [
  { label: 'Manifest File', icon: 'i-lucide-file', onClick: () => (tab.value = 0) },
  { label: 'Basic Info', icon: 'i-lucide-info', onClick: () => (tab.value = 1) },
  { label: 'Provided Permissions', icon: 'i-lucide-shield-check', onClick: () => (tab.value = 2) },
  { label: 'Requested Permissions', icon: 'i-lucide-shield-question', onClick: () => (tab.value = 3) },
  { label: 'Requested Claims', icon: 'i-lucide-user-check', onClick: () => (tab.value = 4) },
  { label: 'Variables', icon: 'i-lucide-variable', onClick: () => (tab.value = 5) },
  { label: 'Secrets', icon: 'i-lucide-key', onClick: () => (tab.value = 6) },
  { label: 'Delegation', icon: 'i-lucide-users', onClick: () => (tab.value = 7) },
  { label: 'Misc', icon: 'i-lucide-settings', onClick: () => (tab.value = 8) }
]
</script>
