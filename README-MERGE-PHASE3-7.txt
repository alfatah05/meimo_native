Meimo v2 — MERGE pack (Phase 3 + 4 + 5 + 6 + 7)
================================================
Satu zip gabungan. Unpack di root repo branch `v2` (yang sudah Phase 2),
lalu commit & push manual.

Sudah Phase 2 di repo? WAJIB. Pack ini tidak berisi ulang Phase 1–2
(Shared tab lokal, owner-key, schema shared flag, dll).

Isi (urutan merge: 3→7, file bentrok diambil versi terbaru)
-------------------------------------------------------------
Phase 3  api/*  PHP+MySQL, shared-api, share-service server
Phase 4  shared-sync, shared-collab, editor-state, app.js dual-path
Phase 5  s.html /s/{noteId}, htaccess, join-public, router, spa-app
Phase 6  hardening: change code, backup unshare, adaptive poll, Owner Key settings
Phase 7  version 2.0.0, CACHE_VERSION v147, release docs

Cara pakai
----------
  cd meimo_native
  git checkout v2
  unzip -o meimo-v2-phase3-to-7.zip
  # optional: cp htaccess .htaccess  (kalau di hosting nama file .htaccess)
  # edit api/config.php dari config.example.php + import schema.sql

  git add -A
  git status
  git commit -m "feat(v2): shared notes online phase 3-7 (v2.0.0)"
  git push origin v2

Deploy web
----------
1. Copy file statis ke hosting (termasuk s.html, src/, service-worker.js, …)
2. Copy folder api/ ; rename config.example.php → config.php; isi DB
3. Import api/schema.sql di MySQL
4. Pastikan rewrite /s/{id} dan /shared (pakai htaccess → .htaccess)
5. Link CSS collab di index/editor jika belum:
   <link rel="stylesheet" href="/src/css/shared-collab.css">

Versi
-----
package.json / manifest.json : 2.0.0
service-worker CACHE_VERSION  : v147
