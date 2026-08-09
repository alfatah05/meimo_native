#!/usr/bin/env bash
# Siapkan folder www/ untuk Capacitor webDir
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

rm -rf www
mkdir -p www

EXCLUDE_ARGS=(
  --exclude=android
  --exclude=ios
  --exclude=node_modules
  --exclude=.git
  --exclude=.github
  --exclude=www
  --exclude=scripts
  --exclude=.gitignore
  --exclude=package.json
  --exclude=package-lock.json
  --exclude=capacitor.config.json
  --exclude=capacitor.config.ts
  --exclude='*.md'
  --exclude=htaccess
  --exclude=php.ini
)

if command -v rsync >/dev/null 2>&1; then
  rsync -a "${EXCLUDE_ARGS[@]}" ./ www/
else
  # Fallback tanpa rsync (copy selektif)
  for item in \
    index.html about.html arsip.html cadangkan.html card-style.html \
    download.html editor.html fitur-ai.html font-manager.html \
    privacy-policy.html settings.html trash.html \
    manifest.json service-worker.js \
    assets src
  do
    if [ -e "$item" ]; then
      cp -a "$item" www/
    fi
  done
fi

if [ ! -f www/index.html ]; then
  echo "ERROR: www/index.html missing after prepare"
  exit 1
fi

echo "www/ prepared successfully ($(du -sh www | cut -f1))"
