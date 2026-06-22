#!/bin/bash
# Codex Agent Light Skill 安装脚本
# 用法: bash install.sh
#
# 功能:
#   1. 安装 Skill 到 ~/.codex/skills/agent-light/
#   2. 写入全局指令到 ~/.codex/instructions.md（确保每次对话自动触发灯控）
#   3. 安装 al.sh 命令行工具到 PATH

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MARKER_START="# >>> agent-light >>>"
MARKER_END="# <<< agent-light <<<"
SKILL_DIR="$HOME/.codex/skills/agent-light"
INSTRUCTIONS_FILE="$HOME/.codex/instructions.md"

# ---- 卸载模式 ----
if [ "${1:-}" = "--uninstall" ] || [ "${1:-}" = "-u" ]; then
    echo "🗑️  卸载 Codex Agent Light Skill..."
    echo ""

    # 移除 instructions.md 中的 agent-light 区块
    if [ -f "$INSTRUCTIONS_FILE" ] && grep -q "$MARKER_START" "$INSTRUCTIONS_FILE" 2>/dev/null; then
        sed -i.bak "/${MARKER_START}/,/${MARKER_END}/d" "$INSTRUCTIONS_FILE" 2>/dev/null || true
        rm -f "${INSTRUCTIONS_FILE}.bak"
        echo "  ✅ 已从 instructions.md 移除灯控指令"
    else
        echo "  ⏭️  instructions.md 中未找到灯控指令"
    fi

    # 移除 Skill 目录
    if [ -d "$SKILL_DIR" ]; then
        rm -rf "$SKILL_DIR"
        echo "  ✅ 已移除 Skill 目录: $SKILL_DIR"
    fi

    # 移除 al 命令行工具
    if [ -f "$HOME/.local/bin/al" ]; then
        rm -f "$HOME/.local/bin/al"
        echo "  ✅ 已移除 al 命令行工具"
    fi

    echo ""
    echo "🎉 卸载完成！重启 Codex 生效。"
    exit 0
fi

echo "💡 Codex Agent Light Skill 安装程序"
echo "============================================"
echo ""

echo "[1/3] 安装 Skill..."
mkdir -p "$SKILL_DIR"

# 复制 SKILL.md
cp "$SCRIPT_DIR/SKILL.md" "$SKILL_DIR/SKILL.md"

# 复制 al.sh 脚本
mkdir -p "$SKILL_DIR/scripts"
if [ -f "$SCRIPT_DIR/al.sh" ]; then
    cp "$SCRIPT_DIR/al.sh" "$SKILL_DIR/scripts/al.sh"
    chmod +x "$SKILL_DIR/scripts/al.sh"
elif [ -f "$SCRIPT_DIR/../workbuddy-skill/../codex-skill/al.sh" ]; then
    cp "$SCRIPT_DIR/al.sh" "$SKILL_DIR/scripts/al.sh" 2>/dev/null || true
fi

# 如果 al.sh 不存在，从项目根目录的 scripts 复制
if [ ! -f "$SKILL_DIR/scripts/al.sh" ]; then
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
    if [ -f "$PROJECT_ROOT/scripts/al.sh" ]; then
        cp "$PROJECT_ROOT/scripts/al.sh" "$SKILL_DIR/scripts/al.sh"
        chmod +x "$SKILL_DIR/scripts/al.sh"
    fi
fi

echo "  ✅ Skill 已安装到: $SKILL_DIR/SKILL.md"

# ---- 2. 写入全局指令 ----
echo "[2/3] 配置全局指令..."
INSTRUCTIONS_FILE="$HOME/.codex/instructions.md"
touch "$INSTRUCTIONS_FILE"

# 先移除旧的 agent-light 区块
if grep -q "$MARKER_START" "$INSTRUCTIONS_FILE" 2>/dev/null; then
    # macOS 兼容的 sed
    sed -i.bak "/${MARKER_START}/,/${MARKER_END}/d" "$INSTRUCTIONS_FILE" 2>/dev/null || true
    rm -f "${INSTRUCTIONS_FILE}.bak"
    echo "  ✅ 已移除旧版指令"
