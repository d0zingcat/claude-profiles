#!/usr/bin/env bash
set -euo pipefail

DIM='\033[2m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
NC='\033[0m'

comment() {
  printf "\n${DIM}# %s${NC}\n" "$1"
  sleep 1
}

title() {
  printf "\n${BOLD}${CYAN}%s${NC}\n" "$1"
  sleep 0.6
}

run() {
  printf "${GREEN}\$${NC} ${YELLOW}%s${NC}\n" "$*"
  sleep 0.5
  "$@"
  sleep 1.2
}

run_interactive() {
  printf "${GREEN}\$${NC} ${YELLOW}%s${NC}\n" "$1"
  sleep 0.5
  shift
  "$@"
  sleep 1.2
}

export DEMO_HOME
export HOME="${DEMO_HOME}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=demo/setup-demo-home.sh
source "${SCRIPT_DIR}/setup-demo-home.sh"

clear_screen() {
  printf '\033[2J\033[H'
}

clear_screen
title "clp — Claude Code 多端点配置切换"
comment "全局安装：pnpm install -g @d0zingcat/claude-profiles"
printf "${DIM}\$ pnpm install -g @d0zingcat/claude-profiles${NC}\n"
sleep 1.5

comment "查看已保存的 profile"
run clp list

comment "查看当前 Claude Code 生效配置"
run clp current

comment "交互式添加 profile（方向键 + 回车，无需记命令参数）"
run_interactive "clp add" expect -f "${SCRIPT_DIR}/interactive-add.exp"

comment "添加完成，确认 profile 列表"
run clp list

comment "永久切换到 personal（会写入 ~/.claude/settings.json）"
run clp use personal

run clp current

comment "交互式 run：现场选择 profile，临时启动 Claude Code"
run_interactive "clp run" expect -f "${SCRIPT_DIR}/interactive-run.exp"
sleep 0.4
clear_screen

comment "run 结束后，持久配置仍是 personal"
run clp current

comment "一键还原到切换前（undo / restore）"
run clp undo

run clp current

title "更多：clp use（永久） · clp run（临时） · clp import cc-switch"
printf "${DIM}文档：https://github.com/d0zingcat/claude-profiles${NC}\n"
sleep 2
