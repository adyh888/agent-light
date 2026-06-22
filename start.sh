#!/bin/bash
# Agent Light 启动脚本

echo "🚀 启动 Agent Light 服务..."

cd "$(dirname "$0")"

# 检查是否已运行
if lsof -i :3777 >/dev/null 2>&1; then
    echo "⚠️  服务已在运行 (端口 3777 被占用)"
    echo "如果要重启，请先运行: ./stop.sh"
    exit 1
fi

# 启动后端服务
echo "📡 启动后端服务 (端口 3777)..."
nohup node server/index.js > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "   后端 PID: $BACKEND_PID"

# 等待后端启动
sleep 2

# 检查后端是否启动成功
if ! lsof -i :3777 >/dev/null 2>&1; then
    echo "❌ 后端启动失败，请查看 logs/backend.log"
    exit 1
fi

echo "✅ 后端服务已启动"

# 启动前端开发服务器（如果需要）
if [ "${1:-}" = "--with-web" ]; then
    echo "🌐 启动前端开发服务器 (端口 5173)..."
    cd web && nohup npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "   前端 PID: $FRONTEND_PID"
    cd ..
    sleep 3
    echo "✅ 前端开发服务器已启动"
    echo ""
    echo "📋 访问地址："
    echo "   前端开发: http://localhost:5173"
    echo "   后端 API: http://localhost:3777"
else
    echo ""
    echo "📋 访问地址："
    echo "   Web 面板: http://localhost:3777"
fi

echo ""
echo "📝 日志文件："
echo "   后端: logs/backend.log"
echo "   前端: logs/frontend.log (如果启动了)"
echo ""
echo "🛑 停止服务: ./stop.sh"
echo ""
echo "✨ 服务已启动！"
