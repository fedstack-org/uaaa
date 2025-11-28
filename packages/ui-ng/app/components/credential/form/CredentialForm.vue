<template>
  <component :is="components[type]" v-if="components[type]" v-bind="$attrs" />
  <UAlert v-else color="error" :title="t('msg.unknown-credential-type')" class="m-4" />
</template>

<script setup lang="ts">
import CredentialFormEmail from './CredentialFormEmail.vue'
import CredentialFormIAAA from './CredentialFormIAAA.vue'
import CredentialFormPassword from './CredentialFormPassword.vue'
import CredentialFormSms from './CredentialFormSms.vue'
import CredentialFormWebauthn from './CredentialFormWebauthn.vue'
import CredentialFormTOTP from './CredentialFormTOTP.vue'

defineProps<{
  type: string
}>()

const { t } = useI18n()

const components: Record<string, Component> = {
  email: CredentialFormEmail,
  password: CredentialFormPassword,
  sms: CredentialFormSms,
  webauthn: CredentialFormWebauthn,
  iaaa: CredentialFormIAAA,
  totp: CredentialFormTOTP
}
</script>
