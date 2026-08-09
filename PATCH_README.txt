Meimo Native Patch v1.23.22-cap1
================================

Cara apply ke project PWA original (meimo_v1_23_22_spa):

1. Unzip patch ini di root project (overwrite file yang sama path-nya)
2. Pastikan folder scripts/ ikut terbentuk
3. Push ke GitHub (branch main/master)
4. Actions akan build APK otomatis (Node 22 + Java 21)

File yang di-patch/ditambah:
- capacitor.config.json          (webDir=www, splash #1E1E1E)
- package.json                   (Capacitor 6 deps + scripts)
- .gitignore
- .github/workflows/android.yml  (Node 22, Java 21, prepare www)
- scripts/prepare-www.sh         (buat folder www sebelum cap sync)
- src/js/native/capacitor-bridge.js
- src/js/db/fs-storage.js
- src/js/db/notes-repository.js
- src/js/themes/theme-manager.js
- src/js/spa-app.js
- src/js/services/meimo-export.js
- src/js/services/backup-service.js
- README_NATIVE.md

Setelah apply lokal:
  npm install --legacy-peer-deps
  npm run prepare:www
  npx cap add android
  npx cap sync android
