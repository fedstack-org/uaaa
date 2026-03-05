<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <VSnackbarQueue
    v-model="messages"
    location="bottom end"
    :timeout="5000"
    closable
    :total-visible="3"
    display-strategy="overflow"
  >
    <template #actions="{ props: dismissProps }">
      <VBtn icon="mdi-close" size="small" variant="plain" color="white" v-bind="dismissProps" />
    </template>
  </VSnackbarQueue>
</template>

<script setup lang="ts">
useUIConfig()
const messages = useToastMessages()
</script>
