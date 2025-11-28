<template>
  <div class="p-4 space-y-4">
    <div>
      <label class="block text-sm font-medium mb-2">Import manifest file</label>
      <input
        type="file"
        class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-600"
        :disabled="running"
        @change="handleFileChange"
      />
    </div>

    <USeparator />

    <div>
      <label class="block text-sm font-medium mb-2">Export format</label>
      <URadioGroup v-model="format" :options="formatOptions" />
    </div>

    <UButton
      label="Export manifest file"
      icon="i-lucide-download"
      @click="exportFile"
    />
  </div>
</template>

<script setup lang="ts">
import type { IAppManifest } from '@uaaa/server'
import * as confbox from 'confbox'

const manifest = defineModel<IAppManifest>({ required: true })

const formatOptions = [
  { value: 'json', label: 'JSON' },
  { value: 'jsonc', label: 'JSONC' },
  { value: 'json5', label: 'JSON5' },
  { value: 'yaml', label: 'YAML' },
  { value: 'toml', label: 'TOML' }
]

const format = ref('json')

const { run, running } = useTask(async (file: File) => {
  const ext = file.name.split('.').pop()
  const content = await file.text()
  let value: IAppManifest
  switch (ext) {
    case 'json': {
      value = confbox.parseJSON(content)
      break
    }
    case 'jsonc': {
      value = confbox.parseJSONC(content)
      break
    }
    case 'json5': {
      value = confbox.parseJSON5(content)
      break
    }
    case 'yaml':
    case 'yml': {
      value = confbox.parseYAML(content)
      break
    }
    case 'toml': {
      value = confbox.parseTOML(content)
      break
    }
    default: {
      throw new Error(`Unsupported file extension: ${ext}`)
    }
  }
  Object.assign(manifest.value, value)
})

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    run(file)
  }
}

function exportFile() {
  let value = ''
  switch (format.value) {
    case 'json': {
      value = JSON.stringify(manifest.value, null, 2)
      break
    }
    case 'jsonc': {
      value = confbox.stringifyJSONC(manifest.value)
      break
    }
    case 'json5': {
      value = confbox.stringifyJSON5(manifest.value)
      break
    }
    case 'yaml': {
      value = confbox.stringifyYAML(manifest.value)
      break
    }
    case 'toml': {
      value = confbox.stringifyTOML(manifest.value)
      break
    }
  }
  const file = new File([value], 'manifest.' + format.value, { type: 'text/plain' })
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  URL.revokeObjectURL(url)
}
</script>
