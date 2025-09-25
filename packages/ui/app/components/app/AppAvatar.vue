<template>
  <VTooltip :text="data?.name">
    <template #activator="{ props }">
      <VAvatar
        rounded
        v-bind="{ ...$attrs, ...props }"
        :color="data?.icon ? undefined : stringToColor(appId)"
      >
        <template v-if="data">
          <VImg v-if="data.icon" :src="data.icon" />
          <span
            v-else
            class="text-h5"
            :style="{ color: contrastingColor(stringToColor(appId)) }"
            v-text="generateTitle(data.name)"
          />
        </template>
      </VAvatar>
    </template>
  </VTooltip>
</template>

<script setup lang="ts">
const props = defineProps<{
  appId: string
  icon?: string
  name?: string
}>()

const { data } = await useAsyncData(props.appId, async () => {
  if (props.appId === api.appId.value) return { name: 'UAAA', icon: '/logo.svg' }
  if (props.icon) return { icon: props.icon, name: props.name ?? '' }
  if (props.name) return { name: props.name }
  const resp = await api.public.app[':id'].$get({ param: { id: props.appId } })
  await api.checkResponse(resp)
  const { app } = await resp.json()
  return app
})

const generateTitle = (name: string) => {
  const [first, second] = name.split(/\s+/) as [string, string?]
  const code = (first[0]! + (second ? second[0]! : (first[1] ?? ''))).toUpperCase()
  // eslint-disable-next-line no-control-regex
  if (/[^\x01-\x7E]/.test(code)) return code[0]
  return code
}
</script>
