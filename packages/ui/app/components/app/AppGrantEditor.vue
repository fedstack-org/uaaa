<template>
  <VSkeletonLoader v-if="pending" type="card" />
  <div v-else class="flex">
    <div class="flex-1">
      <VCardSubtitle class="text-center">{{ t('msg.permissions') }}</VCardSubtitle>
      <div class="px-4">
        <div v-for="(permission, i) of app.requestedPermissions" :key="'p' + i">
          <VCheckbox
            v-model="permissions[permission.perm]"
            :label="permission.perm"
            :readonly="(permission.required && permissions[permission.perm]) || readonly"
            hide-details
            color="primary"
            class="font-mono"
          />
          <div class="px-4">
            <b v-if="permission.required" class="text-red pr-1" v-text="t('msg.required')" />
            <b
              v-if="(redirectPermissionSet.has(permission.perm) || redirectOptionalPermissionSet.has(permission.perm)) && previouslyGrantedSet.has(permission.perm)"
              class="text-green pr-1"
              v-text="t('msg.perm-granted-and-used')"
            />
            <b
              v-else-if="redirectPermissionSet.has(permission.perm) && !previouslyGrantedSet.has(permission.perm)"
              class="text-orange pr-1"
              v-text="t('msg.perm-auto-granted')"
            />
            <b
              v-else-if="redirectOptionalPermissionSet.has(permission.perm) && !previouslyGrantedSet.has(permission.perm)"
              class="text-blue pr-1"
              v-text="t('msg.perm-optional-requested')"
            />
            <span class="pr-1" v-text="t('msg.will-grant-permission-for')" />
            <b v-text="permission.reason" />
          </div>
          <AppPermissionList :permission="permission.perm" />
        </div>
      </div>
    </div>
    <VDivider vertical />
    <div class="flex-1">
      <VCardSubtitle class="text-center">{{ t('msg.claims') }}</VCardSubtitle>
      <div class="px-4">
        <div v-for="(claim, i) of app.requestedClaims" :key="'c' + i">
          <VCheckbox
            v-model="claims[claim.name]"
            density="compact"
            :append-icon="claim.verified ? 'mdi-shield-check' : undefined"
            :readonly="(claim.required && claims[claim.name]) || readonly"
            hide-details
            color="primary"
            class="font-mono"
          >
            <template #label>
              <b v-text="t(`claims.${claim.name}`, [], { default: claim.name })" />
            </template>
          </VCheckbox>
          <div class="m-t-[-12px] text-sm">
            <b v-if="claim.required" class="text-red pr-1" v-text="t('msg.required')" />
            <span class="pr-1" v-text="t('msg.will-grant-claim-for')" />
            <b v-text="claim.reason" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IAppDoc } from '@uaaa/server'

const { app, readonly, fillRequired, redirectPermissions, redirectOptionalPermissions } =
  defineProps<{
    app: Pick<IAppDoc, '_id' | 'requestedClaims' | 'requestedPermissions' | 'icon' | 'name'>
    readonly?: boolean
    fillRequired?: boolean
    redirectPermissions?: string[]
    redirectOptionalPermissions?: string[]
  }>()
const { t } = useI18n()

const permissions = defineModel<Record<string, boolean>>('permissions', { default: {} })
const claims = defineModel<Record<string, boolean>>('claims', { default: {} })
const { toVerify } = useRedirect()

const redirectPermissionSet = computed(() => new Set(redirectPermissions ?? []))
const redirectOptionalPermissionSet = computed(() => new Set(redirectOptionalPermissions ?? []))
const previouslyGrantedSet = ref(new Set<string>())

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
    const perms: Record<string, boolean> = {}
    const cls: Record<string, boolean> = {}
    if (installation) {
      for (const p of installation.grantedPermissions) perms[p] = true
      for (const c of installation.grantedClaims) cls[c] = true
      previouslyGrantedSet.value = new Set(installation.grantedPermissions)
    }
    if (fillRequired) {
      for (const permission of app.requestedPermissions) {
        if (permission.required) perms[permission.perm] = true
      }
      for (const claim of app.requestedClaims) {
        if (claim.required) cls[claim.name] = true
      }
    }
    if (redirectPermissions?.length) {
      const requestedPermSet = new Set(app.requestedPermissions.map((p) => p.perm))
      for (const perm of redirectPermissions) {
        if (requestedPermSet.has(perm)) perms[perm] = true
      }
    }
    permissions.value = perms
    claims.value = cls
  },
  { immediate: true }
)

function autoEnableRedirectPermissions() {
  if (!redirectPermissions?.length) return
  const requestedPermSet = new Set(app.requestedPermissions.map((p) => p.perm))
  const updated = { ...permissions.value }
  let changed = false
  for (const perm of redirectPermissions) {
    if (requestedPermSet.has(perm) && !updated[perm]) {
      updated[perm] = true
      changed = true
    }
  }
  if (changed) {
    permissions.value = updated
  }
}

watch(() => redirectPermissions, autoEnableRedirectPermissions)
</script>
