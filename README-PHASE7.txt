Meimo v2 — Phase 7 pack (Release prep v2.0.0)
==============================================
Unzip ke root repo. Tidak auto-push GitHub.

A. Isi
------
package.json              version 2.0.0
manifest.json             version 2.0.0
service-worker.js         CACHE_VERSION v147
README.md                 Versi + changelog v2.0.0
docs/RELEASE_v2.0.0.md
docs/TEST_MATRIX_v2.md
docs/RELEASE_CHECKLIST.md
README-PHASE7.txt

B. Urutan rilis (disarankan)
---------------------------
1. Pastikan phase 2–6 sudah di working tree / server staging
2. unzip phase7 → commit di branch v2
3. Jalankan TEST_MATRIX (web minimal)
4. Tag v2.0.0
5. Deploy web (file manager / FTP)
6. Merge v2 → main
7. Actions → Build Android APK (manual)

C. CACHE_VERSION
----------------
v146 (v1.23.51) → v147 (v2.0.0)
Wajib naik agar service worker membuang shell lama.

D. APK di v2 development
------------------------
android.yml tetap hanya trigger push main/master + workflow_dispatch
(sesuai keputusan awal: CI cepat di v2). Setelah merge main, build APK dari main.
