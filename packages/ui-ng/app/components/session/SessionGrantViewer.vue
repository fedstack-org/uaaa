<template>
  <div class="flex">
    <div class="flex-1">
      <div class="text-center font-semibold mb-4">{{ t('msg.permissions') }}</div>
      <div class="px-4 space-y-2">
        <div v-for="(permission, i) of permissions" :key="i">
          <AppPermissionList :permission="permission" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  permissions: string[]
}>()

const { t } = useI18n()
</script>
