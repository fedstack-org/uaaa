<template>
  <VCard>
    <VCardTitle class="d-flex align-center">
      <div>{{ t('msg.session-list') }}</div>
    </VCardTitle>
    <VDataTableServer
      v-model:page="page"
      v-model:items-per-page="perPage"
      :headers="headers"
      :items-length="cachedCount"
      :items="data ?? []"
      :items-per-page-options="[15, 30, 50, 100]"
      :loading="status === 'pending'"
      item-value="_id"
      density="compact"
    >
      <template #[`item._id`]="{ item }">
        <code>{{ item._id }}</code>
        <VChip
          v-if="item._id === currentSession"
          size="small"
          color="info"
          :text="t('msg.current-session')"
          class="ml-2"
        />
      </template>
      <template #[`item.createdAt`]="{ item }">
        <VChip size="small" class="font-mono" :text="new Date(item.createdAt).toLocaleString()" />
      </template>
      <template #[`item.expiresAt`]="{ item }">
        <div class="flex gap-1">
          <VChip
            size="small"
            class="font-mono mr-2"
            :text="new Date(item.expiresAt).toLocaleString()"
          />
          <VChip v-if="item.terminated" size="small" color="info" :text="t('msg.terminated')" />
          <VChip
            v-else-if="item.expiresAt < Date.now()"
            size="small"
            color="success"
            :text="t('msg.expired')"
          />
          <VChip v-else size="small" color="warning" :text="t('msg.active')" />
        </div>
      </template>
      <template #[`item._apps`]="{ item }">
        <div class="flex gap-1">
          <AppAvatar v-for="app of item.authorizedApps" :key="app" size="36px" :app-id="app" />
        </div>
      </template>
      <template #[`item._actions`]="{ item }">
        <div class="flex gap-2 py-1">
          <VBtn :text="t('msg.view')" variant="tonal" :to="`/session/${item._id}`" />
          <VBtn
            :text="t('actions.terminate')"
            variant="tonal"
            color="error"
            :disabled="item.terminated"
            @click="run(item._id)"
          />
        </div>
      </template>
    </VDataTableServer>
  </VCard>
</template>

<script setup lang="ts">
const { t } = useI18n()
const headers = [
  { title: t('msg.session-id'), key: '_id', sortable: false, minWidth: '320px' },
  { title: t('msg.created-at'), key: 'createdAt', sortable: false },
  { title: t('msg.expires-at'), key: 'expiresAt', sortable: false },
  { title: t('msg.session-authorized-apps'), key: '_apps', sortable: false },
  { title: t('msg.actions'), key: '_actions', sortable: false }
] as const

const currentSession = computed(() => api.effectiveToken.value?.decoded.sid)

const { page, perPage, data, cachedCount, status, execute } = usePagination(
  async (skip, limit, doCount) => {
    const resp = await api.user.session.$get({
      query: { skip: '' + skip, limit: '' + limit, count: doCount ? '1' : '0' }
    })
    await api.checkResponse(resp)
    const { sessions, count } = await resp.json()
    return { items: sessions, count }
  }
)

const { run } = useTask(async (id: string) => {
  if (!confirm(t('msg.confirm-operation'))) return symNoToast
  const cachedSessionId = currentSession.value
  const resp = await api.user.session[':id'].terminate.$post({ param: { id } })
  await api.checkResponse(resp)
  if (id === cachedSessionId) {
    api.logout()
  } else {
    execute()
  }
})
</script>
