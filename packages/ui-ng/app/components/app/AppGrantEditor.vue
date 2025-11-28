<template>
  <div v-if="pending" class="flex justify-center p-8">
    <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin" />
  </div>
  <div v-else class="grid md:grid-cols-2 gap-4 divide-x">
    <div class="px-4">
      <h3 class="text-center font-semibold mb-4">{{ t('msg.permissions') }}</h3>
      <div class="space-y-4">
        <div v-for="(permission, i) of app.requestedPermissions" :key="'p' + i" class="space-y-2">
          <UCheckbox
            v-model="permissions[permission.perm]"
            :label="permission.perm"
            :disabled="(permission.required && permissions[permission.perm]) || readonly"
            class="font-mono"
          />
          <div class="pl-6 text-sm">
            <UBadge v-if="permission.required" color="error" :label="t('msg.required')" class="mr-1" />
            <span class="text-gray-600 dark:text-gray-400">
              {{ t('msg.will-grant-permission-for') }}
            </span>
            <span class="font-semibold"> {{ permission.reason }}</span>
          </div>
          <div class="pl-6">
            <AppPermissionList :permission="permission.perm" />
          </div>
        </div>
      </div>
    </div>

    <div class="px-4">
      <h3 class="text-center font-semibold mb-4">{{ t('msg.claims') }}</h3>
      <div class="space-y-4">
        <div v-for="(claim, i) of app.requestedClaims" :key="'c' + i" class="space-y-2">
          <UCheckbox
            v-model="claims[claim.name]"
            :disabled="(claim.required && claims[claim.name]) || readonly"
            class="font-mono"
          >
            <template #label>
              <div class="flex items-center gap-2">
                <span class="font-semibold">{{
                  t(`claims.${claim.name}`, [], { default: claim.name })
                }}</span>
                <UIcon v-if="claim.verified" name="i-lucide-shield-check" class="w-4 h-4 text-success" />
              </div>
            </template>
          </UCheckbox>
          <div class="pl-6 text-sm">
            <UBadge v-if="claim.required" color="error" :label="t('msg.required')" class="mr-1" />
            <span class="text-gray-600 dark:text-gray-400">
              {{ t('msg.will-grant-claim-for') }}
            </span>
            <span class="font-semibold"> {{ claim.reason }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IAppDoc } from '@uaaa/server'

const { app, readonly, fillRequired } = defineProps<{
  app: Pick<IAppDoc, '_id' | 'requestedClaims' | 'requestedPermissions' | 'icon' | 'name'>
  readonly?: boolean
  fillRequired?: boolean
}>()

const { t } = useI18n()
const permissions = defineModel<Record<string, boolean>>('permissions', { default: {} })
const claims = defineModel<Record<string, boolean>>('claims', { default: {} })
const { toVerify } = useRedirect()

const { data: installation, pending } = useAsyncData(
  () => `app-grants-${app._id}`,
  async () => {
    try {
      const resp = await api.user.installation[':id'].$get({ param: { id: app._id } })
      await api.checkResponse(resp)
      const { installation } = await resp.json()
      return installation
    } catch (err) {
      if (isAPIError(err)) {
        switch (err.code) {
          case 'INSUFFICIENT_SECURITY_LEVEL': {
            toVerify(err.data.required)
          }
        }
      }
      throw err
    }
  }
)

watch(
  installation,
  (installation) => {
    if (installation) {
      permissions.value = Object.fromEntries(installation.grantedPermissions.map((p) => [p, true]))
      claims.value = Object.fromEntries(installation.grantedClaims.map((c) => [c, true]))
    }
    if (fillRequired) {
      for (const permission of app.requestedPermissions) {
        if (permission.required) {
          permissions.value[permission.perm] = true
        }
      }
      for (const claim of app.requestedClaims) {
        if (claim.required) {
          claims.value[claim.name] = true
        }
      }
    }
  },
  { immediate: true }
)
</script>
