#!/usr/bin/env bash
# PreToolUse (Bash): main changes only through pull requests.
set -uo pipefail
cmd=$(jq -r '.tool_input.command // empty')
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"
branch=$(git branch --show-current 2>/dev/null || true)
if [[ "$cmd" =~ git[[:space:]]+commit ]] && [ "$branch" = "main" ]; then
  echo "Blocked: never commit on main. Create a branch first: git switch -c <type>/<topic>" >&2
  exit 2
fi
if [[ "$cmd" =~ git[[:space:]]+push ]]; then
  if [[ "$cmd" =~ (^|[[:space:]:+])main([[:space:]]|$) ]] || [ "$branch" = "main" ]; then
    echo "Blocked: never push to main or from main. Push a branch and open a pull request." >&2
    exit 2
  fi
fi
exit 0
