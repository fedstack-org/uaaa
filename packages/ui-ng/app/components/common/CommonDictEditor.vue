<template>
  <div>
    <div class="flex justify-between items-center py-2">
      <div class="font-medium">{{ label }}</div>
    </div>
    <div
      v-for="key in Object.keys(model)"
      :key="key"
      class="flex justify-between items-start pb-2 gap-2"
    >
      <UInput :model-value="key" label="Key" readonly class="flex-1" />
      <slot
        name="item"
        :model-value="model[key]"
        @update:modelValue="($event: T) => (model[key] = $event)"
      />
      <UButton
        icon="i-lucide-trash-2"
        variant="ghost"
        color="error"
        @click="delete model[key]"
      />
    </div>
    <div class="flex justify-between items-center py-2 gap-2">
      <UInput
        v-model="newKey"
        label="New Key"
        placeholder="Enter key name"
        class="flex-1"
      />
      <UButton
        icon="i-lucide-plus"
        label="Add"
        @click="() => { model[newKey] = factory(); newKey = '' }"
      />
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
const model = defineModel<Record<string, T>>({ required: true })
defineProps<{
  label: string
  factory: () => T
}>()

const newKey = ref('')
</script>
