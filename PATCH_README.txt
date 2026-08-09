Meimo patch v1.23.22-cap10 — mikrofon: pastikan RECORD_AUDIO masuk APK

Perubahan:
- patch-android.sh menulis permission dengan verifikasi (exit 1 jika gagal)
- CI cetak FULL AndroidManifest.xml di log
- CI cek RECORD_AUDIO di dalam APK (aapt dump) — build gagal jika tidak ada

WAJIB setelah push:
1. Buka Actions → log step "Patch Android" → harus ada:
   [patch] all required permissions present OK
   dan baris: <uses-permission android:name="android.permission.RECORD_AUDIO" />
2. Log step "Verify permissions inside APK" → APK contains RECORD_AUDIO OK
3. Uninstall app lama di HP
4. Install artifact baru

Kalau step Verify gagal, kirim log step Patch Android + Verify permissions.
