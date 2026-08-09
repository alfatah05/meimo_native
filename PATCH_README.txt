Meimo Native Patch v1.23.22-cap4
================================

FULL migrasi penyimpanan → Capacitor Filesystem (Directory.Data)

Android path (approx):
  /data/data/com.meimo.notes/files/meimo-data/
    notes/{id}.json
    assets/{id}.bin + {id}.meta.json
    fonts/{id}.json
    settings.json
    _meta.json

Perilaku:
  - Native: SEMUA notes/assets/fonts/settings lewat Filesystem (bukan IndexedDB)
  - First launch: migrasi otomatis IDB → FS, lalu hapus IDB
  - Web browser: tetap IndexedDB (dev/PWA)

File penting:
  src/js/db/fs-storage.js
  src/js/db/migrate-to-fs.js
  src/js/db/notes-repository.js
  src/js/db/fonts-repository.js
  src/js/db/settings-repository.js
  src/js/spa-app.js  (await init + migrate sebelum load notes)

Apply:
  unzip -o meimo-patch-v1.23.22-cap4.zip
  git add . && git commit -m "feat: full Filesystem storage + IDB migration (cap4)" && git push
