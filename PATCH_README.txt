Meimo patch v1.23.22-cap9 — FIX mikrofon (RECORD_AUDIO di manifest)

Penyebab "tidak ada izin yang diminta":
  sed \n di workflow gagal menulis <uses-permission> ke AndroidManifest.
  APK terbuild TANPA RECORD_AUDIO → sistem tidak menampilkan dialog/izin.

Perbaikan:
  android-patches/patch-android.sh — Python insert RECORD_AUDIO dll. secara andal
  Workflow step "Verify RECORD_AUDIO in manifest" (gagal build jika hilang)
  MeimoPermissionsPlugin pakai requestPermissionForAlias (dialog resmi)

WAJIB:
  1. unzip + push
  2. Tunggu Actions hijau (lihat log "RECORD_AUDIO OK")
  3. Uninstall app lama di HP
  4. Install APK baru dari artifact
