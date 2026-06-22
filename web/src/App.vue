<template>
  <div class="app-layout">
    <AppHeader />
    <main class="app-main">
      <StatusPanel />
      <div class="grid-2col">
        <SerialPanel />
        <PresetPanel />
      </div>
      <StateConfigPanel />
    </main>
  </div>
</template>

<script setup>
import './style.css'
import AppHeader from './components/AppHeader.vue'
import StatusPanel from './components/StatusPanel.vue'
import SerialPanel from './components/SerialPanel.vue'
import PresetPanel from './components/PresetPanel.vue'
import StateConfigPanel from './components/StateConfigPanel.vue'
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 640px) {
  .grid-2col {
    grid-template-columns: 1fr;
  }
}
</style>
