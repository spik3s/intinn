#!/usr/bin/env bash
# Stop: don't let Claude finish while the code does not type-check.
set -uo pipefail
# A second Stop in a row means Claude already tried to fix it; let it stop instead of looping.
[ "$(jq -r '.stop_hook_active // false')" = "true" ] && exit 0
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"
pnpm -s typecheck 1>&2 || exit 2
