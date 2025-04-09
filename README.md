🚀 Deployment

This site uses a Hugo static site generator with GitHub Pages.

To deploy:
./deploy.sh

This script does the following:
• Builds the site with hugo
• Adds the gh-pages branch as a Git worktree at public/
• Commits and pushes the contents to gh-pages
• Removes the public/ worktree after deployment

The gh-pages branch is what GitHub Pages uses to serve the live site at:
https://calebkey121.github.io

Note: If the script errors because public/ already exists or was removed manually, run:
git worktree prune
