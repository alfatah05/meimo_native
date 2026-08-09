#!/usr/bin/env bash
# Buat / verifikasi keystore release. Gagal awal jika password tidak cocok.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/android"
mkdir -p keystore

USE_SECRETS=0
if [ -n "${KEYSTORE_BASE64:-}" ] && [ -n "${KEYSTORE_PASSWORD:-}" ] && [ -n "${KEY_PASSWORD:-}" ] && [ -n "${KEY_ALIAS:-}" ]; then
  USE_SECRETS=1
fi

if [ "$USE_SECRETS" = "1" ]; then
  echo "[signing] Using keystore from GitHub Secrets"
  echo "$KEYSTORE_BASE64" | base64 -d > keystore/meimo-release.jks
  STORE_PASS="$KEYSTORE_PASSWORD"
  KEY_PASS="$KEY_PASSWORD"
  ALIAS="$KEY_ALIAS"
else
  echo "[signing] No complete secrets — generating TEMP keystore (store=key password)"
  # Satu password untuk store + key, hindari mismatch
  STORE_PASS="meimoTempStore2026"
  KEY_PASS="meimoTempStore2026"
  ALIAS="meimo"
  rm -f keystore/meimo-release.jks
  keytool -genkeypair -v \
    -keystore keystore/meimo-release.jks \
    -storetype JKS \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -alias "$ALIAS" \
    -storepass "$STORE_PASS" \
    -keypass "$KEY_PASS" \
    -dname "CN=Meimo, OU=Mobile, O=Meimo, L=Jakarta, ST=Jakarta, C=ID"
fi

STORE_ABS="$(pwd)/keystore/meimo-release.jks"
test -f "$STORE_ABS"
echo "[signing] keystore size=$(wc -c < "$STORE_ABS") bytes"

# Verifikasi password + alias SEBELUM Gradle
echo "[signing] verifying keytool -list ..."
if ! keytool -list -keystore "$STORE_ABS" -storepass "$STORE_PASS" -alias "$ALIAS" >/tmp/keytool-list.txt 2>/tmp/keytool-err.txt; then
  echo "[signing] ERROR: cannot unlock keystore with given store password" >&2
  cat /tmp/keytool-err.txt >&2 || true
  if [ "$USE_SECRETS" = "1" ]; then
    echo "[signing] Secrets KEYSTORE_PASSWORD / KEY_ALIAS salah atau KEYSTORE_BASE64 corrupt." >&2
    echo "[signing] Hapus secrets sementara ATAU perbaiki password, lalu rebuild." >&2
  fi
  exit 1
fi
cat /tmp/keytool-list.txt

# Verifikasi key password (export test)
if ! keytool -exportcert -keystore "$STORE_ABS" -storepass "$STORE_PASS" -alias "$ALIAS" -keypass "$KEY_PASS" -file /tmp/meimo-cert.cer >/dev/null 2>/tmp/keytool-err2.txt; then
  echo "[signing] ERROR: key password salah untuk alias $ALIAS" >&2
  cat /tmp/keytool-err2.txt >&2 || true
  exit 1
fi
echo "[signing] key password OK"

printf '%s\n' \
  "storeFile=${STORE_ABS}" \
  "storePassword=${STORE_PASS}" \
  "keyAlias=${ALIAS}" \
  "keyPassword=${KEY_PASS}" \
  > keystore/signing.properties

cat > keystore/signing-config.gradle << 'GRADLE'
def ksPropsFile = rootProject.file("keystore/signing.properties")
if (ksPropsFile.exists()) {
    def ksProps = new Properties()
    ksProps.load(new FileInputStream(ksPropsFile))

    android.signingConfigs {
        release {
            storeFile file(ksProps["storeFile"])
            storePassword ksProps["storePassword"]
            keyAlias ksProps["keyAlias"]
            keyPassword ksProps["keyPassword"]
        }
    }

    android.buildTypes.release.signingConfig android.signingConfigs.release
    android.buildTypes.release.minifyEnabled false
    try {
        android.buildTypes.release.shrinkResources false
    } catch (Throwable ignored) {}
    println("[signing] release signingConfig applied from signing.properties")
} else {
    throw new GradleException("[signing] keystore/signing.properties missing")
}
GRADLE

if [ -f app/build.gradle ]; then
  # Hapus apply lama jika ada, lalu append sekali
  if grep -q "signing-config.gradle" app/build.gradle; then
    echo "[signing] apply from already present"
  else
    printf '\n// Meimo release signing\napply from: rootProject.file("keystore/signing-config.gradle")\n' >> app/build.gradle
    echo "[signing] apply from added"
  fi
  sed -i 's/minifyEnabled true/minifyEnabled false/g' app/build.gradle || true
fi

echo "[signing] READY alias=$ALIAS"
echo "[signing] properties:"
# Jangan print password di log production — mask
sed 's/Password=.*/Password=***/' keystore/signing.properties
