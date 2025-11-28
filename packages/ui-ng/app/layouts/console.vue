<template>
  <UiAppBar v-model="navOpen" console />
  <UiAppNav v-model="navOpen" />
  <main class="flex-1">
    <UContainer>
      <slot />
    </UContainer>
  </main>
</template>

<script setup lang="ts">
const navOpen = ref()
</script>
