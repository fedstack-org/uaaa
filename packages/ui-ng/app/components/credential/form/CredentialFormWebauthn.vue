<template>
  <UAlert v-if="action === 'bind' && credentialId" color="info" class="m-4">
    <template #title>{{ t('do-not-support-rebind') }}</template>
  </UAlert>
  <template v-else>
    <div v-if="action === 'bind'" class="flex justify-center p-4">
      <UCheckbox v-model="local" :label="t('msg.use-local-authenticator')" />
    </div>
    <div class="p-4">
      <UButton :label="t('verify-passkey')" variant="solid" block @click="submit()" />
    </div>
  </template>
</template>

<script setup lang="ts">
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import type { SecurityLevel } from '~/utils/api'

const props = defineProps<{
  action: 'login' | 'verify' | 'bind' | 'unbind'
  credentialId?: string
  targetLevel?: SecurityLevel
}>()
const emit = defineEmits<{
  updated: [credentialId?: string]
}>()

const { t } = useI18n()
const toast = useToast()

const local = ref(true)
const isLoading = ref(false)

async function submit() {
  if (isLoading.value) return
  isLoading.value = true

  try {
    let credentialId: string | undefined
    switch (props.action) {
      case 'login':
        // TODO: support login with webauthn
        break
      case 'verify': {
        const resp = await api.webauthn.verify.$post({
          json: {}
        })
        await api.checkResponse(resp)
        const { options } = await resp.json()
        const payload = await startAuthentication(options)
        await api.verify('webauthn', props.targetLevel ?? 0, payload)
        break
      }
      case 'bind': {
        const resp = await api.webauthn.bind.$post({
          json: { local: local.value }
        })
        await api.checkResponse(resp)
        const { options } = await resp.json()
        const payload = await startRegistration(options)
        const bindResp = await api.user.credential.bind.$put({
          json: { type: 'webauthn', payload, credentialId: props.credentialId }
        })
        await api.checkResponse(bindResp)
        const data = await bindResp.json()
        credentialId = data.credentialId
        break
      }
      case 'unbind': {
        if (!props.credentialId) throw new Error('No credentialId')
        const resp = await api.user.credential.$delete({
          json: {
            type: 'webauthn',
            payload: {},
            credentialId: props.credentialId
          }
        })
        await api.checkResponse(resp)
        break
      }
    }
    toast.add({ title: t('msg.task-succeeded'), color: 'success' })
    emit('updated', credentialId)
  } catch (err) {
    console.log(err)
    toast.add({ title: t('msg.task-failed'), color: 'error' })
  }
  isLoading.value = false
}

if (['login', 'verify'].includes(props.action)) {
  submit()
}
</script>
