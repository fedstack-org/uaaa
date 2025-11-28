<template>
  <div class="flex flex-col gap-4 p-4">
    <UInput v-if="showUserId" v-model="userId" label="User ID" placeholder="Enter your user ID" />
    <UInput v-model="password" label="Password" type="password" placeholder="Enter your password" />
    <UButton variant="solid" :label="t('actions.submit')" :loading="running" @click="run()" />
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

const showUserId = computed(() => props.action === 'login')
const userId = ref('')
const password = ref('')

const { running, run } = useTask(async () => {
  let credentialId: string | undefined
  switch (props.action) {
    case 'login':
      await api.login('password', {
        id: userId.value,
        password: password.value
      })
      break
    case 'verify':
      await api.verify('password', props.targetLevel ?? 0, {
        password: password.value
      })
      break
    case 'bind': {
      const resp = await api.user.credential.bind.$put({
        json: {
          type: 'password',
          payload: { password: password.value },
          credentialId: props.credentialId
        }
      })
      const data = await resp.json()
      credentialId = data.credentialId
      break
    }
    case 'unbind':
      if (!props.credentialId) throw new Error('No credentialId')
      await api.user.credential.$delete({
        json: {
          type: 'password',
          payload: { password: password.value },
          credentialId: props.credentialId
        }
      })
      break
  }
  emit('updated', credentialId)
})
</script>
