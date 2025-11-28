<template>
  <UDashboardGroup>
    <UiAppNav />
    <UDashboardPanel>
      <UiAppBar />
      <div class="p-4">
        <slot />
      </div>
    </UDashboardPanel>
  </UDashboardGroup>
</template>

<script setup lang="ts">
</script>
