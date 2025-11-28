<template>
  <UForm v-if="requireCode" :state="state" @submit="submit" class="p-4 space-y-4">
    <p class="text-sm">{{ t('msg.sms-phone-hint') }}</p>
    <div class="flex gap-2">
      <UInput
        v-model="state.phone"
        type="tel"
        :placeholder="t('credentials.phone')"
        class="flex-1"
        :disabled="sendCodeRunning"
        @keydown.enter.prevent="sendCode"
      />
      <UButton
        icon="i-lucide-send"
        :label="t('actions.send-otp')"
        :loading="sendCodeRunning"
        @click="sendCode"
      />
    </div>
    <p class="text-sm">{{ t('msg.sms-otp-hint') }}</p>
    <UInput
      v-model.trim="state.code"
      placeholder="000000"
      maxlength="6"
      class="text-center text-2xl tracking-widest font-mono"
    />
    <UButton
      type="submit"
      variant="solid"
      block
      :disabled="state.code.length !== 6"
      :loading="isLoading"
      :label="t(`actions.${action}`)"
    />
  </UForm>
  <div v-else class="p-4">
    <UButton
      :loading="isLoading"
      variant="solid"
      block
      :label="t(`actions.${action}`)"
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
const toast = useToast()
const errToast = useErrorToast()

const requireCode = computed(() => props.action !== 'unbind')
const state = reactive({
  phone: '',
  code: ''
})

const isLoading = ref(false)

const { run: sendCode, running: sendCodeRunning } = useTask(async () => {
  const resp = await api.sms.send.$post({ json: { phone: state.phone } })
  await api.checkResponse(resp)
  toast.add({ title: t('hint.sms-sent'), color: 'success' })
  return symNoToast
})

async function submit() {
  isLoading.value = true
  try {
    let credentialId: string | undefined
    switch (props.action) {
      case 'login':
        await api.login('sms', {
          phone: state.phone,
          code: state.code
        })
        break
      case 'verify':
        await api.verify('sms', props.targetLevel ?? 0, {
          phone: state.phone,
          code: state.code
        })
        break
      case 'bind': {
        const resp = await api.user.credential.bind.$put({
          json: {
            type: 'sms',
            payload: { phone: state.phone, code: state.code },
            credentialId: props.credentialId
          }
        })
        const data = await resp.json()
        credentialId = data.credentialId
        break
      }
      case 'unbind': {
        if (!props.credentialId) throw new Error('No credentialId')
        const resp = await api.user.credential.$delete({
          json: {
            type: 'sms',
            payload: { phone: state.phone, code: state.code },
            credentialId: props.credentialId
          }
        })
        if (!resp.ok) throw await api.getError(resp)
        break
      }
    }
    toast.add({ title: t('msg.task-succeeded'), color: 'success' })
    emit('updated', credentialId)
  } catch (err) {
    errToast.notify(err)
  }
  isLoading.value = false
}
</script>

<i18n>
en:
  hint:
    violate-phone-rule: Invalid phone number
    violate-code-rule: Invalid code
    sms-sent: SMS sent
    sms-send-failed: 'Failed to send SMS: {msg}'
    wrong-credentials: Wrong phone number or code
    success: Operation succeeded
zh-Hans:
  hint:
    violate-phone-rule: 手机号码无效
    violate-code-rule: 验证码无效
    sms-sent: 短信已发送
    sms-send-failed: '短信发送失败: {msg}'
    wrong-credentials: 手机号码或验证码错误
    success: 成功
</i18n>
