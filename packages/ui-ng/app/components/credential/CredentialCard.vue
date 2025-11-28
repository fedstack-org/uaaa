<template>
  <UCard>
    <CredentialItem :credential="credential" @updated="() => emit('updated')" />
    <USeparator />

    <div class="mt-4 space-y-6">
      <!-- Primary Information -->
      <div class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-1 items-start">
          <dt class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {{ t('data') }}
          </dt>
          <dd class="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
            {{ credential.data }}
          </dd>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-1 items-start">
          <dt class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {{ t('remark') }}
          </dt>
          <dd class="text-sm text-gray-900 dark:text-gray-100">
            {{ credential.remark }}
          </dd>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-1 items-start">
          <dt class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {{ t('securityLevel') }}
          </dt>
          <dd>
            <UBadge
              :color="securityLevelColor"
              variant="subtle"
              size="sm"
            >
              {{ t(`securityLevel.${credential.securityLevel}`) }}
            </UBadge>
          </dd>
        </div>

        <div v-if="credential.disabled" class="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-1 items-start">
          <dt class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {{ t('disabled') }}
          </dt>
          <dd>
            <UBadge color="red" variant="subtle" size="sm">
              {{ t('disabledStatus') }}
            </UBadge>
          </dd>
        </div>
      </div>

      <!-- Validity Constraints (if any) -->
      <div v-if="credential.validAfter || credential.validBefore || credential.validCount" class="space-y-3">
        <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {{ t('validityConstraints') }}
        </h4>

        <div v-if="credential.validAfter" class="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-1 items-start">
          <dt class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {{ t('validAfter') }}
          </dt>
          <dd class="text-sm font-mono text-gray-900 dark:text-gray-100">
            {{ formatTimestamp(credential.validAfter) }}
          </dd>
        </div>

        <div v-if="credential.validBefore" class="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-1 items-start">
          <dt class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {{ t('validBefore') }}
          </dt>
          <dd class="text-sm font-mono text-gray-900 dark:text-gray-100">
            {{ formatTimestamp(credential.validBefore) }}
          </dd>
        </div>

        <div v-if="credential.validCount" class="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-1 items-start">
          <dt class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {{ t('validCount') }}
          </dt>
          <dd class="text-sm font-mono text-gray-900 dark:text-gray-100">
            {{ credential.validCount > 1e4 ? '>10000' : credential.validCount }}
          </dd>
        </div>
      </div>

      <!-- Timestamps -->
      <div class="space-y-3">
        <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {{ t('timestamps') }}
        </h4>

        <div class="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-1 items-start">
          <dt class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {{ t('createdAt') }}
          </dt>
          <dd class="text-sm font-mono text-gray-900 dark:text-gray-100">
            {{ formatTimestamp(credential.createdAt) }}
          </dd>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-1 items-start">
          <dt class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {{ t('updatedAt') }}
          </dt>
          <dd class="text-sm font-mono text-gray-900 dark:text-gray-100">
            {{ formatTimestamp(credential.updatedAt) }}
          </dd>
        </div>
      </div>

      <!-- Access Statistics (if any) -->
      <div v-if="credential.lastAccessedAt || credential.accessedCount" class="space-y-3">
        <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {{ t('accessStatistics') }}
        </h4>

        <div v-if="credential.lastAccessedAt" class="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-1 items-start">
          <dt class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {{ t('lastAccessedAt') }}
          </dt>
          <dd class="text-sm font-mono text-gray-900 dark:text-gray-100">
            {{ formatTimestamp(credential.lastAccessedAt) }}
          </dd>
        </div>

        <div v-if="credential.accessedCount" class="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-1 items-start">
          <dt class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {{ t('accessedCount') }}
          </dt>
          <dd class="text-sm font-mono text-gray-900 dark:text-gray-100">
            {{ credential.accessedCount }}
          </dd>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { ICredentialDoc } from '@uaaa/server'
import { formatTimestamp } from '~/utils/date'

const props = defineProps<{
  credential: ICredentialDoc
}>()
const emit = defineEmits<{
  updated: []
}>()

const { t } = useI18n()

const securityLevelColor = computed(() => {
  const level = props.credential.securityLevel
  if (level >= 3) return 'red'
  if (level >= 2) return 'orange'
  if (level >= 1) return 'yellow'
  return 'green'
})
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
  disabled: 状态
  disabledStatus: 已禁用
  securityLevel: 安全等级
  validityConstraints: 有效性限制
  timestamps: 时间信息
  accessStatistics: 访问统计
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
  disabled: Status
  disabledStatus: Disabled
  securityLevel: Security Level
  validityConstraints: Validity Constraints
  timestamps: Timestamps
  accessStatistics: Access Statistics
</i18n>
