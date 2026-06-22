<template>
  <div class="card">
    <div class="card-header">
      <span class="card-title">预设方案</span>
      <span class="badge badge-gray">{{ activeLabel }}</span>
    </div>
    <div class="preset-grid">
      <button
        v-for="p in status.presets"
        :key="p.key"
        class="preset-btn"
        :class="{ active: p.key === status.activePreset }"
        @click="doApply(p.key)"
      >
        <span class="preset-name">{{ p.label }}</span>
        <span v-if="p.key === status.activePreset" class="preset-check">&#10003;</span>
      </button>
    </div>

    <div class="divider"></div>

    <div class="import-export">
      <button class="btn btn-sm" @click="doExport">导出配置</button>
      <button class="btn btn-sm" @click="showImport = !showImport">导入配置</button>
      <button class="btn btn-sm btn-danger" @click="doReset">恢复默认</button>
    </div>

    <div v-if="showImport" class="import-section">
      <textarea
        v-model="importText"
        placeholder="粘贴 JSON 配置..."
        rows="4"
        style="width:100%;padding:8px;border:1px solid var(--c-border);border-radius:var(--radius-sm);font-family:var(--font-mono);font-size:12px;resize:vertical;"
      ></textarea>
      <button class="btn btn-sm btn-primary" style="margin-top:6px" @click="doImport">确认导入</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAgentLight } from '../composables/useAgentLight'

const { status, applyPreset, exportConfig, importConfig, resetConfig } = useAgentLight()

const showImport = ref(false)
const importText = ref('')

const activeLabel = computed(() => {
  const p = status.presets?.find(p => p.key === status.activePreset)
  return p?.label || status.activePreset
})

async function doApply(name) {
  await applyPreset(name)
}

async function doExport() {
  const json = await exportConfig()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'agent-light-config.json'
  a.click()
  URL.revokeObjectURL(url)
}

async function doImport() {
  if (!importText.value.trim()) return
  const result = await importConfig(importText.value)
  if (result.success) {
    showImport.value = false
    importText.value = ''
  } else {
    alert('导入失败: ' + result.error)
  }
}

async function doReset() {
  if (confirm('确定要恢复默认配置吗？所有自定义设置将丢失。')) {
    await resetConfig()
  }
}
</script>

<style scoped>
.preset-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.preset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  color: var(--c-text);
}

.preset-btn:hover {
  background: #f5f5f0;
}

.preset-btn.active {
  border-color: var(--c-accent);
  background: var(--c-accent-bg);
  color: var(--c-accent);
}

.preset-check {
  font-size: 14px;
  color: var(--c-accent);
}

.import-export {
  display: flex;
  gap: 8px;
}

.import-section {
  margin-top: 10px;
}
</style>
