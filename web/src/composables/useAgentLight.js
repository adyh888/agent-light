import { ref, reactive, onMounted, onUnmounted } from 'vue'

const status = reactive({
  currentState: 'idle',
  currentConfig: null,
  serial: { isConnected: false, path: '' },
  marqueeRunning: false,
  activePreset: 'default',
  allStates: {},
  presets: [],
  history: [],
})

const connected = ref(false)
const ws = ref(null)
const wsError = ref('')

const listeners = new Set()

function onStateUpdate(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function notify(data) {
  for (const cb of listeners) cb(data)
}

function connectWS() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const url = `${protocol}//${location.host}/ws`

  ws.value = new WebSocket(url)

  ws.value.onopen = () => {
    connected.value = true
    wsError.value = ''
  }

  ws.value.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)
      if (msg.type === 'init' || msg.type === 'state_update') {
        if (msg.data?.fullStatus) {
          const fs = msg.data.fullStatus
          // 逐个更新，确保 Vue 响应式生效
          status.currentState = fs.currentState
          status.currentConfig = { ...fs.currentConfig }  // 新对象触发响应式
          status.serial = { ...fs.serial }
          status.marqueeRunning = fs.marqueeRunning
          status.activePreset = fs.activePreset
          status.allStates = { ...fs.allStates }
          status.presets = [...fs.presets]
          status.history = [...fs.history]
        } else if (msg.data) {
          Object.assign(status, msg.data)
        }
      }
      notify(msg)
    } catch (e) {
      // ignore
    }
  }

  ws.value.onclose = () => {
    connected.value = false
    // 3秒后重连
    setTimeout(() => {
      if (!connected.value) connectWS()
    }, 3000)
  }

  ws.value.onerror = () => {
    wsError.value = 'WebSocket 连接失败'
  }
}

// ===== API 方法 =====

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`/api${path}`, opts)
  return res.json()
}

async function fetchStatus() {
  const data = await api('GET', '/status')
  Object.assign(status, data)
}

async function setState(state, options = {}) {
  return api('POST', '/status', { state, ...options })
}

async function turnOff() {
  return api('POST', '/off')
}

async function listPorts() {
  return api('GET', '/ports')
}

async function connectSerial(path, baudRate = 9600) {
  return api('POST', '/connect', { path, baudRate })
}

async function disconnectSerial() {
  return api('POST', '/disconnect')
}

async function getConfig() {
  return api('GET', '/config')
}

async function updateConfig(partial) {
  return api('PUT', '/config', partial)
}

async function updateStateConfig(stateName, stateConfig) {
  return api('PUT', `/config/state/${stateName}`, stateConfig)
}

async function applyPreset(name) {
  return api('POST', `/preset/${name}`)
}

async function exportConfig() {
  const res = await fetch('/api/config/export')
  return res.text()
}

async function importConfig(json) {
  return api('POST', '/config/import', { json })
}

async function resetConfig() {
  return api('POST', '/config/reset')
}

export function useAgentLight() {
  onMounted(() => {
    connectWS()
    fetchStatus()
  })

  return {
    status,
    connected,
    wsError,
    onStateUpdate,
    setState,
    turnOff,
    listPorts,
    connectSerial,
    disconnectSerial,
    getConfig,
    updateConfig,
    updateStateConfig,
    applyPreset,
    exportConfig,
    importConfig,
    resetConfig,
    fetchStatus,
  }
}
