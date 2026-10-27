Meimo v2 — Phase 6 pack (Hardening)
===================================
Unzip ke root repo. Tidak push GitHub.

A. Fitur
--------
1. Ganti access code (Owner Key) — menu kartu Shared
2. Tampilkan ulang info share (ID, kode, link)
3. Unshare: tanya backup .meimo dulu, baru Owner Key
4. Lock heartbeat ~25s (TTL server 60s tidak putus saat mengetik)
5. Adaptive polling: 1s saat aktif, 2s idle, backoff error, jeda offline
6. Offline: push di-queue, toast offline/online
7. Settings: Export / Import Owner Key (UI dinamis, tanpa edit index.html)

B. File
-------
src/js/services/share-service.js   + changeAccessCode
src/js/services/shared-sync.js     adaptive + offline queue
src/js/services/shared-api.js      (dari Phase 5)
src/js/editor/shared-collab.js     heartbeat + onStatus
src/js/app.js                      onStatus toast
src/js/notes/shared.js             backup before unshare, change code, share info
src/js/notes/note-card.js          menu Unshare / Change code / Share info
src/js/settings/owner-key-settings.js
src/js/settings/settings.js        init owner key UI
src/js/i18n/hardening-locales.js + i18n.js

C. Server
---------
Tidak wajib update PHP (change-code & lock TTL sudah Phase 3).
Opsional: set lock_ttl_seconds=60 di api/config.php.

D. Uji
------
- Shared card → Share info / Ganti kode / Unshare (backup prompt)
- Settings → Owner Key export & import
- Editor shared: matikan jaringan → toast offline; nyalakan → sync
- Dua user: fokus block sama → lock; tetap fokus >60s → heartbeat perpanjang

E. Phase 7 berikutnya
---------------------
Version bump v2.0.0, CACHE_VERSION, changelog, test matrix, merge ke main.
