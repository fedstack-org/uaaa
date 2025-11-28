<template>
  <UButton :label="t('console.add-app')" icon="i-lucide-plus" @click="dialogOpen = true" />

  <UModal v-model="dialogOpen" :ui="{ width: 'max-w-screen-xl' }">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-plus" class="w-5 h-5" />
          <h3 class="text-lg font-semibold">{{ t('console.add-app') }}</h3>
        </div>
      </template>

      <AppManifestEditor v-model="manifest" />

      <template #footer>
        <div class="flex justify-end">
          <UButton
            variant="solid"
            color="primary"
            :label="t('actions.submit')"
            @click="onSubmit"
          />
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
import type { IAppManifest } from '@uaaa/server'
import copy from 'copy-to-clipboard'

const emit = defineEmits<{
  updated: []
}>()

const { t } = useI18n()
const toast = useToast()
const dialogOpen = ref(false)

const manifest = ref<IAppManifest>({
  appId: 'com.example.appid',
  name: 'Example App',
  version: 0,
  changelog: [],
  description: 'This is an example app',
  providedPermissions: [],
  requestedClaims: [
    { name: 'username', reason: '', required: true },
    { name: 'email', reason: '', required: true }
  ],
  requestedPermissions: [],
  callbackUrls: [],
  variables: {},
  secrets: {},
  securityLevel: 1
})

async function onSubmit() {
  const resp = await api.console.app.$post({ json: manifest.value })
  const { secret } = await resp.json()
  copy(secret)
  toast.add({ title: 'App secret copied to clipboard', color: 'info' })
  emit('updated')
  dialogOpen.value = false
}
</script>
