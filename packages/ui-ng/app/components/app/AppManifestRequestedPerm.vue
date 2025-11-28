<template>
  <div class="p-4">
    <CommonListEditor
      v-model="manifest.requestedPermissions"
      label="Requested Permissions"
      :factory="newRequestedPermission"
    >
      <template #item="scoped">
        <AppRequestedPermissionInput v-bind="scoped" />
      </template>
    </CommonListEditor>
  </div>
</template>

<script setup lang="ts">
import type { IAppManifest } from '@uaaa/server'

const manifest = defineModel<IAppManifest>({ required: true })
const newRequestedPermission = () => ({ perm: '', reason: '', required: false })
</script>
