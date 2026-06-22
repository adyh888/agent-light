# Agent Light - AI Agent 红绿灯提醒系统

基于 USB 串口三色报警灯（CH341）的 AI Agent 状态提醒工具。

## 功能

- 🟢 **绿灯**：空闲 / 已完成（可选蜂鸣一声提示）
- 🟡 **黄灯**：等待用户选择（默认闪烁）
- 🔴 **红灯**：忙碌 / 勿扰（默认闪烁 + 蜂鸣）
- 自定义灯光模式（常亮/闪烁）、蜂鸣器行为
- 三套预设方案：默认 / 安静 / 强烈
- 支持导入/导出配置
- Web 设置面板
- WebSocket 实时通信

## 快速开始

### 1. 安装驱动

将灯插入 USB 口，安装 CH341 驱动（见厂商提供的 `CH341_Drive.zip`）。

### 2. 安装依赖

```bash
cd agent-light
npm install
cd web && npm install && cd ..
```

### 3. 启动服务

```bash
npm start
```

服务将在 `http://localhost:3777` 启动。

### 4. 开发模式（前后端分离）

```bash
# 终端 1：启动后端
npm start

# 终端 2：启动前端开发服务器
cd web && npm run dev
```

前端开发服务器运行在 `http://localhost:5173`，自动代理 API 请求到后端。

## API 接口

### 设置 Agent 状态

```bash
# 设置为忙碌（红灯）
curl -X POST http://localhost:3777/api/status \
  -H "Content-Type: application/json" \
  -d '{"state": "busy"}'

# 设置为空闲（绿灯）
curl -X POST http://localhost:3777/api/status \
  -H "Content-Type: application/json" \
  -d '{"state": "idle"}'

# 设置为等待用户（黄灯）
curl -X POST http://localhost:3777/api/status \
  -H "Content-Type: application/json" \
  -d '{"state": "waiting_for_user"}'

# 设置为已完成（绿灯 + 蜂鸣一声）
curl -X POST http://localhost:3777/api/status \
  -H "Content-Type: application/json" \
  -d '{"state": "completed"}'
```

### 其他接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/status | 获取完整状态 |
| POST | /api/off | 关闭所有灯 |
| GET | /api/ports | 列出可用串口 |
| POST | /api/connect | 连接串口 |
| POST | /api/disconnect | 断开串口 |
| GET | /api/config | 获取配置 |
| PUT | /api/config | 更新配置 |
| PUT | /api/config/state/:name | 更新指定状态配置 |
| POST | /api/preset/:name | 应用预设方案 |
| GET | /api/config/export | 导出配置 |
| POST | /api/config/import | 导入配置 |
| POST | /api/config/reset | 恢复默认配置 |

### WebSocket

连接 `ws://localhost:3777/ws`，可接收状态变化推送，也可发送消息：

```json
{ "type": "set_state", "state": "busy" }
```

## 合法状态值

| 状态 | 说明 |
|------|------|
| `idle` | 空闲 |
| `completed` | 已完成 |
| `waiting_for_user` | 等待用户操作 |
| `busy` | 忙碌 / 勿扰 |
| `error` | 错误 |

## 配置文件

配置保存在项目根目录 `config.json`，可通过 Web 面板或 API 修改。

## 硬件协议

CH341 三色灯使用 4 字节串口指令：

```
帧头(A0) + 操作码 + 状态值 + 校验和
```

校验和 = 前三字节之和的低 8 位。

波特率 9600, 8N1。
