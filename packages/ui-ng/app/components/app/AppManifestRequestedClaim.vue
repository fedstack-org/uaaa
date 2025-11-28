<template>
  <div class="p-4">
    <CommonListEditor
      v-model="manifest.requestedClaims"
      label="Requested Claims"
      :factory="newRequestedClaim"
    >
      <template #item="scoped">
        <AppRequestedClaimInput v-bind="scoped" />
      </template>
    </CommonListEditor>
  </div>
</template>

<script setup lang="ts">
import type { IAppManifest } from '@uaaa/server'

const manifest = defineModel<IAppManifest>({ required: true })
const newRequestedClaim = () => ({ name: '', reason: '', required: false, verified: false })
</script>
