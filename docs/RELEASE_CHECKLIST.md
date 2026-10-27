# Checklist rilis v2.0.0

## Kode
- [ ] Semua phase pack 2–6 sudah di-merge ke working tree `v2`
- [ ] `package.json` / `manifest.json` = `2.0.0`
- [ ] `service-worker.js` `CACHE_VERSION` = `v147`
- [ ] README changelog v2.0.0
- [ ] Tidak ada PLACEHOLDER / file 0-byte kritis (`index.html`, `locales.js`)

## Server
- [ ] `api/config.php` production (bukan example)
- [ ] Schema SQL ter-import
- [ ] `?action=health` → ok
- [ ] CORS `cors_origin` dikunci ke domain Meimo (bukan `*` jika memungkinkan)

## Uji
- [ ] TEST_MATRIX_v2.md bagian A (web) lulus
- [ ] Minimal 2 device/browser collab
- [ ] Unshare + join link mati

## Git / CI
- [ ] Tag `v2.0.0` di branch `v2`
- [ ] Merge `v2` → `main` setelah stabil
- [ ] Actions: Deploy FTP success (jika dipakai)
- [ ] Actions: Build APK `workflow_dispatch` di `main` success
- [ ] (Opsional) GitHub Release + APK artifact

## Post-release
- [ ] User existing: hard refresh / buka ulang PWA
- [ ] Monitor error join/share 24 jam
