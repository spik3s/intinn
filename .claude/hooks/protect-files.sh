#!/usr/bin/env bash
# PreToolUse (Edit|Write): keep secrets and applied migrations untouched.
set -uo pipefail
file=$(jq -r '.tool_input.file_path // empty')
[ -n "$file" ] || exit 0
case "$(basename "$file")" in
  .env.example) ;;
  .env | .env.*)
    echo "Blocked: $file holds secrets. Change .env.example and tell the owner which value to set." >&2
    exit 2
    ;;
esac
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"
case "$file" in
  */apps/bot/src/db/migrations/* | apps/bot/src/db/migrations/*)
    if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
      echo "Blocked: $file is a committed migration. Generate a new one with: pnpm --filter @intinn/bot db:generate" >&2
      exit 2
    fi
    ;;
esac
exit 0
