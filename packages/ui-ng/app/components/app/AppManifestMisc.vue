<template>
  <div class="p-4 space-y-4">
    <UCheckbox v-model="manifest.allowPasswordAuth" label="Allow Password Auth" />
    <UCheckbox v-model="manifest.confidential" label="Confidential" />
    <UInput v-model="manifest.tokenTtl" label="Token TTL (seconds)" type="number" />
    <UInput v-model="manifest.refreshTokenTtl" label="Refresh Token TTL (seconds)" type="number" />
  </div>
</template>

<script setup lang="ts">
import type { IAppManifest } from '@uaaa/server'

const manifest = defineModel<IAppManifest>({ required: true })
</script>
