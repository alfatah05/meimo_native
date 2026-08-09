#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/android"
mkdir -p keystore

if [ -n "${KEYSTORE_BASE64:-}" ]; then
  echo "Using KEYSTORE from environment"
  echo "$KEYSTORE_BASE64" | base64 -d > keystore/meimo-release.jks
  STORE_PASS="${KEYSTORE_PASSWORD:?missing KEYSTORE_PASSWORD}"
  KEY_PASS="${KEY_PASSWORD:?missing KEY_PASSWORD}"
  ALIAS="${KEY_ALIAS:?missing KEY_ALIAS}"
else
  echo "WARNING: generating TEMP upload keystore"
  STORE_PASS="meimo-temp-store"
  KEY_PASS="meimo-temp-key"
  ALIAS="meimo"
  if [ ! -f keystore/meimo-release.jks ]; then
    keytool -genkeypair -v \
      -keystore keystore/meimo-release.jks \
      -keyalg RSA -keysize 2048 -validity 10000 \
      -alias "$ALIAS" \
      -storepass "$STORE_PASS" \
      -keypass "$KEY_PASS" \
      -dname "CN=Meimo, OU=Mobile, O=Meimo, L=Jakarta, ST=Jakarta, C=ID"
  fi
fi

# Absolute path so Gradle resolves correctly from :app module
STORE_ABS="$(pwd)/keystore/meimo-release.jks"
cat > keystore/signing.properties << PROP
storeFile=${STORE_ABS}
storePassword=${STORE_PASS}
keyAlias=${ALIAS}
keyPassword=${KEY_PASS}
PROP

echo "[signing] keystore=$STORE_ABS alias=$ALIAS"

# Inject into app/build.gradle (Groovy)
if [ -f app/build.gradle ]; then
  python3 - <<'PY'
from pathlib import Path
import re

p = Path("app/build.gradle")
t = p.read_text(encoding="utf-8")

# Remove previously broken signingConfigs block if any
t = re.sub(
    r"\s*signingConfigs\s*\{(?:[^{}]|\{[^{}]*\})*\}\s*",
    "\n",
    t,
    count=1,
)

signing = '''
    signingConfigs {
        release {
            def ks = rootProject.file("keystore/signing.properties")
            if (ks.exists()) {
                def props = new Properties()
                props.load(new FileInputStream(ks))
                storeFile file(props["storeFile"])
                storePassword props["storePassword"]
                keyAlias props["keyAlias"]
                keyPassword props["keyPassword"]
            }
        }
    }
'''

if "signingConfigs" not in t:
    t = re.sub(r"(android\s*\{)", r"\1\n" + signing, t, count=1)

# Ensure release buildType uses signingConfig
if "signingConfig signingConfigs.release" not in t:
    # Match release { ... } inside buildTypes
    def replacer(m):
        body = m.group(0)
        if "signingConfig" in body:
            return body
        return body.replace("release {", "release {\n            signingConfig signingConfigs.release", 1)
    t2, n = re.subn(r"release\s*\{", "release {\n            signingConfig signingConfigs.release", t, count=1)
    t = t2
    print(f"[signing] release signingConfig injected (n={n})")

# Disable minify if it causes release failures without proguard rules
t = re.sub(r"minifyEnabled\s+true", "minifyEnabled false", t)
t = re.sub(r"shrinkResources\s+true", "shrinkResources false", t)

p.write_text(t, encoding="utf-8")
print("[signing] app/build.gradle updated")
# show relevant section
for i, line in enumerate(p.read_text().splitlines(), 1):
    if any(k in line for k in ("signingConfig", "signingConfigs", "minifyEnabled", "applicationId", "versionCode", "versionName", "namespace")):
        print(f"  {i}: {line}")
PY
fi

# Kotlin DSL fallback
if [ -f app/build.gradle.kts ] && ! grep -q "signingConfigs" app/build.gradle.kts; then
  echo "[signing] WARNING: build.gradle.kts detected — manual signing may be needed"
fi

echo "SIGNING_READY"
