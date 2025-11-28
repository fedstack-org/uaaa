<template>
  <UAlert v-if="action === 'login'" color="info" class="m-4">
    <template #title>{{ t('do-not-support-login') }}</template>
  </UAlert>
  <template v-else-if="action === 'verify'">
    <div class="flex flex-col gap-4 p-4">
      <UInput
        v-model="code"
        :label="t('msg.otp-code')"
        placeholder="000000"
        maxlength="6"
        class="text-center text-2xl tracking-widest font-mono"
      />
      <UButton variant="solid" :label="t('actions.submit')" :loading="isLoading" @click="submit()" />
    </div>
  </template>
  <template v-else-if="action === 'bind'">
    <div class="flex flex-col gap-4 p-4">
      <img v-if="secret?.svgUrl" :src="secret.svgUrl" alt="QR Code" class="mx-auto" />
      <UInput
        v-model="code"
        :label="t('msg.otp-code')"
        placeholder="000000"
        maxlength="6"
        class="text-center text-2xl tracking-widest font-mono"
      />
      <UButton variant="solid" :label="t('actions.submit')" :loading="isLoading" @click="submit()" />
    </div>
  </template>
  <template v-else>
    <div class="flex flex-col gap-4 p-4">
      <UButton variant="solid" :label="t('actions.confirm')" :loading="isLoading" @click="submit()" />
    </div>
  </template>
</template>

<script setup lang="ts">
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

const code = ref('')
const { data: secret } = await useAsyncData(async () => {
  if (props.action !== 'bind') return { secret: '', url: '', svgUrl: '' }
  return generateTOTPSecretUrl()
})

const { running: isLoading, run: submit } = useTask(async () => {
  let credentialId: string | undefined
  switch (props.action) {
    case 'verify':
      await api.verify('totp', props.targetLevel ?? 0, { code: code.value })
      break
    case 'bind': {
      if (!secret.value) return
      const resp = await api.user.credential.bind.$put({
        json: {
          type: 'totp',
          payload: { secret: secret.value.secret, code: code.value },
          credentialId: props.credentialId
        }
      })
      await api.checkResponse(resp)
      const data = await resp.json()
      credentialId = data.credentialId
      clearCachedTOTPSecret()
      break
    }
    case 'unbind':
      if (!props.credentialId) throw new Error('No credentialId')
      await api.user.credential.$delete({
        json: {
          type: 'password',
          payload: {},
          credentialId: props.credentialId
        }
      })
      break
  }
  emit('updated', credentialId)
})
</script>
