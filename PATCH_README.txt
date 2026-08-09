Meimo Native Patch v1.23.22-cap2
================================

FIX: skeleton loading stuck + navigasi / FAB / archive rusak

Penyebab:
  notes-repository.js meng-import fs-storage.js yang crash di load time
  (Directory masih null) → getAllNotes gagal → skeleton selamanya.

Perbaikan:
  - notes-repository.js kembali pure IndexedDB (aman di web + Capacitor WebView)
  - capacitor-bridge.js tidak pakai static import @capacitor
  - fs-storage.js lazy (siap dipakai nanti, tidak di-wire ke repository)

Cara apply (di root project):
  unzip -o meimo-patch-v1.23.22-cap2.zip
  # commit & push, atau test lokal dulu
