<template>
  <VImg v-bind="$attrs" :src="variant === 'flat' ? '/logo.svg' : '/logo.svg'" alt="UAAA Logo" />
</template>

<script setup lang="ts">
defineProps<{
  variant?: 'flat' | 'default'
}>()
</script>
