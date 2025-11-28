<template>
  <div class="flex items-start gap-4 p-4">
    <div class="flex-shrink-0">
      <UAvatar icon="i-lucide-key" size="md" />
    </div>
    <div class="flex-1 min-w-0">
      <div class="text-sm text-gray-500 mb-1">
        {{ t(`msg.credential-type`, [t(`credentials.${credential.type}`)]) }}
      </div>
      <div class="flex flex-wrap gap-2 text-sm">
        <span>
          <b class="pr-1">{{ t('msg.credential-id') }}</b>
          <code class="text-gray-600">{{ credential._id }}</code>
        </span>
        <span v-if="credential.userIdentifier">
          <b class="pr-1">{{ t('msg.credential-user-identifier') }}</b>
          <code class="text-gray-600">{{ credential.userIdentifier }}</code>
        </span>
        <span v-else-if="credential.globalIdentifier">
          <b class="pr-1">{{ t('msg.credential-global-identifier') }}</b>
          <code class="text-gray-600">{{ credential.globalIdentifier }}</code>
        </span>
      </div>
    </div>
    <div class="flex flex-wrap gap-2 flex-shrink-0">
      <UButton
        variant="outline"
        color="error"
        icon="i-lucide-shield-x"
        :label="t('actions.unbind')"
        @click="unbindOpen = true"
      />
      <UButton
        variant="outline"
        icon="i-lucide-shield-check"
        :label="t('actions.rebind')"
        @click="rebindOpen = true"
      />
      <UButton
        variant="outline"
        color="primary"
        icon="i-lucide-edit"
        :label="t('actions.edit-remark')"
        @click="remarkOpen = true"
      />
    </div>
  </div>

  <Teleport to="body">
    <CredentialBindDialog
      v-if="unbindOpen"
      v-model="unbindOpen"
      :id="credential._id"
      action="unbind"
      :type="credential.type"
      @updated="() => emit('updated')"
    />
    <CredentialBindDialog
      v-if="rebindOpen"
      v-model="rebindOpen"
      :id="credential._id"
      action="bind"
      :type="credential.type"
      @updated="() => emit('updated')"
    />
    <CredentialRemarkUpdateDialog
      v-if="remarkOpen"
      v-model="remarkOpen"
      :id="credential._id"
      :remark="credential.remark"
      @updated="() => emit('updated')"
    />
  </Teleport>
</template>

<script setup lang="ts">
import type { ICredentialDoc } from '@uaaa/server'

defineProps<{
  credential: ICredentialDoc
}>()
const emit = defineEmits<{
  updated: []
}>()

const { t } = useI18n()
const unbindOpen = ref(false)
const rebindOpen = ref(false)
const remarkOpen = ref(false)
</script>

<i18n>
zh-Hans:
  data: 凭据信息
  remark: 备注
  validAfter: 生效时间
  validBefore: 失效时间
  validCount: 有效次数
  createdAt: 创建时间
  updatedAt: 更新时间
  lastAccessedAt: 最后访问时间
  accessedCount: 访问次数
  disabled: 是否禁用
  securityLevel: 安全等级
en:
  data: Credential Data
  remark: Remark
  validAfter: Valid After
  validBefore: Valid Before
  validCount: Valid Count
  createdAt: Created At
  updatedAt: Updated At
  lastAccessedAt: Last Accessed At
  accessedCount: Accessed Count
  disabled: Disabled
  securityLevel: Security Level
</i18n>
