# Meimo — Rilis Play Store

## Identitas app
- **Package / applicationId:** `com.meimo.app`
- **Nama:** Meimo
- **Version:** 1.24.0 (versionCode 12400)
- **Icon:** custom (kucing putih)

## Artifact dari GitHub Actions
1. **meimo-release-aab** → unggah ke Play Console (App Bundle)
2. **meimo-release-apk** → uji install manual

## Signing (penting)
Tanpa GitHub Secrets, CI membuat **keystore sementara**.

Untuk rilis produksi, buat keystore sendiri lalu set Secrets:

```bash
keytool -genkeypair -v \
  -keystore meimo-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias meimo \
  -dname "CN=Meimo, O=Meimo, C=ID"

base64 -w0 meimo-upload.jks > keystore.b64
```

GitHub → Settings → Secrets:
- `KEYSTORE_BASE64` = isi file keystore.b64
- `KEYSTORE_PASSWORD`
- `KEY_PASSWORD`
- `KEY_ALIAS` = meimo

## Play Console checklist
- [ ] Buat app baru, package `com.meimo.app`
- [ ] Upload AAB (Production / Testing)
- [ ] Store listing (judul, deskripsi, screenshot)
- [ ] Icon 512×512: `android-patches/icons/playstore-icon-512.png`
- [ ] Privacy policy URL (halaman privacy di app)
- [ ] Content rating, target audience
- [ ] Data safety form

## Catatan
- Uninstall build debug (`com.meimo.notes`) sebelum install release (`com.meimo.app`) — package beda.
- Simpan keystore & password di tempat aman; hilang = tidak bisa update app di Play Store.
