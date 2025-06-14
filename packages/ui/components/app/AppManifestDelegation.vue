<template>
  <VCard flat>
    <VCardText>
      <VSwitch
        v-model="delegationEnabled"
        label="Enable App Delegation"
        color="primary"
        class="mb-4"
      />

      <div v-if="delegationEnabled">
        <VTextField
          v-model="delegationConfig.userId"
          label="Delegate to User ID"
          hint="The user ID to delegate authentication to"
          persistent-hint
          class="mb-4"
        />

        <CommonListEditor
          v-model="delegationConfig.requestedPermissions"
          label="Requested Permissions for Delegation"
          :factory="newRequestedPermission"
        >
          <template #item="scoped">
            <AppRequestedPermissionInput v-bind="scoped" />
          </template>
        </CommonListEditor>
      </div>
    </VCardText>
  </VCard>
</template>

<script setup lang="ts">
import type { IAppDelegationConfig, IAppManifest } from '@uaaa/server'

const manifest = defineModel<IAppManifest>({ required: true })

const delegationEnabled = computed({
  get: () => !!manifest.value.delegation,
  set: (value: boolean) => {
    if (value) {
      // Enable delegation with default values
      manifest.value.delegation = {
        userId: '',
        requestedPermissions: []
      }
    } else {
      // Disable delegation
      manifest.value.delegation = undefined
    }
  }
})

const delegationConfig = computed<IAppDelegationConfig>({
  get: () => manifest.value.delegation || { userId: '', requestedPermissions: [] },
  set: (value: IAppDelegationConfig) => {
    if (delegationEnabled.value) {
      manifest.value.delegation = value
    }
  }
})

const newRequestedPermission = () => ({ reason: '', perm: '' })
</script>
