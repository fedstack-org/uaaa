<template>
  <VContainer>
    <VRow>
      <VCol cols="12">
        <VCard>
          <VCardTitle>
            <div class="flex justify-between items-center">
              <div class="flex items-center space-x-2">
                <div>
                  {{ t('msg.credentials') }}
                </div>
                <VBtn
                  prepend-icon="mdi-security"
                  class="text-none"
                  variant="tonal"
                  :color="getSecurityColor(accountSecurityLevel)"
                >
                  {{
                    t('msg.account-security-level', [t(`securityLevel.${accountSecurityLevel}`)])
                  }}
                </VBtn>
              </div>
              <div class="flex gap-2">
                <VMenu v-if="types?.length">
                  <template v-slot:activator="{ props }">
                    <VBtn :text="t('actions.add-credential')" variant="tonal" v-bind="props" />
                  </template>
                  <VList density="compact">
                    <VListItem
                      v-for="{ type, info } in types"
                      :key="type"
                      :value="type"
                      :prepend-icon="credentialIcon(type)"
                      @click="handleClick($event, info.securityLevel)"
                    >
                      <VListItemTitle>{{ t(`credentials.${type}`) }}</VListItemTitle>
                      <template #append>
                        <VChip
                          class="ml-6"
                          prepend-icon="mdi-security"
                          :color="getSecurityColor(info.securityLevel)"
                        >
                          {{ t(`securityLevel.${info.securityLevel}`) }}
                        </VChip>
                      </template>
                      <CredentialBindDialog
                        v-if="!shouldVerify(info.securityLevel)"
                        action="bind"
                        :type="type"
                        @updated="refresh()"
                      />
                    </VListItem>
                  </VList>
                </VMenu>
              </div>
            </div>
          </VCardTitle>
        </VCard>
      </VCol>
      <VCol v-for="credential in credentials" :key="credential._id" cols="12">
        <CredentialCard :credential="credential" @updated="refresh()" />
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
definePageMeta({
  level: 2
})

useHead({
  title: 'Credential Management'
})

const { t } = useI18n()
const { toVerify } = useRedirect()

const { data: credentials, refresh } = await useAsyncData(async () => {
  const resp = await api.user.credential.$get()
  const { credentials } = await resp.json()
  return credentials
})

const { data: types } = await useAsyncData(async () => {
  const resp = await api.user.credential.bind.$get()
  const { types } = await resp.json()
  return Object.entries(types).map(([type, info]) => ({ type, info }))
})

const accountSecurityLevel = computed(
  () => credentials.value?.reduce((max, cred) => Math.max(max, cred.securityLevel), 1) || 1
)
const currentSecurityLevel = computed(() => api.securityLevel.value)
const getSecurityColor = (level: number) => {
  switch (level) {
    case 4:
    case 3:
      return 'success'
    case 2:
      return 'warning'
    case 1:
    default:
      return 'error'
  }
}
const shouldVerify = (level: number) =>
  level > currentSecurityLevel.value && currentSecurityLevel.value < accountSecurityLevel.value
const handleClick = (ev: MouseEvent | KeyboardEvent, level: number) => {
  if (shouldVerify(level)) {
    toVerify(level)
  }
}
</script>
