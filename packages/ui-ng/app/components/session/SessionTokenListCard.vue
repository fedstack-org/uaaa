<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-key-round" class="w-5 h-5" />
        <h2 class="text-xl font-semibold">{{ t('msg.token-list') }}</h2>
      </div>
    </template>

    <UTable
      v-model:page="page"
      v-model:page-size="perPage"
      :rows="data ?? []"
      :columns="columns"
      :loading="status === 'pending'"
      :total="cachedCount"
      :page-size-options="[15, 30, 50, 100]"
    >
      <template #_id-data="{ row }">
        <div class="flex items-center gap-2">
          <code class="text-sm">{{ row._id }}</code>
          <UBadge
            v-if="effectiveTokens.includes(row._id)"
            :label="t('msg.current-session')"
            color="info"
          />
        </div>
      </template>
      <template #index-data="{ row }">
        <span class="font-mono">{{ row.index }}</span>
      </template>
      <template #securityLevel-data="{ row }">
        <UBadge :label="t(`securityLevel.${row.securityLevel}`)" />
      </template>
      <template #targetAppId-data="{ row }">
        <div class="flex gap-1">
          <AppAvatar v-for="app of row.apps" :key="app" :app-id="app" size="xs" />
        </div>
      </template>
      <template #appId-data="{ row }">
        <AppAvatar :app-id="row.appId" size="xs" />
      </template>
      <template #createdAt-data="{ row }">
        <UBadge variant="subtle" class="font-mono">
          {{ new Date(row.createdAt).toLocaleString() }}
        </UBadge>
      </template>
      <template #expiresAt-data="{ row }">
        <div class="flex gap-1 items-center">
          <UBadge variant="subtle" class="font-mono">
            {{ new Date(row.expiresAt).toLocaleString() }}
          </UBadge>
          <UBadge v-if="row.terminated" color="info" :label="t('msg.terminated')" />
          <UBadge
            v-else-if="(row.refreshExpiresAt ?? row.expiresAt) < Date.now()"
            color="success"
            :label="t('msg.expired')"
          />
          <UBadge
            v-else-if="(row.jwtExpiresAt ?? 0) < Date.now()"
            color="warning"
            :label="t('msg.inactive')"
          />
          <UBadge v-else color="warning" :label="t('msg.active')" />
        </div>
      </template>
      <template #_actions-data="{ row }">
        <UButton
          :label="t('actions.terminate')"
          variant="outline"
          color="error"
          size="xs"
          icon="i-lucide-x-circle"
          :disabled="row.terminated"
          @click="run(row._id)"
        />
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
const props = defineProps<{
  sessionId: string
}>()

const { t } = useI18n()
const columns = [
  { id: '_id', key: '_id', label: t('msg.token-id') },
  { id: 'index', key: 'index', label: t('msg.token-index') },
  { id: 'securityLevel', key: 'securityLevel', label: t('msg.security-level') },
  { id: 'targetAppId', key: 'targetAppId', label: t('msg.target-app') },
  { id: 'appId', key: 'appId', label: t('msg.client-app') },
  { id: 'createdAt', key: 'createdAt', label: t('msg.created-at') },
  { id: 'expiresAt', key: 'expiresAt', label: t('msg.expires-at') },
  { id: '_actions', key: '_actions', label: t('msg.actions') }
]

const effectiveTokens = computed(() =>
  Object.values(api.tokens.value).map((token) => token.decoded.jti)
)

const { page, perPage, data, cachedCount, status, execute } = usePagination(
  async (skip, limit, doCount) => {
    const resp = await api.user.session[':id'].token.$get({
      param: { id: props.sessionId },
      query: { skip: '' + skip, limit: '' + limit, count: doCount ? '1' : '0' }
    })
    await api.checkResponse(resp)
    const { tokens, count } = await resp.json()
    return {
      items: tokens.map((token) => ({
        ...token,
        apps: [
          ...new Set(token.permissions.map((perm) => Permission.fromCompactString(perm).appId))
        ]
      })),
      count
    }
  }
)

const { run } = useTask(async (id: string) => {
  if (!confirm(t('msg.confirm-operation'))) return symNoToast
  const resp = await api.user.session[':id'].token[':tokenId'].terminate.$post({
    param: { id: props.sessionId, tokenId: id }
  })
  await api.checkResponse(resp)
  execute()
})
</script>
