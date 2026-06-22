<template>
  <div class="card">
    <div class="card-header">
      <span class="card-title">状态自定义配置</span>
    </div>

    <div class="state-tabs">
      <button
        v-for="s in stateList"
        :key="s.key"
        class="state-tab"
        :class="{ active: activeState === s.key, 'off-border': isTabOff(s.key), 'has-default-badge': isDefaultState(s.key) }"
        :style="activeState === s.key && !isTabOff(s.key) ? { borderColor: tabColor(s.key) } : {}"
        @click="activeState = s.key"
      >
        <span
          v-if="tabColor(s.key)"
          class="state-dot"
          :style="{ backgroundColor: tabColor(s.key) }"
        ></span>
        {{ s.label }}
        <span v-if="isDefaultState(s.key)" class="default-badge">默认</span>
      </button>
    </div>

    <div v-if="currentConfig" class="config-form">
      <div class="form-row">
        <div class="form-group" style="flex:1">
          <label class="form-label">灯色</label>
          <select v-model="currentConfig.light">
            <option value="green">绿灯</option>
            <option value="yellow">黄灯</option>
            <option value="red">红灯</option>
          </select>
        </div>
        <div class="form-group" style="flex:1">
          <label class="form-label">灯光模式</label>
          <select v-model="currentConfig.lightMode">
            <option value="on">常亮</option>
            <option value="blink">闪烁</option>
            <option value="marquee">跑马灯</option>
            <option value="off">关闭</option>
          </select>
        </div>
      </div>

      <!-- 跑马灯额外设置 -->
      <div v-if="currentConfig.lightMode === 'marquee'" class="marquee-settings">
        <div class="marquee-preview">
          <div class="marquee-lights">
            <span
              v-for="(c, i) in marqueeColors"
              :key="i"
              class="marquee-bulb"
              :class="{ active: marqueeStep === i }"
              :style="{ backgroundColor: marqueeStep === i ? c : '#e5e5e0' }"
            ></span>
          </div>
          <span class="marquee-hint">红 → 黄 → 绿 循环</span>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:1">
            <label class="form-label">速度 (ms/步)</label>
            <div class="range-row">
              <input
                type="range"
                v-model.number="currentConfig.marqueeSpeed"
                min="80"
                max="1000"
                step="20"
                class="range-input"
              />
              <span class="range-val">{{ currentConfig.marqueeSpeed || 300 }}ms</span>
            </div>
            <div class="range-labels">
              <span>快</span><span>慢</span>
            </div>
          </div>
          <div class="form-group" style="flex:1">
            <label class="form-label">方向</label>
            <div class="direction-btns">
              <button
                class="dir-btn"
                :class="{ active: (currentConfig.marqueeDirection || 'forward') === 'forward' }"
                @click="currentConfig.marqueeDirection = 'forward'"
              >正向 →</button>
              <button
                class="dir-btn"
                :class="{ active: (currentConfig.marqueeDirection || 'forward') === 'reverse' }"
                @click="currentConfig.marqueeDirection = 'reverse'"
              >← 反向</button>
            </div>
          </div>
        </div>
      </div>

      <div class="form-row" style="margin-top:12px">
        <div class="form-group">
          <label class="form-label">蜂鸣器</label>
          <div class="form-row">
            <input type="checkbox" class="toggle" v-model="currentConfig.buzzer" />
            <span class="form-label">{{ currentConfig.buzzer ? '开启' : '关闭' }}</span>
          </div>
        </div>
        <div v-if="currentConfig.buzzer" class="form-group" style="width:140px">
          <label class="form-label">蜂鸣时长(秒, 0=持续)</label>
          <input type="number" v-model.number="currentConfig.buzzerDuration" min="0" max="60" step="0.1" />
        </div>
      </div>

      <button class="btn btn-primary" style="margin-top:16px" @click="doSave">保存配置</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useAgentLight } from '../composables/useAgentLight'

const { status, updateStateConfig, fetchStatus } = useAgentLight()

const stateList = [
  { key: 'completed', label: '已完成', color: '#4ade80' },
  { key: 'thinking', label: '思考中', color: '#fbbf24' },
  { key: 'waiting_for_user', label: '等待用户', color: '#fbbf24' },
  { key: 'error', label: '错误', color: '#f87171' },
  { key: 'idle', label: '空闲', color: '#4ade80' },
  { key: 'busy', label: '忙碌', color: '#f87171' },
]

const activeState = ref('idle')
const currentConfig = ref(null)

