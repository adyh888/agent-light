const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

/**
 * 默认配置（与 config.json 保持同步）
 */
const DEFAULT_CONFIG = {
  port: 3777,
  // 看门狗超时（毫秒），非终态超过此时长自动回 idle，0 表示关闭
  watchdogTimeout: 180000,
  serial: {
    path: '',
    baudRate: 9600,
    autoConnect: true,
  },
  states: {
    idle: { light: 'green', lightMode: 'on', buzzer: false, buzzerDuration: 0.3 },
    completed: { light: 'green', lightMode: 'on', buzzer: true, buzzerDuration: 0.3 },
    waiting_for_user: { light: 'yellow', lightMode: 'blink', buzzer: false, buzzerDuration: 0 },
    thinking: { light: 'yellow', lightMode: 'blink', buzzer: false, buzzerDuration: 0 },
    busy: { light: 'red', lightMode: 'marquee', buzzer: false, buzzerDuration: 0, marqueeSpeed: 300, marqueeDirection: 'forward' },
    error: { light: 'red', lightMode: 'on', buzzer: true, buzzerDuration: 0 },
  },
  presets: {
    default: { label: '默认', states: {} },
    quiet: { label: '安静', states: {} },
    intense: { label: '强烈', states: {} },
  },
  activePreset: 'default',
};

class ConfigManager {
  constructor() {
    this._cache = null;
  }

  /**
   * 读取配置
   */
  get() {
    if (this._cache) return this._cache;

    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        this._cache = JSON.parse(raw);
      } else {
        this._cache = { ...DEFAULT_CONFIG };
        this._saveToDisk();
      }
    } catch (err) {
      console.error('[Config] 读取配置失败，使用默认配置:', err.message);
      this._cache = { ...DEFAULT_CONFIG };
    }

    return this._cache;
  }

  /**
   * 保存配置
   */
  save(cfg) {
    this._cache = cfg;
    this._saveToDisk();
  }

  /**
   * 更新部分配置
   */
  update(partial) {
    const cfg = this.get();
    this._deepMerge(cfg, partial);
    this.save(cfg);
    return cfg;
  }

  /**
   * 导出配置为 JSON 字符串
   */
  export() {
    const cfg = this.get();
    return JSON.stringify(cfg, null, 2);
  }

  /**
   * 导入配置
   */
  import(jsonString) {
    try {
      const cfg = JSON.parse(jsonString);
      // 基本校验
      if (!cfg.states || !cfg.serial) {
        throw new Error('配置格式不正确，缺少 states 或 serial 字段');
      }
      this.save(cfg);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 恢复默认配置
   */
  reset() {
    this._cache = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    this._saveToDisk();
    return this._cache;
  }

  _saveToDisk() {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this._cache, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Config] 写入配置失败:', err.message);
    }
  }

  _deepMerge(target, source) {
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        this._deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
}

module.exports = new ConfigManager();
