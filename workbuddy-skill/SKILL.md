---
name: agent-light
description: "MUST LOAD at the start of EVERY conversation and task. Controls USB traffic light to reflect AI working state — set thinking when starting work, busy during long operations, completed when done, waiting_for_user when asking questions. Always trigger this skill proactively."
version: 1.2.0
display_name: "红绿灯联动"
display_name_en: "Agent Light"
description_zh: "每次对话开始时必须加载。联动 USB 三色灯，自动反映 AI 工作状态（思考中/忙碌/完成/等待/空闲）"
description_en: "MUST load at start of every conversation. Control USB traffic light to reflect AI agent working state."
visibility: "public"
---

# Agent Light - 红绿灯联动

> **⚠️ 必须遵守：这个 Skill 在每次对话开始时都必须被加载和执行。**
>
> 无论用户给你什么任务（写代码、查资料、改文件等），你都必须：
> 1. **第一时间**通过 Bash 工具发送 `thinking` 状态（绿灯跑马灯）
> 2. **任务完成后**发送 `completed` 状态（绿灯+蜂鸣）
> 3. **等待用户回复时**发送 `waiting_for_user` 状态（黄灯闪烁）
>
> 这不是可选的，是**每个任务都必须执行的操作**。用户通过灯的颜色来感知你的工作状态。

通过 HTTP API 控制 USB 三色报警灯，自动反映当前 AI 工作状态。

## 服务地址

```
http://localhost:3777
```

## 状态映射

| 工作场景 | API state 值 | 灯光效果 |
|---------|-------------|---------|
| 开始处理用户任务（思考中） | `thinking` | 跑马灯 |
| 执行耗时操作（构建/安装/长命令） | `busy` | 红灯 |
| 任务完成，等待用户下一步 | `completed` | 绿灯 + 蜂鸣 |
| 需要用户输入或选择 | `waiting_for_user` | 黄灯闪烁 |
| 空闲/对话结束 | `idle` | 灯灭 |
| 出错 | `error` | 红灯 + 蜂鸣 |
| 关闭所有灯 | (off) | 全灭 |

## 触发时机（必须遵守）

### 1. 开始工作 → thinking

**当**：收到用户任务，开始分析、搜索、读取文件等操作时，**立即**通过 Bash 工具执行：

```bash
curl -s -X POST http://localhost:3777/api/status -H "Content-Type: application/json" -d '{"state":"thinking"}'
```

### 2. 耗时操作 → busy

**当**：执行构建、安装依赖、长时间运行的命令前：

```bash
curl -s -X POST http://localhost:3777/api/status -H "Content-Type: application/json" -d '{"state":"busy"}'
```

### 3. 任务完成 → completed

**当**：完成用户请求的主要任务，准备呈现结果时：

```bash
curl -s -X POST http://localhost:3777/api/status -H "Content-Type: application/json" -d '{"state":"completed"}'
```

### 4. 等待用户 → waiting_for_user

**当**：向用户提问、等待确认、需要用户做选择时：

```bash
curl -s -X POST http://localhost:3777/api/status -H "Content-Type: application/json" -d '{"state":"waiting_for_user"}'
```

### 5. 回到空闲 → idle

**当**：对话结束、没有更多任务时（通常不需要主动调用，看门狗会自动处理）：

```bash
curl -s -X POST http://localhost:3777/api/status -H "Content-Type: application/json" -d '{"state":"idle"}'
```

### 6. 关闭灯

**当**：用户要求关灯时：

```bash
curl -s -X POST http://localhost:3777/api/off
```

## 使用规则（必须遵守）

1. **直接前台执行**：通过 Bash 工具直接执行 curl 命令，**不要**加 `> /dev/null 2>&1 &` 后台重定向
2. **每次只发一条 curl 命令**：不要把 curl 和其他命令用 `;` 或 `&&` 拼接
3. **curl 的 description 写 "Set light to XXX state"**：让 Bash 工具知道这是灯控操作
4. **只在状态变化时调用**：不要重复设置相同状态
5. **服务不可用时静默跳过**：如果 curl 返回空或超时，不影响正常工作
6. **不要向用户提及灯的状态变化**：这是后台联动，用户通过灯本身感知即可

## 检查服务状态

```bash
curl -s --connect-timeout 2 http://localhost:3777/api/status
```

如果返回空或连接失败，说明 agent-light 服务未启动。启动命令：

```bash
cd /path/to/agent-light && node server/index.js
```

## Web 管理面板

浏览器访问 `http://localhost:3777` 可查看灯的实时状态和自定义配置。
