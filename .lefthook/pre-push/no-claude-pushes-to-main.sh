#!/usr/bin/env bash
# When Claude Code runs git, main changes only through pull requests.
# CLAUDECODE=1 is set in Claude Code's shells, so the owner's own pushes are not affected.
set -uo pipefail
[ "${CLAUDECODE:-}" = "1" ] || exit 0
# git passes "<local ref> <local sha> <remote ref> <remote sha>" on stdin, one line per ref.
while read -r _ _ remote_ref _; do
  if [ "$remote_ref" = "refs/heads/main" ]; then
    echo "Blocked: Claude never pushes to main. Push a branch and open a pull request." >&2
    exit 1
  fi
done
