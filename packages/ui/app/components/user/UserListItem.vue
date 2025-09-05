<template>
  <VListItem
    v-if="claims"
    :value="userId"
    :title="claims.username ?? `Unknown User (${userId})`"
    prepend-icon="mdi-account"
  />
</template>

<script setup lang="ts">
const { userId = '', claims = {} } = defineProps<{
  userId?: string
  claims?: ICandidateClaims | null
}>()
</script>
