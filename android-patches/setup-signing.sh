#!/usr/bin/env bash
set -euo pipefail
cd android
mkdir -p keystore

if [ -n "${KEYSTORE_BASE64:-}" ]; then
  echo "Using KEYSTORE from environment"
  echo "$KEYSTORE_BASE64" | base64 -d > keystore/meimo-release.jks
  STORE_PASS="${KEYSTORE_PASSWORD:?}"
  KEY_PASS="${KEY_PASSWORD:?}"
  ALIAS="${KEY_ALIAS:?}"
else
  echo "WARNING: generating TEMP upload keystore (replace for production)"
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

cat > keystore/signing.properties << PROP
storeFile=keystore/meimo-release.jks
storePassword=${STORE_PASS}
keyAlias=${ALIAS}
keyPassword=${KEY_PASS}
PROP

# Inject signingConfigs into app/build.gradle if Groovy
if [ -f app/build.gradle ] && ! grep -q "signingConfigs" app/build.gradle; then
  python3 - <<'PY'
from pathlib import Path
import re
p = Path("app/build.gradle")
t = p.read_text(encoding="utf-8")
signing = '''
    signingConfigs {
        release {
            def propsFile = rootProject.file("keystore/signing.properties")
            if (propsFile.exists()) {
                def props = new Properties()
                props.load(new FileInputStream(propsFile))
                storeFile file(props["storeFile"])
                storePassword props["storePassword"]
                keyAlias props["keyAlias"]
                keyPassword props["keyPassword"]
            }
        }
    }
'''
t = re.sub(r'(android\s*\{)', r'\1\n' + signing, t, count=1)
if "signingConfig signingConfigs.release" not in t:
    t = re.sub(
        r'(release\s*\{)',
        r'\1\n            signingConfig signingConfigs.release',
        t,
        count=1,
    )
p.write_text(t, encoding="utf-8")
print("signingConfigs injected into app/build.gradle")
PY
fi

echo "SIGNING_READY alias=$ALIAS"
