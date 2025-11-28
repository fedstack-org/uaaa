<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <UiAppBar mode="plain" />
    <main class="flex-1 overflow-auto">
      <slot />
    </main>
  </div>
</template>
