#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_HDR_DIR="${HDR_REPO:-/Users/calebkey/Projects/handwritten-digit-recognition}"
SUBMODULE_HDR_DIR="$PROJECT_DIR/external/hdr"

if [[ -f "$LOCAL_HDR_DIR/site/public/index.html" ]]; then
  HDR_DIR="$LOCAL_HDR_DIR"
else
  HDR_DIR="$SUBMODULE_HDR_DIR"
fi

if [[ ! -f "$HDR_DIR/site/public/index.html" ]]; then
  echo "HDR frontend build not found in $HDR_DIR/site/public" >&2
  exit 1
fi

HDR_REPO="$HDR_DIR" "$PROJECT_DIR/scripts/sync_project_sites.sh"

echo "Starting local portfolio at http://localhost:1313"
exec hugo server --source "$PROJECT_DIR" --bind 127.0.0.1 --port 1313 --disableFastRender --renderToMemory
