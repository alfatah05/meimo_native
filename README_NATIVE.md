# Meimo Native (Capacitor Android)

Project ini sudah siap di-copy ke GitHub repo. GitHub Actions akan otomatis build APK saat push ke `main`/`master`.

## Quick start (lokal)

```bash
git clone <repo-mu>
cd meimo
npm install --legacy-peer-deps
npx cap add android          # hanya pertama kali
npx cap sync android
npx cap open android         # buka di Android Studio, Run
```

Atau biarkan **GitHub Actions** yang build:
1. Push project ini ke repo (branch `main` atau `master`)
2. Buka tab **Actions** → workflow **Build Android APK**
3. Download artifact `meimo-android-debug`

## Fitur native yang sudah aktif

| Fitur | Status |
|-------|--------|
| Hardware back button HP | ✅ `history.back()` + View Transitions tetap sama |
| StatusBar + NavBar warna = tema | ✅ Sinkron real-time + cold start |
| Splash screen `#1E1E1E` | ✅ |
| Safe-area padding (tidak tertutup bar) | ✅ `viewport-fit=cover` + env(safe-area) |
| Download note (.meimo) & backup .zip ke folder Download Android | ✅ Filesystem ExternalStorage |
| Storage IndexedDB → Filesystem (Directory.Data) | ✅ Dual backend (native pakai FS, web tetap IDB) |
| Animasi transisi halaman | ✅ Tidak diubah (menu, header back, back HP) |
| Icon status bar kontras | ✅ LIGHT/DARK otomatis per tema |

## Struktur penting

- `capacitor.config.json` — konfigurasi app + splash
- `src/js/native/capacitor-bridge.js` — StatusBar, App back, saveToDownloads
- `src/js/db/fs-storage.js` + `notes-repository.js` — storage native
- `.github/workflows/android.yml` — CI build APK
- `.gitignore` — node_modules, android/, dll

## Catatan

- Folder `android/` **tidak** ikut di-commit (dihasilkan oleh `cap add` / CI).
- Permission storage otomatis di-patch oleh workflow.
- Kalau asset gambar tidak muncul di native setelah pakai FS, cek konversi base64→Blob di image pipeline.
