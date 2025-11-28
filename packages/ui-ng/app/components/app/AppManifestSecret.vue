<template>
  <div class="p-4">
    <CommonDictEditor v-model="manifest.secrets" label="Secrets" />
  </div>
</template>

<script setup lang="ts">
import type { IAppManifest } from '@uaaa/server'

const manifest = defineModel<IAppManifest>({ required: true })
</script>
