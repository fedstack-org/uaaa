<template>
  <VCard flat>
    <VCardText>
      <VTextField v-model.number="manifest.baseSecurityLevel" label="Base security level" />
      <template v-if="manifest.openid">
        <VCheckbox v-model="manifest.openid.allowPublicClient" label="Allow public client" />
        <VCheckbox v-model="manifest.openid.defaultPublicClient" label="Default public client" />
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
</script>
