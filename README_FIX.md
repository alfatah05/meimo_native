# Fix: About & Privacy Policy tidak bisa dibuka di Capacitor Native

## Penyebab
Di web, `.htaccess` me-rewrite URL cantik:
- `/about` → `about.html`
- `/privacy-policy` → `privacy-policy.html`

Capacitor WebView **tidak punya rewrite**. Navigasi ke `/about` atau `/privacy-policy` gagal (file tidak ditemukan). Rute SPA (`/settings`, `/arsip`, …) aman karena ditangani History API di dalam `index.html`.

## Perubahan (native-only)
File yang diubah:
1. `src/js/router.js` — saat native, intercept link multi-page → `*.html`, dan `replaceState` ke `/index.html` supaya tombol back tidak mendarat di path yang 404.
2. `src/js/native/multi-page-back.js` — di halaman about/privacy, intercept klik internal (back ke library, link privacy, dll.) → path file yang valid.

Di browser (`isNative() === false`) **tidak ada perubahan perilaku**.

## Cara pasang
Salin kedua file ke project kamu (timpa yang lama), lalu:

```bash
npm run prepare:www
npm run cap:sync
# build / run Android lagi
```

Atau copy manual ke `www/src/js/...` jika sudah pernah prepare.
