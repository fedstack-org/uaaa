<template>
  <VCard>
    <VCardTitle class="d-flex align-center ga-4">
      <div>{{ t('msg.user-list') }}</div>
      <VSpacer />
      <VSelect
        v-model="filters.disabled"
        :label="t('console.filter-status')"
        :items="statusOptions"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        style="max-width: 160px"
      />
      <VTextField
        v-model="search"
        :label="t('actions.search')"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        clearable
        hide-details
        style="max-width: 260px"
      />
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
    >
      <template #[`item._id`]="{ item }">
        <code>{{ item._id }}</code>
        <VChip
          v-if="item._id === currentUser"
          color="info"
          size="small"
          :text="t('msg.current-user')"
          class="ml-2"
        />
      </template>
      <template #[`item._username`]="{ item }">
        {{ item.claims?.username?.value }}
      </template>
      <template #[`item._email`]="{ item }">
        {{ item.claims?.email?.value }}
      </template>
      <template #[`item.disabled`]="{ item }">
        <VChip
          size="small"
          :color="item.disabled ? 'error' : 'success'"
          :text="item.disabled ? t('actions.disable') : t('msg.active')"
        />
      </template>
      <template #[`item._actions`]="{ item }">
        <div class="d-flex ga-1 py-1">
          <VBtn
            icon="mdi-eye"
            variant="text"
            size="small"
            :title="t('console.view-detail')"
            @click="openDetail(item._id)"
          />
          <VBtn
            v-if="item.disabled"
            icon="mdi-account-check"
            variant="text"
            size="small"
            color="success"
            :title="t('actions.enable')"
            @click="toggleUser(item._id, true)"
          />
          <VBtn
            v-else
            icon="mdi-account-off"
            variant="text"
            size="small"
            color="error"
            :title="t('actions.disable')"
            :disabled="item._id === currentUser"
            @click="toggleUser(item._id, false)"
          />
        </div>
      </template>
    </VDataTableServer>

    <ConsoleUserDetailDialog
      v-model="detailDialogOpen"
      :user-id="selectedUserId"
      @updated="execute()"
    />
  </VCard>
</template>

<script setup lang="ts">
const { t } = useI18n()

const headers = [
  { title: t('msg.user-id'), key: '_id', sortable: false },
  { title: t('msg.username'), key: '_username', sortable: false },
  { title: 'Email', key: '_email', sortable: false },
  { title: t('msg.is-disabled'), key: 'disabled', sortable: false, width: '120px' },
  { title: t('msg.actions'), key: '_actions', sortable: false, width: '120px' }
] as const

const statusOptions = [
  { title: t('console.all'), value: undefined },
  { title: t('console.enabled-only'), value: '0' },
  { title: t('console.disabled-only'), value: '1' }
]

const currentUser = computed(() => api.effectiveToken.value?.decoded.sub)

const { page, perPage, search, filters, data, cachedCount, status, execute } = usePagination(
  async (skip, limit, doCount, extra) => {
    const resp = await api.console.user.$get({
      query: {
        skip: '' + skip,
        limit: '' + limit,
        count: doCount ? '1' : '0',
        ...(extra?.search ? { search: extra.search } : {}),
        ...(extra?.disabled ? { disabled: extra.disabled } : {})
      }
    })
    await api.checkResponse(resp)
    const { users, count } = await resp.json()
    return { items: users, count }
  }
)

const detailDialogOpen = ref(false)
const selectedUserId = ref('')

function openDetail(id: string) {
  selectedUserId.value = id
  detailDialogOpen.value = true
}

const confirmDialogOpen = ref(false)
const confirmMessage = ref('')
const confirmAction = ref<(() => Promise<void>) | null>(null)

const toast = useToast()
const errToast = useErrorToast()

async function toggleUser(id: string, enable: boolean) {
  const msg = enable ? t('console.confirm-enable-user') : t('console.confirm-disable-user')
  if (!confirm(msg)) return
  try {
    if (enable) {
      const resp = await api.console.user[':id'].enable.$put({ param: { id } })
      await api.checkResponse(resp)
    } else {
      const resp = await api.console.user[':id'].disable.$put({ param: { id } })
      await api.checkResponse(resp)
    }
    toast.success(t('msg.task-succeeded'))
    execute()
  } catch (e) {
    errToast.notify(e)
  }
}
</script>
