#!/bin/zsh

set -e  # Exit on any error

echo "🏗️  Building site with Hugo..."
hugo

echo "🌳 Setting up worktree for gh-pages..."
git worktree add -B gh-pages public gh-pages

echo "📦 Committing built files to gh-pages branch..."
cd public
git add .
git commit -m "Deploy $(date +'%Y-%m-%d %H:%M:%S')"
git push origin gh-pages
cd ..

echo "🧹 Cleaning up worktree..."
git worktree remove public

echo "✅ Deploy complete!"
