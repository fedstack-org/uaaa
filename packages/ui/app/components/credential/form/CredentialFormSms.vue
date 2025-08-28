<template>
  <VForm v-if="requireCode" fast-fail validate-on="submit lazy" @submit.prevent="submit">
    <VCardText>
      <p class="pb-4">{{ t('msg.sms-phone-hint') }}</p>
      <VRow no-gutters>
        <VCol>
          <VTextField
            v-model="phone"
            :prepend-inner-icon="mdAndUp ? 'mdi-phone' : ''"
            :label="t('credentials.phone')"
            :rules="phoneRules"
            density="compact"
            :disabled="sendCodeRunning"
            @keydown.enter.prevent.stop="sendCode"
          />
        </VCol>
        <VCol cols="auto" class="pl-2">
          <VBtn
            rounded="1"
            :prepend-icon="mdAndUp ? 'mdi-send' : ''"
            :loading="sendCodeRunning"
            @click="sendCode"
            block
          >
            {{ t('actions.send-otp') }}
          </VBtn>
        </VCol>
      </VRow>
      <p>{{ t('msg.sms-otp-hint') }}</p>
      <VOtpInput v-model.trim="code" />
    </VCardText>

    <VCardActions>
      <VBtn
        :disabled="code.length !== 6"
        :loading="isLoading"
        type="submit"
        color="primary"
        block
        variant="flat"
      >
        {{ t(`actions.${action}`) }}
      </VBtn>
    </VCardActions>
  </VForm>
  <VCardActions v-else>
    <VBtn :loading="isLoading" color="primary" block variant="flat" @click="submit()">
      {{ t(`actions.${action}`) }}
    </VBtn>
  </VCardActions>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import { useDisplay, type SubmitEventPromise } from 'vuetify'
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
const { mdAndUp } = useDisplay()

const requireCode = computed(() => props.action !== 'unbind')
const phone = ref('')
const code = ref('')

const phoneRules = [
  (value: string) => {
    const re = /^1[0-9]{10}$/
    if (re.test(value)) return true
    return t('hint.violate-phone-rule')
  }
]

const isLoading = ref(false)

const { run: sendCode, running: sendCodeRunning } = useTask(async () => {
  try {
    const resp = await api.sms.send.$post({ json: { phone: phone.value } })
    await api.checkResponse(resp)
    toast.success(t('hint.sms-sent'))
    return symNoToast
  } catch (err) {
    throw err
  }
})

async function submit(ev?: SubmitEventPromise) {
  isLoading.value = true
  if (ev) {
    const result = await ev
    if (!result.valid) return
  }

  try {
    let credentialId: string | undefined
    switch (props.action) {
      case 'login':
        await api.login('sms', {
          phone: phone.value,
          code: code.value
        })
        break
      case 'verify':
        await api.verify('sms', props.targetLevel ?? 0, {
          phone: phone.value,
          code: code.value
        })
        break
      case 'bind': {
        const resp = await api.user.credential.bind.$put({
          json: {
            type: 'sms',
            payload: { phone: phone.value, code: code.value },
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
            payload: { phone: phone.value, code: code.value },
            credentialId: props.credentialId
          }
        })
        if (!resp.ok) throw await api.getError(resp)
        break
      }
    }
    toast.success(t('msg.task-succeeded'))
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