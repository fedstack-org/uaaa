<template>
  <div>
    <div class="flex justify-between items-center py-2">
      <div class="font-medium">{{ label }}</div>
      <UButton
        icon="i-lucide-plus"
        :label="t('actions.add')"
        variant="outline"
        @click="model.push(factory())"
      />
    </div>
    <div
      v-for="(value, index) in model"
      :key="index"
      class="flex justify-between items-start pb-2 gap-2"
    >
      <div class="flex-1">
        <slot
          name="item"
          :model-value="value"
          @update:modelValue="($event: T) => (model[index] = $event)"
        />
      </div>
      <UButton
        icon="i-lucide-trash-2"
        variant="ghost"
        color="error"
        @click="model.splice(index, 1)"
      />
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
const model = defineModel<T[]>({ required: true })
defineProps<{
  label: string
  factory: () => T
}>()

const { t } = useI18n()
</script>
