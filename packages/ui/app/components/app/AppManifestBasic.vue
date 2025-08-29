<template>
  <VCard flat>
    <VCardText>
      <VTextField v-model="manifest.appId" label="App ID" />
      <VTextField v-model="manifest.name" label="Name" />
      <VTextarea v-model="manifest.description" label="Description" />
      <VTextField v-model="manifest.icon" label="Icon" />
      <CommonSecurityLevelInput v-model="manifest.securityLevel" />
      <template v-if="manifest.config">
        <VCheckbox v-model="autoInstallEnabled" label="Auto Install" />
        <div v-if="autoInstallEnabled" class="ml-6">
          <VCheckbox v-model="advancedAutoInstall" label="Advanced Auto Install Configuration" />
          <div v-if="advancedAutoInstall" class="ml-6">
            <CommonListEditor 
              v-model="autoInstallConfig.grantedPermissions" 
              label="Pre-granted Permissions" 
              :factory="() => ''"
            >
              <template #item="scoped">
                <VTextField v-bind="scoped" label="Permission" />
              </template>
            </CommonListEditor>
            <CommonListEditor 
              v-model="autoInstallConfig.grantedClaims" 
              label="Pre-granted Claims" 
              :factory="() => ''"
            >
              <template #item="scoped">
                <VTextField v-bind="scoped" label="Claim" />
              </template>
            </CommonListEditor>
          </div>
        </div>
        <VCheckbox v-model="manifest.config.promoted" label="Promoted" />
      </template>
      <CommonListEditor v-model="manifest.callbackUrls" label="Callback URLs" :factory="() => ''">
        <template #item="scoped">
          <VTextField v-bind="scoped" label="Callback URL" />
        </template>
      </CommonListEditor>
    </VCardText>
  </VCard>
</template>

<script setup lang="ts">
import type { IAppManifest } from '@uaaa/server'

const manifest = defineModel<IAppManifest>({ required: true })
manifest.value.config ??= {}

const autoInstallEnabled = computed({
  get: () => !!manifest.value.config?.autoInstall,
  set: (value) => {
    if (!manifest.value.config) manifest.value.config = {}
    manifest.value.config.autoInstall = value
  }
})

const advancedAutoInstall = computed({
  get: () => typeof manifest.value.config?.autoInstall === 'object',
  set: (value) => {
    if (!manifest.value.config) manifest.value.config = {}
    if (value) {
      manifest.value.config.autoInstall = {
        grantedPermissions: [],
        grantedClaims: []
      }
    } else {
      manifest.value.config.autoInstall = true
    }
  }
})

const autoInstallConfig = computed({
  get: () => {
    const config = manifest.value.config?.autoInstall
    if (typeof config === 'object') {
      return {
        grantedPermissions: config.grantedPermissions || [],
        grantedClaims: config.grantedClaims || []
      }
    }
    return { grantedPermissions: [], grantedClaims: [] }
  },
  set: (value) => {
    if (!manifest.value.config) manifest.value.config = {}
    manifest.value.config.autoInstall = {
      grantedPermissions: value.grantedPermissions,
      grantedClaims: value.grantedClaims
    }
  }
})
</script>
