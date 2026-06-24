#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CAST="${ROOT}/demo/clp-demo.cast"

if ! command -v asciinema >/dev/null 2>&1; then
  echo "请先安装 asciinema: brew install asciinema" >&2
  exit 1
fi

if ! command -v expect >/dev/null 2>&1; then
  echo "请先安装 expect: brew install expect" >&2
  exit 1
fi

if ! command -v clp >/dev/null 2>&1; then
  echo "请先全局安装 clp: pnpm install -g @d0zingcat/claude-profiles" >&2
  exit 1
fi

export DEMO_HOME
DEMO_HOME="$(mktemp -d "${TMPDIR:-/tmp}/clp-demo.XXXXXX")"
DEMO_DIR="$(mktemp -d "${TMPDIR:-/tmp}/clp-demo-scripts.XXXXXX")"
trap 'rm -rf "${DEMO_HOME}" "${DEMO_DIR}"' EXIT

cp "${ROOT}/demo/record-demo.sh" "${ROOT}/demo/setup-demo-home.sh" "${ROOT}/demo/"*.exp "${DEMO_DIR}/"
chmod +x "${DEMO_DIR}/"*.sh "${DEMO_DIR}/"*.exp

echo "录制中 → ${CAST}"
asciinema rec \
  --cols 92 \
  --rows 26 \
  --title "clp - Claude Code 多端点切换" \
  --command "env DEMO_HOME='${DEMO_HOME}' bash '${DEMO_DIR}/record-demo.sh'" \
  --overwrite \
  "${CAST}"

echo ""
echo "录制完成: ${CAST}"
echo "本地回放: asciinema play ${CAST}"
echo "上传分享: asciinema upload ${CAST}"
