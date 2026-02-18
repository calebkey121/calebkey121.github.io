#!/bin/zsh
set -e

echo "🌳 Setting up worktree for gh-pages..."

# Clean up any prior/stale worktree
if [ -d public ]; then
  git worktree remove --force public || true
  rm -rf public || true
fi
rm -rf .git/worktrees/public || true
git worktree prune || true

git worktree add -B gh-pages public gh-pages

echo "🏗️  Building site with Hugo..."
hugo

echo "📦 Committing built files to gh-pages branch..."
cd public
git add .
git commit -m "Deploy $(date +'%Y-%m-%d %H:%M:%S')" || true
git push origin gh-pages
cd ..

echo "🧹 Cleaning up worktree..."
git worktree remove --force public
git worktree prune || true

echo "✅ Deploy complete!"