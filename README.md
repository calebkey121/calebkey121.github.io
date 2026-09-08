# Caleb Key Portfolio

This is a Hugo site published at <https://calebkey121.github.io> with GitHub Pages.

## Local development

Start the complete local site with:

```bash
./dev.sh
```

The site is available at <http://localhost:1313> and reloads when source files change.
The launcher uses a local checkout of the Handwritten Digit Recognition project when
available and otherwise uses the checked-in submodule revision.

## Production deployment

The `main` branch is the production source of truth. Push a reviewed commit to `main`:

```bash
git push origin main
```

GitHub Actions checks out the site and its submodules, builds Hugo, uploads the Pages
artifact, and deploys it to GitHub Pages. The deployment can also be started manually
from the repository's Actions page.

## Showcased projects

Projects with an embedded static site are included as Git submodules under `external/`.
Their built browser assets live under `site/public/` and are copied into Hugo before a
local or production build.

The project repository can send a `project_site_updated` repository-dispatch event to
this repository when its `site/` changes. The portfolio workflow then rebuilds Pages
with that project's latest `main` revision.
