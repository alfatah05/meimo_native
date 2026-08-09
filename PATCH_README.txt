Meimo patch v1.24.0-release-fix1

Fix build release APK/AAB gagal:
- signing: path keystore absolut + inject signingConfigs lebih aman
- minifyEnabled false (hindari R8 tanpa proguard rules)
- icon: hapus adaptive anydpi yang sering bikin AAPT error, pakai mipmap biasa
- CI: cetak ringkasan error Gradle yang relevan

Apply:
  unzip -o meimo-patch-v1.24.0-release-fix1.zip
  git add .
  git commit -m "fix: release build signing + icons (1.24.0-fix1)"
  git push

Kalau masih gagal, buka log step "Build Release APK + AAB"
bagian "GRADLE FAILURE SUMMARY" dan kirim isinya.
