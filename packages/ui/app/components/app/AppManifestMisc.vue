<template>
  <VCard flat>
    <VCardText>
      <VTextField v-model.number="manifest.baseSecurityLevel" label="Base security level" />
      <template v-if="manifest.openid">
        <VCheckbox v-model="manifest.openid.allowPublicClient" label="Allow public client" />
        <VCheckbox v-model="manifest.openid.defaultPublicClient" label="Default public client" />
        <VCheckbox
          v-model="manifest.openid.ignoreLocalhostCallbackPort"
          label="Ignore localhost callback port"
        />
        <CommonDictEditor
          v-if="manifest.openid.additionalClaims"
          v-model="manifest.openid.additionalClaims"
          label="Additional Claims"
          :factory="() => ''"
        >
          <template #item="scoped">
            <VTextField v-bind="scoped" label="Value" />
          </template>
        </CommonDictEditor>
        <CommonListEditor
          v-if="manifest.openid.logoutUrls"
          v-model="manifest.openid.logoutUrls"
          label="OIDC Logout URLs"
          :factory="() => ''"
        >
          <template #item="scoped">
            <VTextField v-bind="scoped" label="Logout URL" />
          </template>
        </CommonListEditor>
      </template>

      <VDivider class="my-4" />

      <VSwitch v-model="dcrEnabled" label="Enable DCR (Dynamic Client Registration)" color="primary" />
      <div v-if="dcrEnabled && manifest.dcr">
        <CommonListEditor
          v-model="manifest.dcr.softwareIds"
          label="Software IDs"
          :factory="() => ''"
        >
          <template #item="scoped">
            <VTextField v-bind="scoped" label="Software ID" />
          </template>
        </CommonListEditor>
        <CommonListEditor
          v-model="manifest.dcr.clientNames"
          label="Client Names"
          :factory="() => ''"
        >
          <template #item="scoped">
            <VTextField v-bind="scoped" label="Client Name" />
          </template>
        </CommonListEditor>
        <VTextField v-model.number="manifest.dcr.priority" label="Priority" type="number" />
      </div>
    </VCardText>
  </VCard>
</template>

<script setup lang="ts">
import type { IAppManifest } from '@uaaa/server'

const manifest = defineModel<IAppManifest>({ required: true })
manifest.value.baseSecurityLevel ??= 1
manifest.value.openid ??= {}
manifest.value.openid.additionalClaims ??= {}
manifest.value.openid.logoutUrls ??= []

const dcrEnabled = computed({
  get: () => !!manifest.value.dcr,
  set: (value: boolean) => {
    if (value) {
      manifest.value.dcr = { softwareIds: [], clientNames: [], priority: 0 }
    } else {
      manifest.value.dcr = undefined
    }
  }
})
</script>
