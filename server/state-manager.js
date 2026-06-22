const lightController = require('./serial');
const config = require('./config');

/**
 * Agent 状态枚举
 */
const AGENT_STATES = {
  IDLE: 'idle',
  COMPLETED: 'completed',
  WAITING_FOR_USER: 'waiting_for_user',
  THINKING: 'thinking',
  BUSY: 'busy',
  ERROR: 'error',
};

/**
 * 合法的 Agent 状态列表
 */
const VALID_STATES = Object.values(AGENT_STATES);

class StateManager {
  constructor() {
    this.currentState = AGENT_STATES.IDLE;
    this.stateHistory = [];
    this.maxHistory = 100;
    this.watchdogTimer = null;
    // 看门狗超时（毫秒），非终态超过此时长自动回 idle
    this.watchdogTimeoutMs = 3 * 60 * 1000; // 默认 3 分钟
  }

  /**
   * 启动看门狗：进入非终态时调用
   * 读取 config.watchdogTimeout（毫秒），0 表示关闭
   */
  startWatchdog() {
    this.clearWatchdog();
    const timeout = config.get().watchdogTimeout || 180000;
    if (timeout <= 0) return; // 关闭看门狗
    this.watchdogTimer = setTimeout(() => {
      console.log('[Watchdog] 状态超时，自动回 idle');
      this.setState(AGENT_STATES.IDLE);
      if (typeof this.onStateChange === 'function') {
        this.onStateChange({
          success: true,
          from: this.currentState,
          to: AGENT_STATES.IDLE,
          config: this.getStateConfig(AGENT_STATES.IDLE),
          autoReset: true,
        });
      }
    }, timeout);
  }

  /**
   * 清除看门狗定时器
   */
  clearWatchdog() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  /**
   * 设置 Agent 状态并控制灯
   * @param {string} state - Agent 状态
   * @param {object} options - 可选覆盖配置
   * @returns {object} 执行结果
   */
  setState(state, options = {}) {
    if (!VALID_STATES.includes(state)) {
      return {
        success: false,
        error: `无效状态: ${state}，合法值: ${VALID_STATES.join(', ')}`,
      };
    }

    const prevState = this.currentState;
    this.currentState = state;

    // 看门狗管理
    // thinking/busy（agent 内部处理中）→ 若超时自动回 idle
    // waiting_for_user（等待用户输入）→ 不打 watchdog，用户不选就一直等
    const WATCHDOG_STATES = [AGENT_STATES.THINKING, AGENT_STATES.BUSY];
    if (WATCHDOG_STATES.includes(state)) {
      this.startWatchdog();
    } else {
      this.clearWatchdog();
    }

    // 获取当前状态配置
    const stateConfig = this.getStateConfig(state, options);

    // 控制灯
    if (lightController.isConnected) {
      lightController.applyState(stateConfig);
    }

    // 记录历史
    this.stateHistory.push({
      from: prevState,
      to: state,
      timestamp: new Date().toISOString(),
      config: { ...stateConfig },
    });
    if (this.stateHistory.length > this.maxHistory) {
      this.stateHistory.shift();
    }

    return {
      success: true,
      from: prevState,
      to: state,
      config: stateConfig,
    };
  }

  /**
   * 获取指定状态的灯+蜂鸣器配置
   * 优先使用 options 中的覆盖，其次使用配置文件
   */
  getStateConfig(state, options = {}) {
    const cfg = config.get();
    const stateConfig = cfg.states[state];

    if (!stateConfig) {
      // 回退到默认配置
      return {
        light: state === 'idle' || state === 'completed' ? 'green' :
               state === 'waiting_for_user' || state === 'thinking' ? 'yellow' : 'red',
        lightMode: state === 'busy' ? 'marquee' : state === 'idle' || state === 'completed' ? 'on' : 'blink',
        buzzer: state === 'busy' || state === 'error',
        buzzerDuration: 0,
        marqueeSpeed: 300,
        marqueeDirection: 'forward',
      };
    }

    // 合并覆盖选项
    return {
      ...stateConfig,
      ...options,
    };
  }

  /**
   * 应用预设方案
   */
  applyPreset(presetName) {
    const cfg = config.get();
    const preset = cfg.presets[presetName];

    if (!preset) {
      return {
        success: false,
        error: `预设不存在: ${presetName}`,
      };
    }

    // 更新当前激活的 states
    cfg.states = { ...preset.states };
    cfg.activePreset = presetName;
    config.save(cfg);

    // 重新应用当前状态
    if (lightController.isConnected) {
      lightController.applyState(this.getStateConfig(this.currentState));
    }

    return {
      success: true,
      preset: presetName,
      label: preset.label,
    };
  }

  /**
   * 更新单个状态的自定义配置
   */
  updateStateConfig(stateName, stateConfig) {
    if (!VALID_STATES.includes(stateName)) {
      return { success: false, error: `无效状态: ${stateName}` };
    }

    const cfg = config.get();
    cfg.states[stateName] = { ...cfg.states[stateName], ...stateConfig };
    cfg.activePreset = 'custom';
    config.save(cfg);

    // 如果修改的是当前状态，立即生效
    if (stateName === this.currentState && lightController.isConnected) {
      lightController.applyState(this.getStateConfig(this.currentState));
    }

    return { success: true, state: stateName, config: cfg.states[stateName] };
  }

  /**
   * 获取当前完整状态信息
   */
  getFullStatus() {
    const cfg = config.get();
    const serialStatus = lightController.getStatus();

    return {
      currentState: this.currentState,
      currentConfig: this.getStateConfig(this.currentState),
      serial: serialStatus,
      marqueeRunning: lightController.isMarqueeRunning(),
      activePreset: cfg.activePreset,
      watchdogTimeout: cfg.watchdogTimeout || 180000,
      allStates: cfg.states,
      presets: Object.entries(cfg.presets).map(([key, val]) => ({
        key,
        label: val.label,
      })),
      history: this.stateHistory.slice(-10),
    };
  }

  /**
   * 关闭所有灯
   */
  turnOff() {
    if (lightController.isConnected) {
      lightController.allOff();
    }
    return { success: true };
  }
}

module.exports = new StateManager();
