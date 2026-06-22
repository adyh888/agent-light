const { SerialPort } = require('serialport');

// CH341 三色灯协议常量
const PROTOCOL = {
  HEADER: 0xa0,
  // 操作码
  ALL: 0x00,
  YELLOW: 0x01,
  GREEN: 0x02,
  RED: 0x03,
  BUZZER: 0x04,
  RED_BUZZER: 0x07,
  // 状态值
  OFF: 0x00,
  ON: 0x01,
  BLINK: 0x02,
};

// 灯色 → 操作码映射  
const LIGHT_OP_CODE = {
  yellow: PROTOCOL.YELLOW,
  green: PROTOCOL.GREEN,
  red: PROTOCOL.RED,
};

/**
 * 计算校验和：前三字节之和的低 8 位
 */
function checksum(header, opCode, state) {
  return (header + opCode + state) & 0xff;
}

/**
 * 构建 4 字节指令
 */
function buildCommand(opCode, state) {
  const sum = checksum(PROTOCOL.HEADER, opCode, state);
  return Buffer.from([PROTOCOL.HEADER, opCode, state, sum]);
}

class LightController {
  constructor() {
    this.port = null;
    this.isConnected = false;
    this.currentPath = '';
    this.buzzerTimer = null;
    this.marqueeTimer = null;
    this.marqueeRunning = false;
    this.marqueeStep = 0;
  }

  /**
   * 列出可用串口
   */
  async listPorts() {
    const ports = await SerialPort.list();
    return ports.map(p => ({
      path: p.path,
      manufacturer: p.manufacturer || '',
      serialNumber: p.serialNumber || '',
      pnpId: p.pnpId || '',
    }));
  }

  /**
   * 连接串口
   */
  async connect(path, baudRate = 9600) {
    if (this.isConnected && this.port) {
      await this.disconnect();
    }

    return new Promise((resolve, reject) => {
      try {
        this.port = new SerialPort({
          path,
          baudRate,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          autoOpen: false,
        });

        this.port.open((err) => {
          if (err) {
            this.isConnected = false;
            reject(new Error(`串口打开失败: ${err.message}`));
            return;
          }
          this.isConnected = true;
          this.currentPath = path;
          // 连接后先关闭所有灯
          this.allOff();
          resolve({ path, baudRate });
        });

        this.port.on('error', (err) => {
          console.error('[Serial] 串口错误:', err.message);
          this.isConnected = false;
        });

        this.port.on('close', () => {
          this.isConnected = false;
          this.clearBuzzerTimer();
        });
      } catch (err) {
        reject(new Error(`串口连接异常: ${err.message}`));
      }
    });
  }

  /**
   * 断开串口
   */
  async disconnect() {
    this.clearBuzzerTimer();
    this.stopMarquee();
    if (this.port && this.isConnected) {
      this.allOff();
      return new Promise((resolve) => {
        this.port.close(() => {
          this.isConnected = false;
          this.port = null;
          resolve();
        });
      });
    }
    this.port = null;
    this.isConnected = false;
  }

  /**
   * 发送原始指令（异步版本，等待写入完成）
   * 确保每个指令都被硬件完整接收后再发下一个
   */
  sendAsync(opCode, state) {
    return new Promise((resolve) => {
      if (!this.isConnected || !this.port) {
        console.warn('[Serial] 未连接，无法发送指令');
        resolve(false);
        return;
      }
      const cmd = buildCommand(opCode, state);
      this.port.write(cmd, () => {
        // write callback：数据已交给 OS 缓冲区
        // 再调 drain 确保数据真正送到硬件
        this.port.drain(() => resolve(true));
      });
    });
  }

  /**
   * 发送原始指令（旧版，保持兼容）
   */
  send(opCode, state) {
    if (!this.isConnected || !this.port) {
      console.warn('[Serial] 未连接，无法发送指令');
      return false;
    }
    const cmd = buildCommand(opCode, state);
    this.port.write(cmd, (err) => {
      if (err) {
        console.error('[Serial] 发送失败:', err.message);
      }
    });
    return true;
  }

  // ===== 灯光控制 =====

  /**
   * 控制指定颜色灯
   * @param {string} color - 'red' | 'yellow' | 'green'
   * @param {string} mode - 'on' | 'off' | 'blink'
   */
  setLight(color, mode) {
    const opCode = LIGHT_OP_CODE[color];
    if (!opCode) {
      console.error(`[Serial] 未知灯色: ${color}`);
      return false;
    }
    const stateValue = PROTOCOL[mode.toUpperCase()];
    if (stateValue === undefined) {
      console.error(`[Serial] 未知模式: ${mode}`);
      return false;
    }
    return this.send(opCode, stateValue);
  }

  // 快捷方法
  greenOn()    { return this.send(PROTOCOL.GREEN, PROTOCOL.ON); }
  greenBlink() { return this.send(PROTOCOL.GREEN, PROTOCOL.BLINK); }
  yellowOn()   { return this.send(PROTOCOL.YELLOW, PROTOCOL.ON); }
  yellowBlink(){ return this.send(PROTOCOL.YELLOW, PROTOCOL.BLINK); }
  redOn()      { return this.send(PROTOCOL.RED, PROTOCOL.ON); }
  redBlink()   { return this.send(PROTOCOL.RED, PROTOCOL.BLINK); }

  // ===== 蜂鸣器控制 =====

  buzzerOn()       { return this.send(PROTOCOL.BUZZER, PROTOCOL.ON); }
  buzzerOff()      { return this.send(PROTOCOL.BUZZER, PROTOCOL.OFF); }
  buzzerIntermittent() { return this.send(PROTOCOL.BUZZER, PROTOCOL.BLINK); }

