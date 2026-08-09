#!/usr/bin/env bash
# Buat keystore + file gradle signing terpisah (tidak merusak brace build.gradle)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/android"
mkdir -p keystore

if [ -n "${KEYSTORE_BASE64:-}" ]; then
  echo "[signing] Using KEYSTORE from secrets"
  echo "$KEYSTORE_BASE64" | base64 -d > keystore/meimo-release.jks
  STORE_PASS="${KEYSTORE_PASSWORD:?}"
  KEY_PASS="${KEY_PASSWORD:?}"
  ALIAS="${KEY_ALIAS:?}"
else
  echo "[signing] Generating TEMP keystore"
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

STORE_ABS="$(pwd)/keystore/meimo-release.jks"
test -f "$STORE_ABS"

# Properties tanpa spasi di key
printf '%s\n' \
  "storeFile=${STORE_ABS}" \
  "storePassword=${STORE_PASS}" \
  "keyAlias=${ALIAS}" \
  "keyPassword=${KEY_PASS}" \
  > keystore/signing.properties

# Script gradle terpisah — di-apply di akhir app/build.gradle
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
    // Hindari R8 penuh tanpa rules
    android.buildTypes.release.minifyEnabled false
    if (android.buildTypes.release.hasProperty("shrinkResources")) {
        android.buildTypes.release.shrinkResources false
    }
    println("[signing] release signingConfig applied")
} else {
    println("[signing] WARNING: signing.properties missing — release may be unsigned")
}
GRADLE

# Apply dari app/build.gradle (idempotent)
if [ -f app/build.gradle ]; then
  if ! grep -q "signing-config.gradle" app/build.gradle; then
    printf '\n// Meimo release signing\napply from: rootProject.file("keystore/signing-config.gradle")\n' >> app/build.gradle
    echo "[signing] apply from added to app/build.gradle"
  fi
  # Pastikan minify false juga di file utama
  sed -i 's/minifyEnabled true/minifyEnabled false/g' app/build.gradle || true
fi

# Pastikan repo mavenCentral di settings / root
for F in settings.gradle settings.gradle.kts build.gradle build.gradle.kts; do
  if [ -f "$F" ]; then
    if ! grep -q "mavenCentral" "$F"; then
      echo "[signing] note: $F may need mavenCentral (Capacitor usually has it)"
    fi
  fi
done

echo "[signing] READY alias=$ALIAS store=$STORE_ABS"
ls -la keystore/
