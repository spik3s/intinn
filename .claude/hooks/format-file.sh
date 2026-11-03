#!/usr/bin/env bash
# PostToolUse (Edit|Write): format the edited file and report lint errors back to Claude.
set -uo pipefail
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
file=$(jq -r '.tool_input.file_path // empty')
case "$file" in
  /*) ;;
  ?*) file="$root/$file" ;;
  *) exit 0 ;;
esac
# Files outside the repo (e.g. Claude's memory) are not ours to format.
[[ "$file" == "$root/"* && -f "$file" ]] || exit 0
cd "$root"
pnpm exec prettier --write --ignore-unknown "$file" >/dev/null 2>&1
case "$file" in
  *.ts | *.js | *.cjs)
    if ! out=$(pnpm exec eslint --fix "$file" 2>&1); then
      echo "$out" >&2
      exit 2
    fi
    ;;
esac
exit 0
