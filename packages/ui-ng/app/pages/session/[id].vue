<template>
  <UContainer>
    <div class="py-8">
      <SessionTokenListCard :session-id />
    </div>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({
  level: 3
})

useHead({
  title: 'Session Tokens'
})

const route = useRoute()
const sessionId = route.params.id as string
</script>
