<template>
  <div class="status-card card">
    <div class="status-top">
      <div class="light-visual">
        <!-- 跑马灯模式：三色循环 -->
        <div v-if="isMarquee" class="marquee-display">
          <div
            v-for="(c, i) in marqueeColors"
            :key="i"
            class="marquee-dot"
            :class="{ active: marqueeAnimStep === i }"
            :style="{ backgroundColor: marqueeAnimStep === i ? c : '#e5e5e0' }"
          ></div>
        </div>
        <!-- 普通模式：单色灯 -->
        <div v-else
          class="light-circle"
          :class="lightClass"
          :style="lightStyle"
        ></div>
        <div class="light-label">{{ stateLabel }}</div>
      </div>
      <div class="status-info">
        <div class="info-row">
          <span class="info-key">当前状态</span>
          <span class="badge" :class="stateBadgeClass">{{ status.currentState }}</span>
        </div>
        <div class="info-row">
          <span class="info-key">灯光</span>
          <span class="info-val">{{ lightDesc }}</span>
        </div>
        <div v-if="isMarquee" class="info-row">
          <span class="info-key">跑马灯速度</span>
          <span class="info-val">{{ status.currentConfig?.marqueeSpeed || 300 }}ms</span>
        </div>
        <div class="info-row">
          <span class="info-key">蜂鸣器</span>
          <span class="info-val">{{ buzzerDesc }}</span>
        </div>
        <div class="info-row">
          <span class="info-key">串口</span>
          <span class="badge" :class="serialBadgeClass">{{ serialLabel }}</span>
        </div>
      </div>
    </div>
    <div class="status-actions">
      <button class="btn state-btn" :class="{ 'active-state': status.currentState === 'thinking', 'off-border': isOffState('thinking') }" :style="activeStyle('thinking')" @click="setState('thinking')">{{ buttonLabel('thinking') }}</button>
      <button class="btn state-btn" :class="{ 'active-state': status.currentState === 'waiting_for_user', 'off-border': isOffState('waiting_for_user') }" :style="activeStyle('waiting_for_user')" @click="setState('waiting_for_user')">{{ buttonLabel('waiting_for_user') }}</button>
      <button class="btn state-btn" :class="{ 'active-state': status.currentState === 'completed', 'off-border': isOffState('completed') }" :style="activeStyle('completed')" @click="setState('completed')">{{ buttonLabel('completed') }}</button>
      <button class="btn btn-danger state-btn" :class="{ 'active-state': status.currentState === 'error' }" :style="activeStyle('error')" @click="setState('error')">{{ buttonLabel('error') }}</button>
      <button class="btn state-btn has-default" :class="{ 'active-state': status.currentState === 'idle', 'off-border': isOffState('idle') }" :style="activeStyle('idle')" @click="setState('idle')">
        {{ buttonLabel('idle') }}
        <span class="default-badge">默认</span>
      </button>
      <button class="btn state-btn has-default" :class="{ 'active-state': status.currentState === 'busy', 'off-border': isOffState('busy') }" :style="activeStyle('busy')" @click="setState('busy')">
        {{ buttonLabel('busy') }}
        <span class="default-badge">默认</span>
      </button>
      <button class="btn" @click="turnOff()">关闭</button>
    </div>

    <!-- 高级设置：看门狗超时 -->
    <details class="advance-settings">
      <summary class="advance-summary">高级设置</summary>
      <div class="watchdog-row">
        <span class="watchdog-label">非终态超时自动回空闲</span>
        <span class="watchdog-val">{{ watchdogDisplay }}</span>
      </div>
      <div class="watchdog-control">
        <input
          type="range"
          min="0"
          max="10"
          step="0.5"
          v-model.number="watchdogMinutes"
          class="watchdog-range"
        />
        <div class="watchdog-marks">
          <span>关闭</span><span>10 分钟</span>
        </div>
      </div>
    </details>
  </div>
</template>

<script setup>
import { computed, ref, watch, onUnmounted } from 'vue'
import { useAgentLight } from '../composables/useAgentLight'

const { status, setState, turnOff, updateConfig } = useAgentLight()

