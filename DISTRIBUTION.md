# Agent Light 分发指南

> 给别人安装这套「AI Agent 红绿灯提醒系统」的完整步骤。

---

## 一、前提条件

### 硬件
- **USB 串口三色报警灯（CH341 芯片）**
- 淘宝/拼多多搜索"USB三色报警灯 CH341"即可找到，约 20-50 元

### 软件
- **Node.js** >= 18（推荐 22.x）
- **WorkBuddy 桌面版**（已安装并运行过至少一次）
- **macOS** 或 **Linux**（Windows 理论支持但未充分测试）

---

## 二、安装步骤

### 第 1 步：克隆项目

```bash
git clone https://github.com/adyh888/agent-light.git
cd agent-light
```

### 第 2 步：安装驱动

将 USB 三色灯插入电脑 USB 口。

- **macOS**：下载并安装 [CH341 驱动](https://www.wch.cn/downloads/CH341SER_MAC_ZIP.html)，安装后重启电脑
- **Linux**：通常内核自带驱动，插入即用
- **Windows**：下载 [CH341 驱动](https://www.wch.cn/downloads/CH341SER_EXE.html) 安装

插入后检查串口是否识别：
```bash
# macOS: 应该能看到 /dev/tty.wchusbserial* 设备
ls /dev/tty.wchusbserial* 2>/dev/null

# Linux: 应该能看到 /dev/ttyUSB* 设备
ls /dev/ttyUSB* 2>/dev/null
```

### 第 3 步：安装依赖 & 构建前端

```bash
# 安装后端依赖
npm install

# 安装前端依赖并构建
cd web && npm install && npm run build && cd ..
```

### 第 4 步：启动服务

```bash
# 方式 1：用启动脚本
./start.sh

# 方式 2：直接运行
npm start
```

启动后打开浏览器访问 `http://localhost:3777`，应该能看到 Web 管理面板。

### 第 5 步：连接灯光硬件

在 Web 面板中：
1. 点击「串口设置」
2. 选择你的 USB 串口设备（如 `/dev/tty.wchusbserial2120`）
3. 点击「连接」

连接成功后，试试点击不同的状态按钮，灯应该会亮起。

### 第 6 步：安装 AI 工具集成

根据你使用的 AI 工具选择对应的安装方式：

#### 方式 A：WorkBuddy

```bash
bash workbuddy-skill/install-skill.sh
```

这个脚本会：
- 把 Skill 文件复制到 `~/.workbuddy/skills/` 目录
- 在 `~/.workbuddy/MEMORY.md` 中写入强制灯控规则（确保每次对话都触发）

#### 方式 B：Codex

```bash
bash codex-skill/install.sh
```

这个脚本会：
- 把 Skill 文件复制到 `~/.codex/skills/agent-light/` 目录
- 在 `~/.codex/instructions.md` 中写入强制灯控指令（确保每次对话都触发）
- 安装 `al` 命令行工具到 `~/.local/bin/al`

#### 方式 C：同时安装两个

两个脚本可以共存，不冲突。

### 第 7 步：重启 AI 工具

**完全关闭你的 AI 工具，重新打开**，新开一个对话窗口。

给 AI 任意任务（比如"帮我写个 hello world"），灯应该会：
1. 🟢 **绿灯跑马灯** — AI 开始思考
2. 🟢 **绿灯常亮 + 滴一声** — AI 完成任务

---

## 三、自定义配置

### 修改灯光效果

打开 `http://localhost:3777`，在「状态自定义」面板中可以修改每个状态的：
- 灯色（红/黄/绿）
- 模式（常亮/闪烁/跑马灯/关闭）
- 蜂鸣器（开/关，持续时间）
- 跑马灯速度和方向

### 预设方案

Web 面板提供三套预设：
- **默认**：标准提醒
- **安静**：不响蜂鸣器
- **强烈**：强烈闪烁 + 蜂鸣

### 修改服务端口

编辑 `config.json`，修改 `port` 字段。如果改了端口，也要同步修改 Skill 文件中的 URL。

---

## 四、开机自动启动（可选）

### macOS — launchd

创建文件 `~/Library/LaunchAgents/com.agent-light.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.agent-light</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/agent-light/server/index.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/agent-light</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/path/to/agent-light/logs/backend.log</string>
    <key>StandardErrorPath</key>
    <string>/path/to/agent-light/logs/backend.log</string>
</dict>
</plist>
```

加载：
```bash
launchctl load ~/Library/LaunchAgents/com.agent-light.plist
```

### Linux — systemd

```bash
sudo tee /etc/systemd/system/agent-light.service << 'EOF'
[Unit]
Description=Agent Light Service
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/path/to/agent-light
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable agent-light
sudo systemctl start agent-light
```

---

## 五、故障排查

### 灯不亮

1. **检查服务是否运行**：浏览器打开 `http://localhost:3777`，能看到面板说明服务正常
2. **检查串口连接**：面板上「串口状态」是否显示「已连接」
3. **检查 USB 线**：拔插一次 USB 线，重新连接串口
4. **查看日志**：`tail -20 logs/backend.log`

### AI 工具不联动

1. **检查服务是否运行**：在终端执行 `curl http://localhost:3777/api/status`，有返回说明服务正常
2. **WorkBuddy**：确认 `~/.workbuddy/skills/` 下有 agent-light 相关目录，`~/.workbuddy/MEMORY.md` 中包含灯控规则
3. **Codex**：确认 `~/.codex/skills/agent-light/` 存在，`~/.codex/instructions.md` 中包含 `# >>> agent-light >>>` 区块
4. **重启 AI 工具**：完全关闭后重新打开

### 串口找不到

- **macOS**：安装 CH341 驱动后重启；检查 `系统偏好设置 > 安全性与隐私` 是否允许驱动加载
- **Linux**：执行 `sudo usermod -a -G dialout $USER`，然后重新登录
- **Windows**：设备管理器中检查 COM 端口

---

## 六、文件结构

```
agent-light/
├── server/                 # 后端服务
│   ├── index.js           # Express + WebSocket 服务器
│   ├── serial.js          # 串口灯光控制
│   ├── state-manager.js   # 状态管理
│   └── config.js          # 配置管理
├── web/                    # Vue 3 前端
│   ├── src/
│   │   ├── App.vue
│   │   ├── components/
│   │   │   ├── StatusPanel.vue      # 状态面板
│   │   │   └── StateConfigPanel.vue # 状态配置
│   │   └── composables/
│   └── dist/              # 构建产物（npm run build 生成）
├── workbuddy-skill/        # WorkBuddy Skill
│   ├── SKILL.md           # Skill 定义文件
│   └── install-skill.sh   # 一键安装脚本
├── codex-skill/            # Codex Skill
│   ├── SKILL.md           # Skill 定义文件
│   ├── install.sh         # 一键安装脚本（含卸载功能）
│   └── al.sh              # 命令行工具（al 命令）
├── config.json             # 运行时配置（自动生成）
├── package.json
├── start.sh                # 启动脚本
├── stop.sh                 # 停止脚本
└── README.md
```

---

## 七、给开发者的说明

如果你想基于此项目二次开发：

- **后端**：Node.js + Express + WebSocket，核心在 `server/serial.js`（串口协议）
- **前端**：Vue 3 + Vite，组件在 `web/src/components/`
- **硬件协议**：CH341 三色灯，4 字节串口指令（帧头 A0 + 操作码 + 状态值 + 校验和），波特率 9600

API 文档见 `README.md`。
