#!/usr/bin/env bash
# When Claude Code runs git, main changes only through pull requests.
# CLAUDECODE=1 is set in Claude Code's shells, so the owner's own commits are not affected.
set -uo pipefail
[ "${CLAUDECODE:-}" = "1" ] || exit 0
if [ "$(git branch --show-current)" = "main" ]; then
  echo "Blocked: Claude never commits on main. Create a branch first: git switch -c <type>/<topic>" >&2
  exit 1
fi
