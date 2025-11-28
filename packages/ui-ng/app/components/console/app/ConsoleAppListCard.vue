<template>
  <UCard>
    <template #header>
      <div class="flex justify-between items-center">
        <h2 class="text-xl font-semibold">{{ t('console.app-list') }}</h2>
        <ConsoleAppAddBtn @updated="refresh()" />
      </div>
    </template>

    <UTable v-if="apps" :rows="apps" :columns="columns">
      <template #_id-data="{ row }">
        <code class="text-sm">{{ row._id }}</code>
      </template>
      <template #securityLevel-data="{ row }">
        <UBadge :label="t(`securityLevel.${row.securityLevel}`)" />
      </template>
      <template #actions-data="{ row }">
        <div class="flex gap-2">
          <UButton
            icon="i-lucide-pencil"
            variant="ghost"
            size="xs"
            @click="onEdit(row)"
          />
          <UButton
            icon="i-lucide-trash-2"
            variant="ghost"
            color="error"
            size="xs"
            :loading="deleteRunning"
            @click="onDelete(row)"
          />
        </div>
      </template>
    </UTable>

    <ConsoleAppEditDialog v-model="editDialogOpen" :manifest="value" @updated="refresh()" />
  </UCard>
</template>

<script setup lang="ts">
import type { IAppDoc, IAppManifest } from '@uaaa/server'

const { t } = useI18n()

const columns = [
  { id: '_id', key: '_id', label: t('id') },
  { id: 'name', key: 'name', label: t('name') },
  { id: 'description', key: 'description', label: t('description') },
  { id: 'securityLevel', key: 'securityLevel', label: t('security-level') },
  { id: 'actions', key: 'actions', label: t('actions') }
]

const { data: apps, refresh } = await useAsyncData(async () => {
  const resp = await api.console.app.$get()
  const { apps } = await resp.json()
  return apps
})

const value = ref<IAppManifest>({} as IAppManifest)
const editDialogOpen = ref(false)

function onEdit({ _id, ...doc }: IAppDoc) {
  value.value = { appId: _id, ...doc }
  editDialogOpen.value = true
}

const { run: onDelete, running: deleteRunning } = useTask(async ({ _id }: IAppDoc) => {
  if (!confirm(t('confirm-delete'))) return symNoToast
  const resp = await api.console.app[':id'].$delete({ param: { id: _id } })
  await api.checkResponse(resp)
  refresh()
})
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
