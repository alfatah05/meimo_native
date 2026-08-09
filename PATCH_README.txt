Meimo Native Patch v1.23.22-cap6
================================

ROOT CAUSE FIX:
  App static tanpa bundler → import("@capacitor/...") GAGAL di WebView.
  Semua akses plugin sekarang lewat window.Capacitor.Plugins.

BARU:
  MeimoSystemBars  → set warna StatusBar + NavigationBar + kontras ikon
  MeimoFileSaver   → simpan ke folder Download publik via MediaStore (Android 10+)

Apply:
  unzip -o meimo-patch-v1.23.22-cap6.zip
  git add . && git commit -m "fix: Capacitor.Plugins + MediaStore download + system bars (cap6)" && git push

WAJIB install APK baru dari Actions (bukan hanya refresh web).
