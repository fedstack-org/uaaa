<template>
  <div class="p-4">
    <UButton
      :label="t('redirect-to-iaaa')"
      icon="i-lucide-building-2"
      color="error"
      block
      variant="solid"
      :loading="isLoading"
      @click="submit()"
    />
  </div>
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
const authRedirect = useLocalStorage('authRedirect', '')
const { config } = useTransparentUX()
const { getIAAAToken } = useIAAA()

const { running: isLoading, run: submit } = useTask(async () => {
  authRedirect.value = 'false'
  const token = await getIAAAToken(config.value.nonInteractive)
  let credentialId: string | undefined
  switch (props.action) {
    case 'login': {
      await api.login('iaaa', { token })
      break
    }
    case 'verify': {
      await api.verify('iaaa', props.targetLevel ?? 0, { token })
      break
    }
    case 'bind': {
      const resp = await api.user.credential.bind.$put({
        json: { type: 'iaaa', payload: { token }, credentialId: props.credentialId }
      })
      await api.checkResponse(resp)
      const data = await resp.json()
      credentialId = data.credentialId
      break
    }
    case 'unbind': {
      if (!props.credentialId) throw new Error('No credentialId')
      const resp = await api.user.credential.$delete({
        json: {
          type: 'iaaa',
          payload: {},
          credentialId: props.credentialId
        }
      })
      await api.checkResponse(resp)
      break
    }
  }
  emit('updated', credentialId)
})

onMounted(() => {
  switch (props.action) {
    case 'login':
    case 'verify':
      submit()
      break
  }
})
</script>

<i18n>
zh-Hans:
  redirect-to-iaaa: 转到北京大学统一身份认证
en:
  redirect-to-iaaa: Redirect to Peking University SSO
</i18n>