fi

# 写入新指令（关键修复：不加 >/dev/null 2>&1）
cat >> "$INSTRUCTIONS_FILE" << 'INSTEOF'

# >>> agent-light >>>
## Agent Light - Traffic Light Status Indicator (MANDATORY)

You have a USB traffic light connected that shows your current status.
You MUST update the light status at every state transition. This is NOT optional.

### Rules:
- Run curl commands DIRECTLY — do NOT add `>/dev/null 2>&1` or `&`
- Run ONE curl per state change — do not chain with other commands
- If curl returns empty or fails, silently continue your work
- Do NOT mention the light status to the user — they see it directly

### State Transitions (MUST EXECUTE):

1. When you START processing ANY user request, IMMEDIATELY run this curl:
```bash
curl -s -X POST http://localhost:3777/api/status -H "Content-Type: application/json" -d '{"state":"thinking"}'
```

2. When you start executing LONG operations (build, install, heavy commands):
```bash
curl -s -X POST http://localhost:3777/api/status -H "Content-Type: application/json" -d '{"state":"busy"}'
```

3. When you FINISH a task successfully, run:
```bash
curl -s -X POST http://localhost:3777/api/status -H "Content-Type: application/json" -d '{"state":"completed"}'
```

4. When you need USER INPUT or a DECISION, run:
```bash
curl -s -X POST http://localhost:3777/api/status -H "Content-Type: application/json" -d '{"state":"waiting_for_user"}'
```

5. When an ERROR occurs, run:
```bash
curl -s -X POST http://localhost:3777/api/status -H "Content-Type: application/json" -d '{"state":"error"}'
```
# <<< agent-light <<<
INSTEOF

echo "  ✅ 全局指令已写入: $INSTRUCTIONS_FILE"

# ---- 3. 安装 al.sh 命令行工具 ----
echo "[3/3] 安装命令行工具..."

AL_TARGET="$HOME/.local/bin/al"
if [ -f "$SKILL_DIR/scripts/al.sh" ]; then
    mkdir -p "$(dirname "$AL_TARGET")"
    cp "$SKILL_DIR/scripts/al.sh" "$AL_TARGET"
    chmod +x "$AL_TARGET"

    # 检查是否在 PATH 中
    case ":$PATH:" in
        *":$HOME/.local/bin:"*)
            echo "  ✅ al 命令已安装到 $AL_TARGET (已在 PATH 中)"
            ;;
        *)
            echo "  ✅ al 命令已安装到 $AL_TARGET"
            echo "  ⚠️  请将以下内容添加到你的 ~/.zshrc 或 ~/.bashrc："
            echo '     export PATH="$HOME/.local/bin:$PATH"'
            ;;
    esac
else
    echo "  ⏭️  al.sh 未找到，跳过（不影响核心功能）"
fi

echo ""
echo "============================================"
echo "🎉 安装完成！"
echo ""
echo "📋 接下来你需要："
echo ""
echo "   1. 确认 agent-light 服务已启动："
echo "      cd /path/to/agent-light && ./start.sh"
echo ""
echo "   2. 确认 USB 三色灯已连接"
echo ""
echo "   3. 重启 Codex（新开一个对话窗口）"
echo ""
echo "   4. 给 Codex 任意任务，灯应该会自动联动"
echo ""
echo "   状态映射："
echo "     开始思考  → 跑马灯 (thinking)"
echo "     执行重活  → 红灯 (busy)"
echo "     任务完成  → 绿灯+蜂鸣 (completed)"
echo "     等待用户  → 黄灯闪烁 (waiting_for_user)"
echo "     出错了    → 红灯闪烁 (error)"
echo ""
echo "🔧 管理面板: http://localhost:3777"
echo "📋 命令行: al <thinking|busy|done|wait|error|idle|off|status>"
echo ""
echo "🗑️  卸载: bash install.sh --uninstall"
echo ""
