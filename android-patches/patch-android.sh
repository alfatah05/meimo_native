#!/usr/bin/env bash
# Patch Android project setelah cap add / cap sync
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[patch] root=$ROOT"

PKG_DIR="android/app/src/main/java/com/meimo/notes"
mkdir -p "$PKG_DIR"

for f in MeimoSystemBarsPlugin.java MeimoFileSaverPlugin.java NavigationBarPlugin.java MeimoPermissionsPlugin.java MainActivity.java; do
  src="android-patches/$f"
  if [ -f "$src" ]; then
    cp "$src" "$PKG_DIR/"
    echo "[patch] copied $f"
  else
    echo "[patch] ERROR missing $src" >&2
    exit 1
  fi
done

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
raw = path.read_text(encoding="utf-8")

# Normalize line endings
raw = raw.replace("\r\n", "\n")

REQUIRED = [
    'android.permission.RECORD_AUDIO',
    'android.permission.MODIFY_AUDIO_SETTINGS',
    'android.permission.WRITE_EXTERNAL_STORAGE',
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.INTERNET',
]

# Lines to ensure exist (exact tags)
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

missing = [p for p in REQUIRED if f'android:name="{p}"' not in raw]
print("[patch] missing permissions:", missing)

to_insert = []
for p in REQUIRED:
    if f'android:name="{p}"' not in raw:
        to_insert.append(TAGS[p])
if 'android.hardware.microphone' not in raw:
    to_insert.append(FEATURE_MIC)

if to_insert:
    block = "\n".join(to_insert) + "\n"
    # Prefer: right after opening <manifest ...>
    m = re.search(r'(<manifest\b[^>]*>\s*\n)', raw)
    if m:
        idx = m.end()
        raw = raw[:idx] + block + raw[idx:]
        print("[patch] inserted after <manifest>")
    else:
        # Fallback before <application
        m2 = re.search(r'(\n)(\s*<application\b)', raw)
        if m2:
            raw = raw[:m2.start(1)+1] + block + raw[m2.start(2):]
            print("[patch] inserted before <application>")
        else:
            print("[patch] FATAL: no insertion point", file=sys.stderr)
            sys.exit(1)

# requestLegacyExternalStorage on <application>
if 'requestLegacyExternalStorage' not in raw:
    raw2, n = re.subn(
        r'<application\b',
        '<application android:requestLegacyExternalStorage="true"',
        raw,
        count=1,
    )
    if n:
        raw = raw2
        print("[patch] added requestLegacyExternalStorage")

path.write_text(raw, encoding="utf-8")
print("[patch] wrote", path)

# Verify
final = path.read_text(encoding="utf-8")
print("======== FINAL MANIFEST ========")
print(final)
print("======== END MANIFEST ========")

for p in REQUIRED:
    if f'android:name="{p}"' not in final:
        print(f"[patch] FATAL: still missing {p}", file=sys.stderr)
        sys.exit(1)

print("[patch] all required permissions present OK")
PY

# Styles
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
    print(f"[patch] styles: {p}")
PY
  fi
done

echo "[patch] plugins in $PKG_DIR:"
ls -la "$PKG_DIR"
