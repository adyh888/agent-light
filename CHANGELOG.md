# Changelog

## [Unreleased]

### Removed
- 移除所有文件中的「迪昆」品牌字样，避免商标侵权风险（保留技术型号 CH341）

---

## [1.0.0] - 2026-06-21

### Added
- WorkBuddy Skill 分发包（`workbuddy-skill/`）
- Codex Skill 分发包（`codex-skill/`）
- 完整安装指南（`DISTRIBUTION.md`）
- 状态按钮边框颜色跟随灯色动态变化
- 灯光关闭状态时 tab/按钮只显示文字，不显示灯色

### Fixed
- 状态配置 tabs 排序，空闲/忙碌移至最后
- 默认标签显示不全的问题（overflow 裁剪）
- 新窗口 Skill 不自动触发的全局记忆方案
- curl 命令 `>/dev/null 2>&1` 导致灯控不可靠的问题
