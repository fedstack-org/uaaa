<template>
  <UCard>
    <div class="p-4 space-y-4">
      <UInput v-model="model.name" label="Name" />
      <UTextarea v-model="model.description" label="Description" />
      <UInput v-model="model.path" label="Path" />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { IAppProvidedPermission } from '@uaaa/server'

const model = defineModel<IAppProvidedPermission>({ required: true })
</script>
