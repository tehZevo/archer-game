#!/bin/sh
# Create a branch worktree next to the main checkout, sharing its node_modules.
#   npm run worktree -- <branch> [base]     (base defaults to master)
# The worktree lands in ../archer-game-wt/<branch>, with node_modules linked by
# ABSOLUTE path to the main checkout's real install, so the link can't end up
# pointing at itself or at the wrong depth. Never commit node_modules.
set -e
branch="$1"; base="${2:-master}"
[ -n "$branch" ] || { echo "usage: npm run worktree -- <branch> [base]" >&2; exit 1; }
main="$(cd "$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")" && pwd)"
nm="$main/node_modules"
if [ -L "$nm" ] || [ ! -d "$nm" ]; then
  echo "$nm is missing or a symlink; installing a real copy there" >&2
  rm -f "$nm"; (cd "$main" && npm ci --no-audit --no-fund)
fi
dest="$(dirname "$main")/archer-game-wt/$branch"
git -C "$main" worktree add "$dest" -b "$branch" "$base"
ln -s "$nm" "$dest/node_modules"
echo "worktree ready: $dest"
