<template>
  <UCard>
    <div class="p-4 space-y-4">
      <UInput v-model="model.name" label="Name" />
      <UInput v-model="model.reason" label="Reason" />
      <UCheckbox v-model="model.required" label="Required" />
      <UCheckbox v-model="model.verified" label="Verified" />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { IAppRequestedClaim } from '@uaaa/server'

const model = defineModel<IAppRequestedClaim>({ required: true })
</script>
