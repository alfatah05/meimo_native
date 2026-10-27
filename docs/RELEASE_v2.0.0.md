# Meimo v2.0.0 — Release notes

## Ringkasan
Online shared notes **opsional** di atas fondasi offline-first v1. Tidak ada akun pengguna.

## Yang baru
- Share note → pindah ke tab Shared; akses lewat noteId + kode 8 karakter
- Owner Key (device) untuk unshare & ganti kode akses
- Join dari app (tab Shared) atau web publik `/s/{noteId}` tanpa install
- Collab: poll adaptif, lock per block, max 5 sesi
- Server target: PHP + MySQL shared hosting (`api/`)

## Breaking / migrasi
- Tidak ada migrasi wajib untuk note lokal v1
- Note yang di-share butuh API `config.php` + schema SQL
- PWA: `CACHE_VERSION` v147 — user perlu load ulang agar shell baru ter-cache

## Deploy web
1. Unzip semua phase pack (2–7) atau merge branch `v2`
2. Upload file statis + `api/` ke hosting
3. Import `api/schema.sql`, isi `api/config.php`
4. Test `https://domain/api/index.php?action=health`

## Android
- APK workflow tetap di `main` / `workflow_dispatch`
- Setelah merge `v2` → `main`, build release APK manual dari Actions
- Naikkan `versionName`/`versionCode` di Gradle bila folder `android/` di-generate saat CI

## Tag git (manual)
```bash
git checkout v2
git tag -a v2.0.0 -m "Meimo v2.0.0 — Shared Notes"
git push origin v2
git push origin v2.0.0
# setelah stabil:
git checkout main
git merge v2
git push origin main
```
