Meimo Release Patch v1.24.0
===========================

- Package name: com.meimo.app (bukan com.meimo.notes)
- Icon aplikasi: custom (kucing putih)
- Build: release APK + AAB (Play Store)
- versionName 1.24.0 / versionCode 12400

Apply di root repo:
  unzip -o meimo-patch-v1.24.0-release.zip
  git add .
  git commit -m "release: com.meimo.app + custom icon + Play Store AAB (1.24.0)"
  git push

Setelah Actions selesai, download:
  - meimo-release-aab  → upload Play Console
  - meimo-release-apk  → uji install

Baca PLAY_STORE.md untuk signing secrets & checklist Play Store.

PENTING: uninstall app lama (com.meimo.notes) dulu — package name berubah.
