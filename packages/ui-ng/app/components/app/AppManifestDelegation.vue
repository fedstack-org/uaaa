<template>
  <div class="p-4 space-y-4">
    <UCheckbox v-model="manifest.delegationEnabled" label="Delegation Enabled" />
    <template v-if="manifest.delegationEnabled">
      <UInput v-model="manifest.delegationSid" label="Delegation Session ID" />
      <CommonListEditor
        v-model="manifest.delegationScope"
        label="Delegation Scope"
        :factory="() => ''"
      >
        <template #item="scoped">
          <UInput v-bind="scoped" label="Scope" />
        </template>
      </CommonListEditor>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { IAppManifest } from '@uaaa/server'

const manifest = defineModel<IAppManifest>({ required: true })
</script>
