#!/usr/bin/env bash
# Patch Android project setelah `cap add` / `cap sync`
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PKG_DIR="android/app/src/main/java/com/meimo/notes"
mkdir -p "$PKG_DIR"

for f in MeimoSystemBarsPlugin.java MeimoFileSaverPlugin.java NavigationBarPlugin.java MeimoPermissionsPlugin.java MainActivity.java; do
  if [ -f "android-patches/$f" ]; then
    cp "android-patches/$f" "$PKG_DIR/"
    echo "[patch] copied $f"
  else
    echo "[patch] MISSING android-patches/$f" >&2
  fi
done

MANIFEST="android/app/src/main/AndroidManifest.xml"
if [ ! -f "$MANIFEST" ]; then
  echo "[patch] ERROR: $MANIFEST not found" >&2
  exit 1
fi

python3 - <<'PY'
from pathlib import Path
import re

manifest_path = Path("android/app/src/main/AndroidManifest.xml")
text = manifest_path.read_text(encoding="utf-8")

permissions = [
    ('android.permission.RECORD_AUDIO', '<uses-permission android:name="android.permission.RECORD_AUDIO" />'),
    ('android.permission.MODIFY_AUDIO_SETTINGS', '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />'),
    ('android.permission.WRITE_EXTERNAL_STORAGE', '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />'),
    ('android.permission.READ_EXTERNAL_STORAGE', '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />'),
]

# features (optional mic)
features = [
    ('android.hardware.microphone', '<uses-feature android:name="android.hardware.microphone" android:required="false" />'),
]

insert_block = []
for key, line in permissions:
    if key not in text:
        insert_block.append("    " + line)
        print(f"[patch] will add permission: {key}")
    else:
        print(f"[patch] already has: {key}")

for key, line in features:
    if key not in text:
        insert_block.append("    " + line)
        print(f"[patch] will add feature: {key}")

if insert_block:
    block = "\n".join(insert_block) + "\n"
    # Insert before <application
    if re.search(r"\n\s*<application\b", text):
        text = re.sub(r"(\n\s*)(<application\b)", r"\1" + block + r"\2", text, count=1)
    elif "</manifest>" in text:
        text = text.replace("</manifest>", block + "</manifest>", 1)
    else:
        raise SystemExit("Cannot find insertion point in AndroidManifest.xml")
    manifest_path.write_text(text, encoding="utf-8")
    print("[patch] AndroidManifest.xml updated")
else:
    print("[patch] AndroidManifest.xml already complete")

# requestLegacyExternalStorage
text = manifest_path.read_text(encoding="utf-8")
if "requestLegacyExternalStorage" not in text:
    text2, n = re.subn(
        r"<application\b",
        '<application android:requestLegacyExternalStorage="true"',
        text,
        count=1,
    )
    if n:
        manifest_path.write_text(text2, encoding="utf-8")
        print("[patch] added requestLegacyExternalStorage")

print("--- manifest permissions ---")
for line in manifest_path.read_text(encoding="utf-8").splitlines():
    if "uses-permission" in line or "uses-feature" in line or "<application" in line:
        print(line)
PY

# Styles
for STYLES in android/app/src/main/res/values/styles.xml android/app/src/main/res/values/themes.xml; do
  if [ -f "$STYLES" ] && ! grep -q "navigationBarColor" "$STYLES"; then
    python3 - <<PY
from pathlib import Path
p = Path("$STYLES")
t = p.read_text(encoding="utf-8")
item = '''
        <item name="android:navigationBarColor">#17181C</item>
        <item name="android:statusBarColor">#17181C</item>
        <item name="android:windowLightStatusBar">false</item>
        <item name="android:windowLightNavigationBar">false</item>
        <item name="android:windowDrawsSystemBarBackgrounds">true</item>
'''
if "</style>" in t and "navigationBarColor" not in t:
    t = t.replace("</style>", item + "    </style>", 1)
    p.write_text(t, encoding="utf-8")
    print(f"[patch] styles updated: {p}")
PY
  fi
done

echo "[patch] java plugins:"
ls -la "$PKG_DIR"
