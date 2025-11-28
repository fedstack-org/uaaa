<template>
  <UButton
    v-if="claims"
    variant="outline"
    class="w-full justify-start"
    :disabled="disabled"
    :loading="loading"
    v-bind="$attrs"
  >
    <template #leading>
      <UAvatar
        :alt="claims.username || `User ${userId}`"
        icon="i-lucide-user"
        size="sm"
      />
    </template>
    <span class="truncate">{{ claims.username || `Unknown User (${userId})` }}</span>
  </UButton>
</template>

<script setup lang="ts">
defineProps<{
  userId?: string
  claims?: ICandidateClaims | null
  active?: boolean
  rounded?: boolean
  loading?: boolean
  disabled?: boolean
}>()
</script>
