<template>
  <VRow>
    <VCol>
      <ConsoleUserListCard />
    </VCol>
  </VRow>
</template>

<script setup lang="ts">
const { t } = useI18n()
useHead({
  title: 'User'
})
</script>
