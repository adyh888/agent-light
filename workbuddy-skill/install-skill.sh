#!/bin/bash
# WorkBuddy Agent Light Skill 安装脚本
# 用法: bash install-skill.sh

set -e

echo "💎 WorkBuddy Agent Light Skill 安装程序"
echo "============================================"
echo ""

# 检测 WorkBuddy skills 目录
SKILLS_DIR="$HOME/.workbuddy/skills"
if [ ! -d "$SKILLS_DIR" ]; then
    echo "❌ 未找到 WorkBuddy skills 目录: $SKILLS_DIR"
    echo "   请确认已安装 WorkBuddy 桌面版并至少运行过一次"
    exit 1
fi

# 生成唯一的 skill 目录名（使用时间戳）
TIMESTAMP=$(python3 -c 'import time; print(int(time.time()*1000000))' 2>/dev/null || date +%s)
SKILL_DIR="$SKILLS_DIR/skill_$TIMESTAMP"

# 复制 SKILL.md
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$SKILL_DIR"
cp "$SCRIPT_DIR/SKILL.md" "$SKILL_DIR/SKILL.md"

echo "✅ Skill 已安装到: $SKILL_DIR/SKILL.md"

# 创建/更新全局记忆文件（确保每次对话都触发灯控）
MEMORY_FILE="$HOME/.workbuddy/MEMORY.md"

if [ -f "$MEMORY_FILE" ]; then
    # 检查是否已有灯控规则
    if grep -q "localhost:3777" "$MEMORY_FILE" 2>/dev/null; then
        echo "✅ 全局记忆文件已包含灯控规则，跳过"
    else
        # 追加灯控规则
        cat >> "$MEMORY_FILE" << 'MEMEOF'

## 强制规则：红绿灯联动（每次对话必须执行）

用户桌面有一个 USB 三色灯，通过本地服务 `http://localhost:3777` 控制。**每次对话、每个任务**都必须按以下规则联动灯光：

1. **收到任务开始工作时**，第一时间通过 Bash 工具执行：
   ```
   curl -s -X POST http://localhost:3777/api/status -H "Content-Type: application/json" -d '{"state":"thinking"}'
   ```

2. **任务完成、准备回复用户时**，执行：
   ```
   curl -s -X POST http://localhost:3777/api/status -H "Content-Type: application/json" -d '{"state":"completed"}'
   ```

3. **向用户提问、需要用户做选择时**，执行：
   ```
   curl -s -X POST http://localhost:3777/api/status -H "Content-Type: application/json" -d '{"state":"waiting_for_user"}'
   ```

注意事项：
- 这是**每个任务的强制操作**，不是可选的
- 通过 Bash 工具直接前台执行，不要加 `> /dev/null 2>&1 &`
- 如果 curl 返回空或连接失败，静默跳过，不影响正常工作
- 不要向用户提及灯的状态变化
MEMEOF
        echo "✅ 全局记忆文件已更新: $MEMORY_FILE"
    fi
else
    # 创建全局记忆文件
    cat > "$MEMORY_FILE" << 'MEMEOF'
# 用户全局记忆

## 强制规则：红绿灯联动（每次对话必须执行）

用户桌面有一个 USB 三色灯，通过本地服务 `http://localhost:3777` 控制。**每次对话、每个任务**都必须按以下规则联动灯光：

1. **收到任务开始工作时**，第一时间通过 Bash 工具执行：
   ```
   curl -s -X POST http://localhost:3777/api/status -H "Content-Type: application/json" -d '{"state":"thinking"}'
   ```

2. **任务完成、准备回复用户时**，执行：
   ```
   curl -s -X POST http://localhost:3777/api/status -H "Content-Type: application/json" -d '{"state":"completed"}'
   ```

3. **向用户提问、需要用户做选择时**，执行：
   ```
   curl -s -X POST http://localhost:3777/api/status -H "Content-Type: application/json" -d '{"state":"waiting_for_user"}'
   ```

注意事项：
- 这是**每个任务的强制操作**，不是可选的
- 通过 Bash 工具直接前台执行，不要加 `> /dev/null 2>&1 &`
- 如果 curl 返回空或连接失败，静默跳过，不影响正常工作
- 不要向用户提及灯的状态变化
MEMEOF
    echo "✅ 全局记忆文件已创建: $MEMORY_FILE"
fi

echo ""
echo "============================================"
echo "🎉 安装完成！"
echo ""
echo "📋 接下来你需要："
echo ""
echo "   1. 确认 agent-light 服务已启动："
echo "      cd /path/to/agent-light && npm start"
echo ""
echo "   2. 确认 USB 三色灯已连接"
echo ""
echo "   3. 重启 WorkBuddy（新开一个对话窗口）"
echo ""
echo "   4. 给 AI 任意任务，灯应该会自动联动"
echo ""
echo "🔧 管理面板: http://localhost:3777"
echo ""
