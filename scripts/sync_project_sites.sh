#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HDR_DIR="${HDR_REPO:-$PROJECT_DIR/external/hdr}"

if [[ ! -f "$HDR_DIR/site/public/index.html" ]]; then
  echo "HDR frontend build not found in $HDR_DIR/site/public" >&2
  exit 1
fi

rm -rf "$PROJECT_DIR/static/hdr"
mkdir -p "$PROJECT_DIR/static/hdr"
rsync -a --delete "$HDR_DIR/site/public/" "$PROJECT_DIR/static/hdr/"
