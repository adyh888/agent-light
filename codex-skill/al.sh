#!/usr/bin/env bash
# Agent Light CLI - Quick status control for USB traffic light
# Usage: al <status>
# Status: idle|busy|thinking|wait|done|error|off|status

set -euo pipefail

AGENT_LIGHT_URL="${AGENT_LIGHT_URL:-http://localhost:3777}"

case "${1:-}" in
  idle|green|free)
    STATE="idle"
    ;;
  busy|red|working)
    STATE="busy"
    ;;
  thinking|think|process|processing)
    STATE="thinking"
    ;;
  wait|yellow|waiting|question|choice)
    STATE="waiting_for_user"
    ;;
  done|completed|finish|finished)
    STATE="completed"
    ;;
  error|fail|failed)
    STATE="error"
    ;;
  off|stop|reset)
    curl -s -X POST "${AGENT_LIGHT_URL}/api/status" \
      -H "Content-Type: application/json" \
      -d '{"state":"idle"}' 2>/dev/null
    echo "off"
    exit 0
    ;;
  status|get|show)
    curl -s "${AGENT_LIGHT_URL}/api/status" 2>/dev/null
    echo ""
    exit 0
    ;;
  *)
    echo "Agent Light CLI - Control USB traffic light for AI agent status"
    echo ""
    echo "Usage: al <status>"
    echo ""
    echo "Status commands:"
    echo "  thinking, think         跑马灯 (agent is thinking)"
    echo "  busy, red, working      红灯 (agent is working)"
    echo "  done, completed         绿灯+蜂鸣 (task done)"
    echo "  wait, yellow, choice    黄灯闪烁 (needs user decision)"
    echo "  error, fail             红灯闪烁 (error)"
    echo "  idle, green, free       灯灭 (agent is free)"
    echo "  off, stop               Turn off light"
    echo "  status, get             Show current status"
    echo ""
    echo "Environment:"
    echo "  AGENT_LIGHT_URL  Server URL (default: http://localhost:3777)"
    exit 1
    ;;
esac

curl -s -X POST "${AGENT_LIGHT_URL}/api/status" \
  -H "Content-Type: application/json" \
  -d "{\"state\":\"${STATE}\"}" 2>/dev/null

echo "${STATE}"
