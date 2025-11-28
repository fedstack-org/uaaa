<template>
  <UContainer class="flex items-center justify-center min-h-screen">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="flex flex-col items-center">
          <CommonLogo class="w-32 h-32 mb-4" variant="flat" />
          <div class="text-xl font-semibold">{{ t('pages.remote-authorize') }}</div>
        </div>
      </template>

      <div class="p-4">
        <UAlert color="warning" class="mb-4 whitespace-pre-line">
          {{ t('msg.remote-warn', { code: userCode }) }}
        </UAlert>

        <UInput
          v-model="userCode"
          :label="t('msg.user-code')"
          :disabled="remoteAuthorizeRunning"
          class="uppercase"
        />
      </div>

      <Transition name="fade" mode="out-in">
        <div v-if="connected" class="p-4 space-y-2">
          <UButton
            block
            color="success"
            variant="soft"
            icon="i-lucide-check-circle"
            :label="t('msg.remote-connected')"
            disabled
          />
          <div class="grid grid-cols-2 gap-2">
            <UButton
              variant="solid"
              color="primary"
              :label="t('actions.continue')"
              @click="doRemoteAuthorize"
            />
            <UButton
              variant="outline"
              color="error"
              :label="t('actions.cancel')"
              @click="cancelRemoteAuthorize"
            />
          </div>
        </div>
        <div v-else class="p-4">
          <UButton
            block
            variant="solid"
            color="primary"
            :label="t('msg.start-remote-authorize')"
            :disabled="!canAuthorize"
            :loading="remoteAuthorizeRunning"
            @click="startRemoteAuthorize"
          />
        </div>
      </Transition>
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'plain',
  middleware: 'verifyauth'
})

useHead({
  title: 'Remote Authorize'
})

const { t } = useI18n()
const {
  userCode,
  connected,
  canAuthorize,
  startRemoteAuthorize,
  remoteAuthorizeRunning,
  userCodeRules,
  doRemoteAuthorize,
  cancelRemoteAuthorize
} = useRemoteAuthorizeUser()
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
