<template>
  <header class="header">
    <div class="header-left">
      <div class="header-icon">
        <span class="dot dot-red"></span>
        <span class="dot dot-yellow"></span>
        <span class="dot dot-green"></span>
      </div>
      <div>
        <h1 class="header-title">Agent Light</h1>
        <p class="header-sub">AI Agent 红绿灯提醒系统</p>
      </div>
    </div>
    <div class="header-right">
      <span class="badge" :class="wsBadgeClass">{{ wsLabel }}</span>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useAgentLight } from '../composables/useAgentLight'

const { connected, status } = useAgentLight()

const wsLabel = computed(() => {
  if (connected.value) return '已连接'
  return '未连接'
})

const wsBadgeClass = computed(() => {
  return connected.value ? 'badge-green' : 'badge-gray'
})
</script>

<style scoped>
.header {
  background: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  display: flex;
  gap: 5px;
  padding: 6px 8px;
  background: #1a1a18;
  border-radius: 20px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot-red { background: #f87171; }
.dot-yellow { background: #fbbf24; }
.dot-green { background: #4ade80; }

.header-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--c-text);
  line-height: 1.2;
}

.header-sub {
  font-size: 12px;
  color: var(--c-text-hint);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
