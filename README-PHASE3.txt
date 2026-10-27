Meimo v2 — Phase 3 pack (Server PHP/MySQL + client API)
=======================================================
TIDAK perlu build untuk website. Upload file → langsung jalan.

A. Deploy SERVER (file manager hosting)
--------------------------------------
1. Buat database MySQL di panel hosting.
2. Import api/schema.sql lewat phpMyAdmin.
3. Upload folder api/ ke public_html (hasil: https://domain.com/api/).
4. Salin api/config.example.php → api/config.php
5. Edit config.php: host, name, user, pass database.
6. Test: buka https://domain.com/api/index.php?action=health
   Harus JSON: {"ok":true,"service":"meimo-shared",...}

B. Client (repo Meimo / zip phase2)
-----------------------------------
1. Copy:
   src/js/services/shared-api.js
   src/js/services/share-service.js  (overwrite)
2. Set URL API sekali di browser console / Settings nanti:
   localStorage.setItem('meimo-shared-api', 'https://domain.com/api')
3. Share dari app: generate code → upload document ke server → tab Shared.
4. Join: form Shared tab → noteId + access code + nama → simpan lokal + session.

C. Endpoint ringkas
-------------------
POST ?action=share       body: noteId, accessCode, ownerKey, title, document
POST ?action=join        body: noteId, accessCode, displayName
GET  ?action=poll        noteId + header X-Session-Token [& sinceVersion]
POST ?action=push        body: noteId, baseVersion, document, title
POST ?action=lock        body: noteId, blockId
POST ?action=unlock      body: noteId, blockId|"*"
GET  ?action=presence    noteId
POST ?action=unshare     body: noteId, ownerKey
POST ?action=change-code body: noteId, ownerKey, accessCode
GET  ?action=health

D. Aturan (sesuai spesifikasi v2)
---------------------------------
- Max 5 concurrent session / note
- Lock TTL default 60s
- Access code 8 char case-sensitive
- Owner Key hanya di client; server simpan sha256
- Polling 1–3s (client startPolling intervalMs)
- Version conflict on push → client harus re-fetch (409)

E. Belum di pack ini (Phase 4+)
-------------------------------
- Integrasi editor dual-path (poll loop + lock on focus)
- Asset upload binary
- UI set API URL di Settings

F. Keamanan hosting
-------------------
- Pastikan config.php tidak bisa di-download (PHP dieksekusi, OK).
- Jangan expose config.example dengan password asli.
- CORS: set cors_origin ke domain Meimo (bukan * di production).
