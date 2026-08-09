#!/usr/bin/env bash
# Patch Android project setelah cap add / cap sync
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[patch] root=$ROOT"

PKG_DIR="android/app/src/main/java/com/meimo/app"
mkdir -p "$PKG_DIR"
# Hapus package lama jika ada
rm -rf android/app/src/main/java/com/meimo/notes 2>/dev/null || true

for f in MeimoSystemBarsPlugin.java MeimoFileSaverPlugin.java NavigationBarPlugin.java MeimoPermissionsPlugin.java MainActivity.java; do
  src="android-patches/$f"
  if [ -f "$src" ]; then
    cp "$src" "$PKG_DIR/"
    echo "[patch] copied $f -> $PKG_DIR"
  else
    echo "[patch] ERROR missing $src" >&2
    exit 1
  fi
done

# --- Icons FULL (no adaptive = no safe-zone padding) ---
RES="android/app/src/main/res"
if [ -d "android-patches/icons" ] && [ -d "$RES" ]; then
  # Adaptive icon = sumber "padding" di launcher. Hapus total.
  rm -rf "$RES/mipmap-anydpi-v26" 2>/dev/null || true
  rm -f "$RES/mipmap-anydpi-v26"/* 2>/dev/null || true
  find "$RES" -name "ic_launcher*.xml" -delete 2>/dev/null || true

  for dens in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
    mkdir -p "$RES/mipmap-$dens"
    SRC="android-patches/icons/ic_launcher_${dens}.png"
    if [ -f "$SRC" ]; then
      cp "$SRC" "$RES/mipmap-$dens/ic_launcher.png"
      cp "$SRC" "$RES/mipmap-$dens/ic_launcher_round.png"
      cp "$SRC" "$RES/mipmap-$dens/ic_launcher_foreground.png"
      # hapus .webp default Capacitor jika ada
      rm -f "$RES/mipmap-$dens/ic_launcher.webp" "$RES/mipmap-$dens/ic_launcher_round.webp" "$RES/mipmap-$dens/ic_launcher_foreground.webp" 2>/dev/null || true
      echo "[patch] icon mipmap-$dens FULL"
    fi
  done

  # Capacitor already ships values/ic_launcher_background.xml — JANGAN
  # menambah color yang sama di colors.xml (Duplicate resources).
  # Hanya update warna file resmi jika ada.
  mkdir -p "$RES/values"
  # Selalu tulis background gelap (jangan putih default)
  cat > "$RES/values/ic_launcher_background.xml" << 'COLORXML'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#1E1E1E</color>
</resources>
COLORXML
  echo "[patch] ic_launcher_background.xml = #1E1E1E"
  # Jangan biarkan adaptive icon kembali (bikin "padding" aman ~18%)
  rm -rf "$RES/mipmap-anydpi-v26" 2>/dev/null || true
  # Pastikan colors.xml TIDAK berisi ic_launcher_background
  if [ -f "$RES/values/colors.xml" ] && grep -q "ic_launcher_background" "$RES/values/colors.xml"; then
    python3 - <<'PY2'
from pathlib import Path
import re
p = Path("android/app/src/main/res/values/colors.xml")
t = p.read_text(encoding="utf-8")
t2 = re.sub(r'\s*<color\s+name="ic_launcher_background"[^>]*>[^<]*</color>\s*', '\n', t)
p.write_text(t2, encoding="utf-8")
print("[patch] removed duplicate ic_launcher_background from colors.xml")
PY2
  fi
  echo "[patch] icons installed (legacy mipmap)"
fi

MANIFEST="android/app/src/main/AndroidManifest.xml"
if [ ! -f "$MANIFEST" ]; then
  echo "[patch] ERROR: $MANIFEST not found" >&2
  find android -name "AndroidManifest.xml" 2>/dev/null || true
  exit 1
fi

echo "[patch] manifest before:"
cat "$MANIFEST"

python3 - <<'PY'
from pathlib import Path
import re
import sys

path = Path("android/app/src/main/AndroidManifest.xml")
raw = path.read_text(encoding="utf-8").replace("\r\n", "\n")

# Ensure package / applicationId references if present as attribute (legacy)
raw = raw.replace("com.meimo.notes", "com.meimo.app")

REQUIRED = [
    'android.permission.RECORD_AUDIO',
    'android.permission.MODIFY_AUDIO_SETTINGS',
    'android.permission.WRITE_EXTERNAL_STORAGE',
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.INTERNET',
]

TAGS = {
    'android.permission.RECORD_AUDIO':
        '    <uses-permission android:name="android.permission.RECORD_AUDIO" />',
    'android.permission.MODIFY_AUDIO_SETTINGS':
        '    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />',
    'android.permission.WRITE_EXTERNAL_STORAGE':
        '    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" />',
    'android.permission.READ_EXTERNAL_STORAGE':
        '    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />',
    'android.permission.INTERNET':
        '    <uses-permission android:name="android.permission.INTERNET" />',
}

FEATURE_MIC = '    <uses-feature android:name="android.hardware.microphone" android:required="false" />'

to_insert = []
for p in REQUIRED:
    if f'android:name="{p}"' not in raw:
        to_insert.append(TAGS[p])
if 'android.hardware.microphone' not in raw:
    to_insert.append(FEATURE_MIC)

if to_insert:
    block = "\n".join(to_insert) + "\n"
    m = re.search(r'(<manifest\b[^>]*>\s*\n)', raw)
    if m:
        raw = raw[:m.end()] + block + raw[m.end():]
    else:
        m2 = re.search(r'(\n)(\s*<application\b)', raw)
        if not m2:
            print("FATAL no insertion point", file=sys.stderr)
            sys.exit(1)
        raw = raw[:m2.start(1)+1] + block + raw[m2.start(2):]

if 'requestLegacyExternalStorage' not in raw:
    raw2, n = re.subn(r'<application\b', '<application android:requestLegacyExternalStorage="true"', raw, count=1)
    if n:
        raw = raw2

path.write_text(raw, encoding="utf-8")
print("======== FINAL MANIFEST ========")
print(path.read_text(encoding="utf-8"))
for p in REQUIRED:
    if f'android:name="{p}"' not in path.read_text(encoding="utf-8"):
        print(f"FATAL missing {p}", file=sys.stderr)
        sys.exit(1)
print("[patch] permissions OK")
PY

# Version name/code in build.gradle
for G in android/app/build.gradle android/app/build.gradle.kts; do
  if [ -f "$G" ]; then
    python3 - "$G" <<'PY'
import re, sys
from pathlib import Path
p = Path(sys.argv[1])
t = p.read_text(encoding="utf-8")
# applicationId
t = re.sub(r'applicationId\s+"[^"]+"', 'applicationId "com.meimo.app"', t)
t = re.sub(r"applicationId\s+'[^']+'", "applicationId 'com.meimo.app'", t)
t = re.sub(r'namespace\s+"[^"]+"', 'namespace "com.meimo.app"', t)
t = re.sub(r"namespace\s+'[^']+'", "namespace 'com.meimo.app'", t)
# version
if "versionCode" in t:
    t = re.sub(r"versionCode\s+\d+", "versionCode 12400", t)
if "versionName" in t:
    t = re.sub(r'versionName\s+"[^"]+"', 'versionName "1.24.0"', t)
    t = re.sub(r"versionName\s+'[^']+'", "versionName '1.24.0'", t)
p.write_text(t, encoding="utf-8")
print(f"[patch] gradle appId/version: {p}")
print([line for line in t.splitlines() if "applicationId" in line or "namespace" in line or "versionCode" in line or "versionName" in line])
PY
  fi
done

# Styles system bars
for STYLES in android/app/src/main/res/values/styles.xml android/app/src/main/res/values/themes.xml; do
  if [ -f "$STYLES" ] && ! grep -q "navigationBarColor" "$STYLES" 2>/dev/null; then
    python3 - "$STYLES" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
t = p.read_text(encoding="utf-8")
item = '''
        <item name="android:navigationBarColor">#17181C</item>
        <item name="android:statusBarColor">#17181C</item>
        <item name="android:windowLightStatusBar">false</item>
        <item name="android:windowLightNavigationBar">false</item>
        <item name="android:windowDrawsSystemBarBackgrounds">true</item>
'''
if "</style>" in t:
    t = t.replace("</style>", item + "    </style>", 1)
    p.write_text(t, encoding="utf-8")
PY
  fi
done

echo "[patch] done. plugins:"
ls -la "$PKG_DIR"
