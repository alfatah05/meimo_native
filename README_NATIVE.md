# Meimo — Web PWA + Capacitor Native

Satu codebase, dua target:

| Target | Cara jalan | Storage | Download file |
|--------|------------|---------|---------------|
| **Web / PWA** | Serve folder root (atau `www/`) lewat HTTP | IndexedDB | `<a download>` |
| **Android native** | Capacitor + WebView | Filesystem (`Directory.Data`) | MeimoFileSaver / Share |

## Pemisahan kode

- **Kode base web** (tidak berubah perilaku di browser): HTML, `src/js/**` kecuali modul di bawah.
- **Penyesuaian native** (hanya aktif jika `Capacitor.isNativePlatform()`):
  - `src/js/native/capacitor-bridge.js` — StatusBar, back button, `saveToDownloads`
  - `src/js/native/multi-page-back.js` — hardware back di halaman non-SPA
  - `src/js/db/fs-storage.js` — penyimpanan Filesystem
  - `src/js/db/migrate-to-fs.js` — migrasi sekali IDB → FS
  - Dual-path di `notes-repository.js`, `fonts-repository.js`, `settings-repository.js` (`useFs()`)
  - Dynamic import di `spa-app.js`, `theme-manager.js`, `meimo-export.js`, `backup-service.js`

Di browser, `isNative()` selalu `false` → jalur IndexedDB + download browser tetap dipakai. Tidak ada dependency runtime ke Capacitor di web.

## Quick start — Web / PWA

```bash
# Cukup serve folder project (atau isi www/ setelah prepare)
npx serve .
# atau: python3 -m http.server 8080
```

Manifest + service worker sudah ada (`manifest.json`, `service-worker.js`).

## Quick start — Android native

```bash
npm install --legacy-peer-deps
npm run prepare:www          # salin file web → www/ (webDir Capacitor)
npx cap add android          # sekali saja
npm run assets               # generate icon/splash dari resources/
npm run cap:sync             # prepare + cap sync + patch Android (plugins, permission)
npx cap open android
# atau: npm run android:debug
```

### Icon

Icon diambil dari versi native stabil (`resources/icon.png`, `resources/icon-only.png`, `resources/splash.png`) — sama dengan `meimo_native_old_ver`.

```bash
npm run assets
```

### Plugin kustom Android

`android-patches/` berisi:

- `MainActivity.java` — register plugin
- `MeimoFileSaverPlugin.java` — simpan ke Downloads
- `MeimoSystemBarsPlugin.java` / `NavigationBarPlugin.java` — warna system bars
- `MeimoPermissionsPlugin.java`
- `patch-android.sh` — dijalankan otomatis lewat `npm run cap:sync`

## Versi

- Web base: **1.23.51** (`meimo_web_v1_23_51`)
- Native stack: Capacitor 6 (mengikuti pola stabil `meimo_native_old_ver`)
- App ID: `com.meimo.app`

## GitHub Actions

Workflow `.github/workflows/android.yml` build APK debug saat push ke main/master.


## Deploy Web ke FTP (GitHub Actions)

Workflow: `.github/workflows/deploy-ftp.yml`  
Trigger: push ke `main`/`master` atau **Run workflow** manual.

### Secrets yang perlu diisi (Settings → Secrets and variables → Actions)

| Secret | Wajib | Keterangan |
|--------|-------|------------|
| `FTP_SERVER` | ✅ | Host FTP, mis. `ftp.domain.com` atau IP |
| `FTP_USERNAME` | ✅ | Username FTP |
| `FTP_PASSWORD` | ✅ | Password FTP |
| `FTP_SERVER_DIR` | opsional | Folder remote, default `./` (mis. `public_html/` atau `www/`) |
| `FTP_PORT` | opsional | Default `21` |
| `FTP_PROTOCOL` | opsional | `ftp` (default), `ftps`, atau `ftps-legacy` |

Hanya file **web/PWA** yang di-upload (HTML, `src/`, `assets/`, `manifest.json`, `service-worker.js`, `.htaccess`).  
Folder Capacitor/Android/native **tidak** ikut di-deploy.

### Contoh isi secrets

```
FTP_SERVER=ftp.contoh.com
FTP_USERNAME=meimo
FTP_PASSWORD=********
FTP_SERVER_DIR=public_html/
```