// 看门狗设置（分钟），0 = 关闭
const watchdogMinutes = ref(3)
let saveTimer = null

// 从后端状态同步（WebSocket 推送）
watch(() => status.watchdogTimeout, (ms) => {
  if (ms != null) watchdogMinutes.value = Math.round(ms / 60000 * 10) / 10
})

// 当滑块变化，debounce 保存
watch(watchdogMinutes, (min) => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    updateConfig({ watchdogTimeout: Math.round(min * 60000) })
  }, 500)
})

const watchdogDisplay = computed(() => {
  const m = watchdogMinutes.value
  if (m <= 0) return '已关闭'
  if (m < 1) return `${Math.round(m * 60)} 秒`
  return `${m} 分钟`
})

const STATE_LABELS = {
  idle: '空闲',
  completed: '已完成',
  waiting_for_user: '等待用户',
  thinking: '思考中',
  busy: '忙碌 / 勿扰',
  error: '错误',
}

const LIGHT_COLORS = {
  green: '#4ade80',
  yellow: '#fbbf24',
  red: '#f87171',
}

// 跑马灯动画
const marqueeColors = ['#f87171', '#fbbf24', '#4ade80']
const marqueeAnimStep = ref(0)
let marqueeTimer = null

function startMarqueeAnim() {
  stopMarqueeAnim()
  const speed = status.currentConfig?.marqueeSpeed || 300
  marqueeTimer = setInterval(() => {
    marqueeAnimStep.value = (marqueeAnimStep.value + 1) % 3
  }, speed)
}

function stopMarqueeAnim() {
  if (marqueeTimer) {
    clearInterval(marqueeTimer)
    marqueeTimer = null
  }
  marqueeAnimStep.value = 0
}

// 监听状态变化，控制跑马灯动画
watch(
  () => [status.currentState, status.currentConfig?.lightMode, status.currentConfig?.marqueeSpeed],
  () => {
    if (isMarquee.value) {
      startMarqueeAnim()
    } else {
      stopMarqueeAnim()
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  stopMarqueeAnim()
})

const stateLabel = computed(() => STATE_LABELS[status.currentState] || status.currentState)

const currentLight = computed(() => status.currentConfig?.light || 'green')
const currentMode = computed(() => status.currentConfig?.lightMode || 'on')
const currentBuzzer = computed(() => status.currentConfig?.buzzer || false)

const isMarquee = computed(() => currentMode.value === 'marquee')

const lightClass = computed(() => ({
  'light-on': currentMode.value === 'on',
  'blink': currentMode.value === 'blink',
}))

const lightStyle = computed(() => ({
  backgroundColor: currentMode.value === 'off' ? '#d1d5db' : (LIGHT_COLORS[currentLight.value] || '#4ade80'),
}))

const lightDesc = computed(() => {
  const colorNames = { green: '绿灯', yellow: '黄灯', red: '红灯' }
  const modeNames = { on: '常亮', off: '关闭', blink: '闪烁', marquee: '跑马灯' }
  if (currentMode.value === 'marquee') return '跑马灯 (红→黄→绿)'
  if (currentMode.value === 'off') return '关闭'
  return `${colorNames[currentLight.value] || currentLight.value} ${modeNames[currentMode.value] || currentMode.value}`
})

const buzzerDesc = computed(() => {
  if (!currentBuzzer.value) return '关闭'
  const dur = status.currentConfig?.buzzerDuration || 0
  return dur > 0 ? `短鸣 ${dur}s` : '持续响'
})

const stateBadgeClass = computed(() => {
  const map = {
    idle: 'badge-green',
    completed: 'badge-green',
    waiting_for_user: 'badge-yellow',
    thinking: 'badge-yellow',
    busy: 'badge-red',
    error: 'badge-red',
  }
  return map[status.currentState] || 'badge-gray'
})

const serialBadgeClass = computed(() => status.serial?.isConnected ? 'badge-green' : 'badge-gray')

const serialLabel = computed(() => {
  if (status.serial?.isConnected) return status.serial.path
  return '未连接'
})

// 动态生成测试按钮标签
function buttonLabel(stateKey) {
  const stateNames = {
    idle: '空闲',
    completed: '完成',
    thinking: '思考中',
    waiting_for_user: '等待',
    busy: '忙碌',
    error: '错误',
  }
  const colorNames = { green: '绿灯', yellow: '黄灯', red: '红灯' }
  const modeNames = { on: '常亮', blink: '闪烁', marquee: '跑马灯', off: '关闭' }

  const cfg = status.allStates?.[stateKey]
  if (!cfg) return stateNames[stateKey] || stateKey

  if (cfg.lightMode === 'marquee') {
    return `跑马灯 - ${stateNames[stateKey] || stateKey}`
  }
  if (cfg.lightMode === 'off') {
    return stateNames[stateKey] || stateKey
  }
  const color = colorNames[cfg.light] || cfg.light
  return `${color} - ${stateNames[stateKey] || stateKey}`
}

function isOffState(stateKey) {
  return status.allStates?.[stateKey]?.lightMode === 'off'
}

const STATE_LIGHT_HEX = { green: '#4ade80', yellow: '#fbbf24', red: '#f87171' }

// 选中状态时，有灯的按钮边框显示对应灯色，无灯（off）显示灰色
function activeStyle(stateKey) {
  if (status.currentState !== stateKey) return {}
  const cfg = status.allStates?.[stateKey]
  if (!cfg || cfg.lightMode === 'off') {
    return { borderColor: '#9ca3af !important', boxShadow: '0 0 0 2px rgba(156, 163, 175, 0.15)' }
  }
  const color = STATE_LIGHT_HEX[cfg.light] || '#4ade80'
  return { borderColor: `${color} !important`, boxShadow: `0 0 0 2px ${color}22` }
}
</script>

<style scoped>
.status-card {
  padding: 24px;
}

.status-top {
  display: flex;
  align-items: center;
  gap: 28px;
  margin-bottom: 20px;
}

.light-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.light-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  transition: background-color 0.3s ease;
  box-shadow: 0 0 20px rgba(0,0,0,0.08);
}

