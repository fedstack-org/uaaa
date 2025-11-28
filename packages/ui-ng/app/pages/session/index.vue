<template>
  <UContainer>
    <div class="py-8">
      <SessionListCard />
    </div>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({
  level: 3
})

useHead({
  title: 'Session Management'
})
</script>