// 根据状态的实际灯光配置返回 tab 圆点颜色，灯光关闭时返回 null（不显示圆点）
const LIGHT_HEX = { green: '#4ade80', yellow: '#fbbf24', red: '#f87171' }
function tabColor(stateKey) {
  const cfg = status.allStates?.[stateKey]
  if (!cfg || cfg.lightMode === 'off') return null
  return LIGHT_HEX[cfg.light] || '#4ade80'
}

function isTabOff(stateKey) {
  return status.allStates?.[stateKey]?.lightMode === 'off'
}

const DEFAULT_STATES = new Set(['idle', 'busy'])
function isDefaultState(stateKey) {
  return DEFAULT_STATES.has(stateKey)
}

// 跑马灯预览动画
const marqueeColors = ['#f87171', '#fbbf24', '#4ade80']
const marqueeStep = ref(0)
let marqueePreviewTimer = null

function startMarqueePreview() {
  stopMarqueePreview()
  marqueePreviewTimer = setInterval(() => {
    marqueeStep.value = (marqueeStep.value + 1) % 3
  }, 400)
}

function stopMarqueePreview() {
  if (marqueePreviewTimer) {
    clearInterval(marqueePreviewTimer)
    marqueePreviewTimer = null
  }
  marqueeStep.value = 0
}

// 当切换 tab 或 allStates 变化时，同步配置
watch(
  [() => activeState.value, () => status.allStates],
  () => {
    const src = status.allStates[activeState.value]
    if (src) {
      currentConfig.value = { ...src }
      // 确保 marquee 字段存在
      if (currentConfig.value.lightMode === 'marquee') {
        currentConfig.value.marqueeSpeed = currentConfig.value.marqueeSpeed || 300
        currentConfig.value.marqueeDirection = currentConfig.value.marqueeDirection || 'forward'
        startMarqueePreview()
      } else {
        stopMarqueePreview()
      }
    }
  },
  { immediate: true }
)

// 监听 lightMode 变化，启动/停止预览
watch(
  () => currentConfig.value?.lightMode,
  (mode) => {
    if (mode === 'marquee') {
      startMarqueePreview()
    } else {
      stopMarqueePreview()
    }
  }
)

onUnmounted(() => {
  stopMarqueePreview()
})

async function doSave() {
  if (!currentConfig.value) return
  await updateStateConfig(activeState.value, currentConfig.value)
  // 保存后刷新状态，确保显示同步
  await fetchStatus()
}
</script>

<style scoped>
.state-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.state-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid var(--c-border);
  border-radius: 100px;
  background: var(--c-surface);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: var(--c-text);
  transition: all 0.15s;
  white-space: nowrap;
  font-family: var(--font-sans);
  position: relative;
}

.state-tab:hover {
  background: #f5f5f0;
}

.state-tab.active {
  background: var(--c-surface);
  border-width: 2px;
  padding: 6px 13px;
}

.state-tab.active.off-border {
  border-color: #9ca3af !important;
}

.state-tab.has-default-badge {
  padding-right: 28px;
}

.state-tab.has-default-badge.active {
  padding-right: 27px;
}

.state-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.default-badge {
  position: absolute;
  top: -7px;
  right: -4px;
  font-size: 9px;
  background: #3b82f6;
  color: #fff;
  padding: 1px 5px;
  border-radius: 4px;
  line-height: 1.4;
  font-weight: 600;
  pointer-events: none;
  white-space: nowrap;
}

.config-form {
  padding: 4px 0;
}

.marquee-settings {
  margin-top: 12px;
  padding: 14px;
  background: #fefce8;
  border: 1px solid #fde68a;
  border-radius: 10px;
}

.marquee-preview {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.marquee-lights {
  display: flex;
  gap: 8px;
}

.marquee-bulb {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  transition: background-color 0.15s ease;
  border: 2px solid #e5e5e0;
}

.marquee-bulb.active {
  box-shadow: 0 0 12px currentColor;
  border-color: transparent;
}

.marquee-hint {
  font-size: 12px;
  color: #92400e;
}

.range-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-input {
  flex: 1;
  accent-color: #f59e0b;
}

.range-val {
  font-size: 12px;
  color: #92400e;
  font-weight: 600;
  min-width: 50px;
  text-align: right;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #b45309;
  margin-top: 2px;
}

.direction-btns {
  display: flex;
  gap: 6px;
}

.dir-btn {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  background: var(--c-surface);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: var(--c-text);
  transition: all 0.15s;
  font-family: var(--font-sans);
}

.dir-btn:hover {
  background: #f5f5f0;
}

.dir-btn.active {
  background: #fbbf24;
  border-color: #f59e0b;
  color: #78350f;
}
</style>
