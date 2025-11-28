<template>
  <UContainer>
    <div class="py-8 space-y-4">
      <UCard>
        <template #header>
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <h2 class="text-xl font-semibold">{{ t('msg.credentials') }}</h2>
              <UBadge
                :label="
                  t('msg.account-security-level', [t(`securityLevel.${accountSecurityLevel}`)])
                "
                :color="getSecurityColor(accountSecurityLevel)"
                size="lg"
              >
                <template #leading>
                  <UIcon name="i-lucide-shield" />
                </template>
              </UBadge>
            </div>
            <div class="flex gap-2">
              <UDropdownMenu v-if="types?.length" :items="dropdownItems">
                <UButton :label="t('actions.add-credential')" icon="i-lucide-plus" />
              </UDropdownMenu>
            </div>
          </div>
        </template>
      </UCard>

      <CredentialCard
        v-for="credential in credentials"
        :key="credential._id"
        :credential="credential"
        @updated="refresh()"
      />
    </div>

    <CredentialBindDialog
      v-for="{ type } in types"
      :key="type"
      v-model="bindDialogOpen[type]"
      action="bind"
      :type="type"
      @updated="refresh()"
    />
  </UContainer>
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

const bindDialogOpen = ref<Record<string, boolean>>({})

const dropdownItems = computed(() => [
  types.value?.map((item) => ({
    label: t(`credentials.${item.type}`),
    icon: credentialIcon(item.type),
    badge: {
      label: t(`securityLevel.${item.info.securityLevel}`),
      color: getSecurityColor(item.info.securityLevel)
    },
    onClick: () => {
      if (shouldVerify(item.info.securityLevel)) {
        toVerify(item.info.securityLevel)
      } else {
        bindDialogOpen.value[item.type] = true
      }
    }
  })) || []
])
</script>
