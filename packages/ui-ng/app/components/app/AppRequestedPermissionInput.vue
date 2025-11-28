<template>
  <UCard>
    <div class="p-4 space-y-4">
      <UInput v-model="model.perm" label="Permission" />
      <UInput v-model="model.reason" label="Reason" />
      <UCheckbox v-model="model.required" label="Required" />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { IAppRequestedPermission } from '@uaaa/server'

const model = defineModel<IAppRequestedPermission>({ required: true })
</script>
