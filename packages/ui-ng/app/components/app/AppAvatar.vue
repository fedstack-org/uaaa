<template>
  <UTooltip :text="data?.name">
    <UAvatar
      v-bind="$attrs"
      :src="data?.icon"
      :alt="data?.name"
      :ui="{
        background: data?.icon ? undefined : stringToColor(appId)
      }"
    >
      <template v-if="data && !data.icon" #fallback>
        <span
          class="text-lg font-semibold"
          :style="{ color: contrastingColor(stringToColor(appId)) }"
        >
          {{ generateTitle(data.name) }}
        </span>
      </template>
    </UAvatar>
  </UTooltip>
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
  const code = (first[0]! + (second ? second[0]! : first[1] ?? '')).toUpperCase()
  // eslint-disable-next-line no-control-regex
  if (/[^\x01-\x7E]/.test(code)) return code[0]
  return code
}
</script>