  /**
   * 蜂鸣一声（持续 duration 秒后关闭）—— 异步版本
   * 确保 buzzerOn 指令发出后，等待足够时间再关闭
   */
  beepAsync(duration = 0.3) {
    return new Promise((resolve) => {
      this.clearBuzzerTimer();
      // 先等 60ms 确保前面的灯光指令已完成
      setTimeout(async () => {
        await this.sendAsync(PROTOCOL.BUZZER, PROTOCOL.ON);
        // 蜂鸣指定时长后关闭
        this.buzzerTimer = setTimeout(async () => {
          await this.sendAsync(PROTOCOL.BUZZER, PROTOCOL.OFF);
          this.buzzerTimer = null;
          resolve();
        }, duration * 1000);
      }, 60);
    });
  }

  /**
   * 红灯+蜂鸣器组合
   */
  redBuzzerOn()    { return this.send(PROTOCOL.RED_BUZZER, PROTOCOL.ON); }
  redBuzzerBlink() { return this.send(PROTOCOL.RED_BUZZER, PROTOCOL.BLINK); }
  redBuzzerOff()   { return this.send(PROTOCOL.RED_BUZZER, PROTOCOL.OFF); }

  // ===== 全局控制 =====

  allOff()  { return this.send(PROTOCOL.ALL, PROTOCOL.OFF); }
  allOn()   { return this.send(PROTOCOL.ALL, PROTOCOL.ON); }
  allBlink(){ return this.send(PROTOCOL.ALL, PROTOCOL.BLINK); }

  // ===== 跑马灯控制 =====

  /**
   * 启动跑马灯效果
   * @param {object} options - { speed: ms间隔(默认300), direction: 'forward'|'reverse'(默认forward), buzzer: bool }
   */
  startMarquee(options = {}) {
    this.stopMarquee();

    const speed = options.speed || 300;
    const direction = options.direction || 'forward';
    const withBuzzer = options.buzzer || false;
    // 跑马灯序列：红→黄→绿 或 反向 绿→黄→红
    const sequence = direction === 'reverse'
      ? [PROTOCOL.GREEN, PROTOCOL.YELLOW, PROTOCOL.RED]
      : [PROTOCOL.RED, PROTOCOL.YELLOW, PROTOCOL.GREEN];

    this.marqueeRunning = true;
    this.marqueeStep = 0;

    const tick = () => {
      if (!this.marqueeRunning || !this.isConnected) return;

      // 先关闭所有灯
      this.send(PROTOCOL.ALL, PROTOCOL.OFF);

      // 点亮当前步骤的灯
      const opCode = sequence[this.marqueeStep % sequence.length];
      this.send(opCode, PROTOCOL.ON);

      // 蜂鸣器：如果启用，只在第一步响
      if (withBuzzer && this.marqueeStep % sequence.length === 0) {
        this.beep(0.1);
      }

      this.marqueeStep++;
      this.marqueeTimer = setTimeout(tick, speed);
    };

    tick();
  }

  /**
   * 停止跑马灯
   */
  stopMarquee() {
    this.marqueeRunning = false;
    if (this.marqueeTimer) {
      clearTimeout(this.marqueeTimer);
      this.marqueeTimer = null;
    }
    this.marqueeStep = 0;
  }

  /**
   * 获取跑马灯运行状态
   */
  isMarqueeRunning() {
    return this.marqueeRunning;
  }

  /**
   * 应用状态配置（异步版本）
   * 关键修复：每条指令之间插入 60ms 延迟，确保 CH341 硬件有足够时间处理
   * @param {object} stateConfig - { light, lightMode, buzzer, buzzerDuration, marqueeSpeed, marqueeDirection }
   */
  async applyState(stateConfig) {
    if (!stateConfig) return;

    // 先停止跑马灯
    this.stopMarquee();
    this.clearBuzzerTimer();

    // 【关键】关闭所有灯和蜂鸣器，并等待硬件处理完成
    await this.sendAsync(PROTOCOL.ALL, PROTOCOL.OFF);
    // 等待 60ms 让硬件完成 "全关" 指令的处理
    await new Promise(r => setTimeout(r, 60));

    // 跑马灯模式
    if (stateConfig.lightMode === 'marquee') {
      this.startMarquee({
        speed: stateConfig.marqueeSpeed || 300,
        direction: stateConfig.marqueeDirection || 'forward',
        buzzer: stateConfig.buzzer && stateConfig.buzzerDuration === 0,
      });
      return;
    }

    // 设置灯光（确保 light 和 lightMode 都有效）
    if (stateConfig.light && stateConfig.lightMode && stateConfig.lightMode !== 'off') {
      const opCode = LIGHT_OP_CODE[stateConfig.light];
      const stateValue = PROTOCOL[stateConfig.lightMode.toUpperCase()];
      if (opCode !== undefined && stateValue !== undefined) {
        await this.sendAsync(opCode, stateValue);
        // 等待 60ms 让灯指令生效
        await new Promise(r => setTimeout(r, 60));
      }
    }

    // 设置蜂鸣器（必须在灯指令之后，且等待足够时间）
    if (stateConfig.buzzer) {
      if (stateConfig.buzzerDuration > 0) {
        // 短鸣一声（持续指定时长）
        await this.beepAsync(stateConfig.buzzerDuration);
      } else {
        // 持续响
        await this.sendAsync(PROTOCOL.BUZZER, PROTOCOL.ON);
      }
    }
  }

  clearBuzzerTimer() {
    if (this.buzzerTimer) {
      clearTimeout(this.buzzerTimer);
      this.buzzerTimer = null;
    }
  }

  /**
   * 获取当前连接状态
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      path: this.currentPath,
    };
  }
}

module.exports = new LightController();
