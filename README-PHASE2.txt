Meimo v2 — Phase 2 pack (local share / unshare + Shared tab + FAB)
================================================================
Cara pakai (push manual):

  cd meimo_native
  git checkout v2
  git pull origin v2

  # ekstrak zip ini di root repo (overwrite file yang sama)
  unzip -o meimo-v2-phase2.zip

  git status
  git add -A
  git commit -m "v2 phase2: full pack — Shared FAB, share/unshare, restore index"
  git push origin v2

Isi utama:
  - index.html          FAB "Shared notes" + SPA #view-shared + route /shared
  - shared.html         multi-page Shared
  - share-service.js    share/unshare lokal + access code
  - owner-key.js        Owner Key per instalasi
  - document-service.js listSharedNotes / mark shared
  - shared.js           list + join form + unshare UI
  - note-card.js        menu Bagikan
  - notes-list.js       handleShare dari Home
  - modal.js            infoDialog + promptDialog
  - shared-locales.js   i18n en/id/ja (termasuk home.fab.shared)
  - router.js / spa-app.js
  - schema.js           metadata.shared + sharedMeta
  - htaccess            rewrite /shared

Catatan:
  - Join online masih mock (Phase 3 = server PHP/MySQL)
  - Deploy FTP: pastikan secrets FTP_* di GitHub Actions
