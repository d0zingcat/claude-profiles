#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DEMO_HOME:-}" ]]; then
  echo "DEMO_HOME is not set" >&2
  exit 1
fi

mkdir -p "${DEMO_HOME}/.claude-profiles/backups" "${DEMO_HOME}/.claude"

NOW="2026-06-24T00:00:00.000Z"

cat > "${DEMO_HOME}/.claude-profiles/profiles.json" <<EOF
{
  "version": 1,
  "active": "work",
  "profiles": [
    {
      "name": "work",
      "baseUrl": "https://api.work.example.com",
      "authToken": "sk-work-demo-token-0001",
      "createdAt": "${NOW}",
      "updatedAt": "${NOW}"
    },
    {
      "name": "personal",
      "baseUrl": "https://api.personal.example.com",
      "authToken": "sk-personal-demo-0002",
      "createdAt": "${NOW}",
      "updatedAt": "${NOW}"
    }
  ]
}
EOF

cat > "${DEMO_HOME}/.claude/settings.json" <<EOF
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.work.example.com",
    "ANTHROPIC_AUTH_TOKEN": "sk-work-demo-token-0001"
  },
  "permissions": {
    "defaultMode": "auto"
  }
}
EOF
