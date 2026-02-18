#!/usr/bin/env bash
set -euo pipefail

rm -rf static/hdr static/chinese-reader
mkdir -p static/hdr static/chinese-reader

rsync -a --delete external/hdr/site/public/ static/hdr/
rsync -a --delete external/chinese-reader/site/public/ static/chinese-reader/