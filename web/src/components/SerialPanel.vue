<template>
  <div class="card">
    <div class="card-header">
      <span class="card-title">串口连接</span>
      <span class="badge" :class="status.serial?.isConnected ? 'badge-green' : 'badge-gray'">
        {{ status.serial?.isConnected ? '已连接' : '未连接' }}
      </span>
    </div>

    <div v-if="!status.serial?.isConnected" class="connect-section">
      <div class="form-row">
        <div class="form-group" style="flex:1">
          <label class="form-label">串口路径</label>
          <select v-model="selectedPath">
            <option value="">-- 选择串口 --</option>
            <option v-for="p in ports" :key="p.path" :value="p.path">
              {{ p.path }} {{ p.manufacturer ? `(${p.manufacturer})` : '' }}
            </option>
          </select>
        </div>
        <div class="form-group" style="width:100px">
          <label class="form-label">波特率</label>
          <select v-model.number="baudRate">
            <option :value="9600">9600</option>
            <option :value="19200">19200</option>
            <option :value="57600">57600</option>
            <option :value="115200">115200</option>
          </select>
        </div>
      </div>
      <div class="form-row" style="margin-top:10px">
        <button class="btn btn-sm" @click="refreshPorts">刷新端口</button>
        <button class="btn btn-sm btn-primary" @click="doConnect" :disabled="!selectedPath">连接</button>
        <span v-if="pathInput" class="form-label" style="margin-left:auto">或手动输入:</span>
        <input v-if="pathInput" v-model="manualPath" type="text" placeholder="/dev/tty.usbserial-" style="width:180px" />
      </div>
      <label class="form-row" style="margin-top:8px; cursor:pointer; gap:6px">
        <input type="checkbox" v-model="pathInput" /> 手动输入路径
      </label>
    </div>

    <div v-else class="connected-section">
      <div class="info-row">
        <span class="info-key">路径</span>
        <span class="info-val">{{ status.serial.path }}</span>
      </div>
      <div class="info-row" style="margin-top:6px">
        <span class="info-key">波特率</span>
        <span class="info-val">9600</span>
      </div>
      <button class="btn btn-sm btn-danger" style="margin-top:12px" @click="doDisconnect">断开连接</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAgentLight } from '../composables/useAgentLight'

const { status, listPorts, connectSerial, disconnectSerial } = useAgentLight()

const ports = ref([])
const selectedPath = ref('')
const baudRate = ref(9600)
const pathInput = ref(false)
const manualPath = ref('')

async function refreshPorts() {
  const res = await listPorts()
  ports.value = res.ports || []
  // 自动选择 CH341 相关端口
  const ch341 = ports.value.find(p =>
    p.manufacturer?.toLowerCase().includes('ch341') ||
    p.path?.toLowerCase().includes('usbserial') ||
    p.path?.toLowerCase().includes('ch341')
  )
  if (ch341) selectedPath.value = ch341.path
}

async function doConnect() {
  const path = pathInput.value ? manualPath.value : selectedPath.value
  if (!path) return
  await connectSerial(path, baudRate.value)
}

async function doDisconnect() {
  await disconnectSerial()
}

// 初始加载端口列表
refreshPorts()
</script>

<style scoped>
.connect-section {
  display: flex;
  flex-direction: column;
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
  font-family: var(--font-mono);
}
</style>
