<template>
  <VDialog v-model="model" max-width="900" scrollable>
    <VCard>
      <VCardTitle class="d-flex align-center">
        <VIcon icon="mdi-account-details" class="mr-2" />
        {{ t('console.user-detail') }}
        <VSpacer />
        <VBtn icon="mdi-close" variant="text" @click="model = false" />
      </VCardTitle>

      <VTabs v-model="tab" grow>
        <VTab value="info">{{ t('console.user-info') }}</VTab>
        <VTab value="credentials">{{ t('console.user-credentials') }}</VTab>
        <VTab value="sessions">{{ t('console.user-sessions') }}</VTab>
        <VTab value="installations">{{ t('console.user-installations') }}</VTab>
      </VTabs>

      <VDivider />

      <VCardText style="min-height: 400px">
        <div v-if="loading" class="d-flex justify-center align-center" style="height: 300px">
          <VProgressCircular indeterminate />
        </div>

        <VTabsWindow v-else v-model="tab">
          <!-- User Info Tab -->
          <VTabsWindowItem value="info">
            <VTable v-if="user" density="compact">
              <thead>
                <tr>
                  <th>{{ t('console.claim-name') }}</th>
                  <th>{{ t('console.claim-value') }}</th>
                  <th class="text-end">{{ t('msg.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(claim, name) in user.claims" :key="name">
                  <td>
                    <code>{{ name }}</code>
                    <VChip
                      v-if="claim?.verified"
                      size="x-small"
                      color="success"
                      class="ml-1"
                      text="Verified"
                    />
                  </td>
                  <td>{{ claim?.value }}</td>
                  <td class="text-end">
                    <VBtn
                      v-if="!claim?.verified"
                      icon="mdi-pencil"
                      variant="text"
                      size="small"
                      @click="openClaimEdit(String(name), claim?.value ?? '')"
                    />
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VTabsWindowItem>

          <!-- Credentials Tab -->
          <VTabsWindowItem value="credentials">
            <div v-if="!credentials?.length" class="text-center text-medium-emphasis pa-8">
              {{ t('console.no-credentials') }}
            </div>
            <VTable v-else density="compact">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{{ t('console.credential-type') }}</th>
                  <th>{{ t('console.credential-remark') }}</th>
                  <th>{{ t('console.credential-security-level') }}</th>
                  <th>{{ t('msg.created-at') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cred of credentials" :key="cred._id">
                  <td><code class="text-caption">{{ cred._id }}</code></td>
                  <td>{{ t(`credentials.${cred.type}`, cred.type) }}</td>
                  <td>{{ cred.remark || '—' }}</td>
                  <td>{{ cred.securityLevel }}</td>
                  <td>{{ new Date(cred.createdAt).toLocaleString() }}</td>
                </tr>
              </tbody>
            </VTable>
          </VTabsWindowItem>

          <!-- Sessions Tab -->
          <VTabsWindowItem value="sessions">
            <div v-if="!sessions?.length" class="text-center text-medium-emphasis pa-8">
              {{ t('console.no-sessions') }}
            </div>
            <VTable v-else density="compact">
              <thead>
                <tr>
                  <th>{{ t('msg.session-id') }}</th>
                  <th>{{ t('msg.created-at') }}</th>
                  <th>{{ t('msg.expires-at') }}</th>
                  <th>{{ t('msg.is-disabled') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="sess of sessions" :key="sess._id">
                  <td><code class="text-caption">{{ sess._id }}</code></td>
                  <td>{{ new Date(sess.createdAt).toLocaleString() }}</td>
                  <td>{{ new Date(sess.expiresAt).toLocaleString() }}</td>
                  <td>
                    <VChip
                      size="small"
                      :color="sess.terminated ? 'default' : sess.expiresAt < Date.now() ? 'success' : 'warning'"
                      :text="sess.terminated ? t('msg.terminated') : sess.expiresAt < Date.now() ? t('msg.expired') : t('msg.active')"
                    />
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VTabsWindowItem>

          <!-- Installations Tab -->
          <VTabsWindowItem value="installations">
            <div v-if="!installations?.length" class="text-center text-medium-emphasis pa-8">
              {{ t('console.no-installations') }}
            </div>
            <VTable v-else density="compact">
              <thead>
                <tr>
                  <th>{{ t('console.installation-app') }}</th>
                  <th>{{ t('console.installation-version') }}</th>
                  <th>{{ t('console.granted-permissions') }}</th>
                  <th>{{ t('console.granted-claims') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="inst of installations" :key="inst.appId">
                  <td><code>{{ inst.appId }}</code></td>
                  <td>{{ inst.version }}</td>
                  <td>{{ inst.grantedPermissions.join(', ') || '—' }}</td>
                  <td>{{ inst.grantedClaims.join(', ') || '—' }}</td>
                </tr>
              </tbody>
            </VTable>
          </VTabsWindowItem>
        </VTabsWindow>
      </VCardText>
    </VCard>

    <ConsoleUserClaimEditDialog
      v-model="claimEditOpen"
      :user-id="props.userId"
      :claim-name="editingClaimName"
      :claim-value="editingClaimValue"
      @updated="loadUser()"
    />
  </VDialog>
</template>

<script setup lang="ts">
const props = defineProps<{
  userId: string
}>()

const emit = defineEmits<{
  updated: []
}>()

const model = defineModel<boolean>()
const { t } = useI18n()
const errToast = useErrorToast()

const tab = ref('info')
const loading = ref(false)
const user = ref<Record<string, any> | null>(null)
const credentials = ref<any[]>([])
const sessions = ref<any[]>([])
const installations = ref<any[]>([])

const claimEditOpen = ref(false)
const editingClaimName = ref('')
const editingClaimValue = ref('')

function openClaimEdit(name: string, value: string) {
  editingClaimName.value = name
  editingClaimValue.value = value
  claimEditOpen.value = true
}

async function loadUser() {
  if (!props.userId) return
  loading.value = true
  try {
    const [userResp, credResp, sessResp, instResp] = await Promise.all([
      api.console.user[':id'].$get({ param: { id: props.userId } }),
      api.console.user[':id'].credential.$get({ param: { id: props.userId } }),
      api.console.user[':id'].session.$get({
        param: { id: props.userId },
        query: { skip: '0', limit: '20', count: '0' }
      }),
      api.console.user[':id'].installation.$get({ param: { id: props.userId } })
    ])
    await Promise.all([
      api.checkResponse(userResp),
      api.checkResponse(credResp),
      api.checkResponse(sessResp),
      api.checkResponse(instResp)
    ])
    const userData = await userResp.json()
    const credData = await credResp.json()
    const sessData = await sessResp.json()
    const instData = await instResp.json()
    user.value = userData.user
    credentials.value = credData.credentials
    sessions.value = sessData.sessions
    installations.value = instData.installations
  } catch (e) {
    errToast.notify(e)
  } finally {
    loading.value = false
  }
}

watch(
  () => [model.value, props.userId],
  ([open]) => {
    if (open && props.userId) {
      tab.value = 'info'
      loadUser()
    }
  },
  { immediate: true }
)
</script>
