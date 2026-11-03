#!/usr/bin/env bash
# PreToolUse (Bash): don't let Claude skip the git hooks that keep main safe (git-guard-main.sh).
set -uo pipefail
# Fail closed: without jq we cannot read the command.
cmd=$(jq -r '.tool_input.command // empty') || exit 2
block() {
  echo "Blocked: $1. Fix the problem the hook reports instead of skipping it." >&2
  exit 2
}
[[ "$cmd" =~ --no-verify ]] && block "--no-verify skips git hooks"
[[ "$cmd" =~ LEFTHOOK(_EXCLUDE)?= ]] && block "LEFTHOOK variables turn git hooks off"
[[ "$cmd" =~ core\.hooks[Pp]ath ]] && block "core.hooksPath replaces the git hooks"
if [[ "$cmd" =~ git[[:space:]].*commit ]] && [[ "$cmd" =~ (^|[[:space:]])-[a-zA-Z]*n[a-zA-Z]*([[:space:]]|$) ]]; then
  block "git commit -n skips git hooks"
fi
exit 0
