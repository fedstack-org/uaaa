<template>
  <VCard>
    <VCardTitle class="d-flex align-center ga-4">
      <div>{{ t('console.app-list') }}</div>
      <VSpacer />
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
      <ConsoleAppAddBtn @updated="execute()" />
    </VCardTitle>
    <VDataTableServer
      v-model:page="page"
      v-model:items-per-page="perPage"
      :items="data ?? []"
      :headers="headers"
      :items-length="cachedCount"
      :items-per-page-options="[15, 30, 50, 100]"
      :loading="status === 'pending'"
      item-value="_id"
    >
      <template #[`item._id`]="{ item }">
        <code>{{ item._id }}</code>
      </template>
      <template #[`item.disabled`]="{ item }">
        <VChip
          size="small"
          :color="item.disabled ? 'error' : 'success'"
          :text="item.disabled ? t('actions.disable') : t('msg.active')"
        />
      </template>
      <template #[`item.actions`]="{ item }">
        <div class="d-flex ga-1 py-1">
          <VBtn icon="mdi-pencil" variant="text" size="small" @click="onEdit(item)" />
          <VBtn
            v-if="item.disabled"
            icon="mdi-check-circle-outline"
            variant="text"
            size="small"
            color="success"
            :title="t('actions.enable')"
            @click="onToggle(item, true)"
          />
          <VBtn
            v-else
            icon="mdi-cancel"
            variant="text"
            size="small"
            color="warning"
            :title="t('actions.disable')"
            @click="onToggle(item, false)"
          />
          <VBtn
            icon="mdi-key-change"
            variant="text"
            size="small"
            color="info"
            :title="t('console.reset-secret')"
            @click="onResetSecret(item)"
          />
          <VBtn
            icon="mdi-delete"
            variant="text"
            size="small"
            color="error"
            @click="onDelete(item)"
          />
        </div>
      </template>
    </VDataTableServer>
    <ConsoleAppEditDialog v-model="editDialogOpen" :manifest="editManifest" @updated="execute()" />
  </VCard>
</template>

<script setup lang="ts">
import type { IAppDoc, IAppManifest } from '@uaaa/server'
import copy from 'copy-to-clipboard'

const { t } = useI18n()
const toast = useToast()
const errToast = useErrorToast()

const headers = [
  { title: 'ID', key: '_id', sortable: false },
  { title: t('name'), key: 'name', sortable: false },
  { title: t('description'), key: 'description', sortable: false },
  { title: t('security-level'), key: 'securityLevel', sortable: false, width: '100px' },
  { title: t('msg.is-disabled'), key: 'disabled', sortable: false, width: '100px' },
  { title: t('actions'), key: 'actions', align: 'end' as const, sortable: false, width: '180px' }
]

const { page, perPage, search, data, cachedCount, status, execute } = usePagination(
  async (skip, limit, doCount, extra) => {
    const resp = await api.console.app.$get({
      query: {
        skip: '' + skip,
        limit: '' + limit,
        count: doCount ? '1' : '0',
        ...(extra?.search ? { search: extra.search } : {})
      }
    })
    await api.checkResponse(resp)
    const { apps, count } = await resp.json()
    return { items: apps, count }
  }
)

const editManifest = ref<IAppManifest>({} as IAppManifest)
const editDialogOpen = ref(false)

function onEdit({ _id, ...doc }: IAppDoc) {
  editManifest.value = { appId: _id, ...doc }
  editDialogOpen.value = true
}

async function onToggle(item: IAppDoc, enable: boolean) {
  const msg = enable ? t('console.confirm-enable-app') : t('console.confirm-disable-app')
  if (!confirm(msg)) return
  try {
    if (enable) {
      const resp = await api.console.app[':id'].enable.$put({ param: { id: item._id } })
      await api.checkResponse(resp)
    } else {
      const resp = await api.console.app[':id'].disable.$put({ param: { id: item._id } })
      await api.checkResponse(resp)
    }
    toast.success(t('msg.task-succeeded'))
    execute()
  } catch (e) {
    errToast.notify(e)
  }
}

async function onResetSecret(item: IAppDoc) {
  if (!confirm(t('console.confirm-reset-secret'))) return
  try {
    const resp = await api.console.app[':id'].secret.$put({ param: { id: item._id } })
    await api.checkResponse(resp)
    const { secret } = await resp.json()
    copy(secret)
    toast.success(t('console.secret-copied'))
  } catch (e) {
    errToast.notify(e)
  }
}

async function onDelete(item: IAppDoc) {
  if (!confirm(t('confirm-delete'))) return
  try {
    const resp = await api.console.app[':id'].$delete({ param: { id: item._id } })
    await api.checkResponse(resp)
    toast.success(t('msg.task-succeeded'))
    execute()
  } catch (e) {
    errToast.notify(e)
  }
}
</script>

<i18n>
zh-Hans:
  id: ID
  name: 名称
  description: 描述
  promoted: 推荐
  security-level: 安全等级
  actions: 操作
  confirm-delete: 确认删除应用？所有用户安装将被删除。
</i18n>