.light-on {
  box-shadow: 0 0 24px currentColor;
}

/* 跑马灯展示 */
.marquee-display {
  display: flex;
  gap: 10px;
  padding: 8px 12px;
  background: #1f2937;
  border-radius: 16px;
}

.marquee-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  transition: background-color 0.15s ease;
}

.marquee-dot.active {
  box-shadow: 0 0 14px currentColor;
}

.light-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text);
}

.status-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.info-key {
  font-size: 12px;
  color: var(--c-text-muted);
  font-weight: 500;
}

.info-val {
  font-size: 13px;
  color: var(--c-text);
}

.status-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.state-btn {
  position: relative;
  border: 1px solid var(--c-border) !important;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.state-btn.active-state {
  border-width: 2px !important;
}

.state-btn.off-border.active-state {
  border-color: #9ca3af !important;
}

.has-default {
  padding-right: 36px;
}

.default-badge {
  position: absolute;
  top: -6px;
  right: -4px;
  font-size: 9px;
  background: #3b82f6;
  color: #fff;
  padding: 1px 5px;
  border-radius: 4px;
  line-height: 1.4;
  font-weight: 600;
  pointer-events: none;
}

@media (max-width: 480px) {
  .status-top {
    flex-direction: column;
    text-align: center;
  }
}

.advance-settings {
  margin-top: 16px;
  padding: 12px 16px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 10px;
  font-size: 13px;
}

.advance-summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--c-text);
  user-select: none;
}

.advance-summary:hover {
  color: #f59e0b;
}

.watchdog-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}

.watchdog-label {
  font-size: 12px;
  color: var(--c-text-muted);
}

.watchdog-val {
  font-size: 12px;
  font-weight: 600;
  color: #92400e;
  background: #fefce8;
  padding: 2px 8px;
  border-radius: 6px;
}

.watchdog-control {
  margin-top: 8px;
}

.watchdog-range {
  width: 100%;
  accent-color: #f59e0b;
}

.watchdog-marks {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--c-text-muted);
  margin-top: 2px;
}

</style>
