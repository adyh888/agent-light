const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');

const lightController = require('./serial');
const stateManager = require('./state-manager');
const config = require('./config');

const app = express();
app.use(express.json());

// 静态文件服务（Vue 构建产物）
const webDistPath = path.join(__dirname, '..', 'web', 'dist');
app.use(express.static(webDistPath));

// ===== REST API =====

// 获取完整状态
app.get('/api/status', (req, res) => {
  res.json(stateManager.getFullStatus());
});

// 设置 Agent 状态
app.post('/api/status', (req, res) => {
  const { state, ...options } = req.body;
  const result = stateManager.setState(state, options);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }
  broadcastState(result);
  res.json(result);
});

// 关闭灯
app.post('/api/off', (req, res) => {
  const result = stateManager.turnOff();
  broadcastState({ action: 'off' });
  res.json(result);
});

// 列出可用串口
app.get('/api/ports', async (req, res) => {
  try {
    const ports = await lightController.listPorts();
    res.json({ ports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 连接串口
app.post('/api/connect', async (req, res) => {
  const { path: portPath, baudRate } = req.body;
  if (!portPath) {
    res.status(400).json({ error: '缺少串口路径' });
    return;
  }
  try {
    const result = await lightController.connect(portPath, baudRate || 9600);
    // 保存串口配置
    config.update({ serial: { path: portPath, baudRate: baudRate || 9600 } });
    broadcastState({ action: 'serial_connected', path: portPath });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 断开串口
app.post('/api/disconnect', async (req, res) => {
  await lightController.disconnect();
  broadcastState({ action: 'serial_disconnected' });
  res.json({ success: true });
});

// 获取配置
app.get('/api/config', (req, res) => {
  res.json(config.get());
});

// 更新配置
app.put('/api/config', (req, res) => {
  const cfg = config.update(req.body);
  res.json({ success: true, config: cfg });
});

// 更新单个状态配置
app.put('/api/config/state/:stateName', (req, res) => {
  const { stateName } = req.params;
  const result = stateManager.updateStateConfig(stateName, req.body);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }
  broadcastState({ action: 'config_updated', stateName, config: result.config });
  res.json(result);
});

// 应用预设
app.post('/api/preset/:name', (req, res) => {
  const { name } = req.params;
  const result = stateManager.applyPreset(name);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }
  broadcastState({ action: 'preset_applied', preset: name });
  res.json(result);
});

// 导出配置
app.get('/api/config/export', (req, res) => {
  res.type('application/json');
  res.send(config.export());
});

// 导入配置
app.post('/api/config/import', (req, res) => {
  const { json } = req.body;
  const result = config.import(json);
  res.json(result);
});

// 恢复默认配置
app.post('/api/config/reset', (req, res) => {
  const cfg = config.reset();
  res.json({ success: true, config: cfg });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(webDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('前端未构建，请先运行 cd web && npm run build');
    }
  });
});

// ===== WebSocket 服务器 =====

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WS] 客户端连接，当前连接数: ${clients.size}`);

  // 发送当前状态
  ws.send(JSON.stringify({
    type: 'init',
    data: stateManager.getFullStatus(),
  }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'set_state': {
          const result = stateManager.setState(msg.state, msg.options);
          if (result.success) {
            broadcastState(result);
          }
          ws.send(JSON.stringify({ type: 'set_state_result', data: result }));
          break;
        }
        case 'off': {
          stateManager.turnOff();
          broadcastState({ action: 'off' });
          break;
        }
        default:
          console.warn('[WS] 未知消息类型:', msg.type);
      }
    } catch (err) {
      console.error('[WS] 消息处理错误:', err.message);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS] 客户端断开，当前连接数: ${clients.size}`);
  });
});

/**
 * 广播状态变化到所有 WebSocket 客户端
 */
function broadcastState(data) {
  const fullStatus = stateManager.getFullStatus();
  const message = JSON.stringify({
    type: 'state_update',
    data: { ...data, fullStatus },
  });

  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}

// 将广播函数绑定到状态管理器（用于看门狗自动回 idle 时通知前端）
stateManager.onStateChange = broadcastState;

// ===== 启动服务器 =====

const PORT = config.get().port || 3777;

server.listen(PORT, () => {
  console.log(`\n🚦 Agent Light 服务已启动`);
  console.log(`   HTTP API:  http://localhost:${PORT}/api/status`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`   设置面板:  http://localhost:${PORT}`);
  console.log('');

  // 自动连接串口
  const cfg = config.get();
  if (cfg.serial.autoConnect && cfg.serial.path) {
    console.log(`[Serial] 尝试自动连接: ${cfg.serial.path}`);
    lightController.connect(cfg.serial.path, cfg.serial.baudRate)
      .then(() => console.log('[Serial] 自动连接成功'))
      .catch((err) => console.warn(`[Serial] 自动连接失败: ${err.message}`));
  }
});

// 优雅退出
process.on('SIGINT', async () => {
  console.log('\n[Server] 正在关闭...');
  await lightController.disconnect();
  server.close();
  process.exit(0);
});

module.exports = server;
