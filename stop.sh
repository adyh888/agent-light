#!/bin/bash
# Agent Light 停止脚本

echo "🛑 停止 Agent Light 服务..."

cd "$(dirname "$0")"

# 停止后端（端口 3777）
if lsof -i :3777 >/dev/null 2>&1; then
    echo "📡 停止后端服务 (端口 3777)..."
    lsof -i :3777 | grep LISTEN | awk '{print $2}' | sort -u | xargs kill -9 2>/dev/null
    sleep 1
    echo "✅ 后端服务已停止"
else
    echo "ℹ️  后端服务未运行"
fi

# 停止前端开发服务器（端口 5173）
if lsof -i :5173 >/dev/null 2>&1; then
    echo "🌐 停止前端开发服务器 (端口 5173)..."
    lsof -i :5173 | grep LISTEN | awk '{print $2}' | sort -u | xargs kill -9 2>/dev/null
    sleep 1
    echo "✅ 前端开发服务器已停止"
else
    echo "ℹ️  前端开发服务器未运行"
fi

# 停止所有相关 node 进程
pkill -f "node.*agent-light" 2>/dev/null
pkill -f "node.*vite.*agent-light" 2>/dev/null

echo ""
echo "✨ 所有服务已停止！"
