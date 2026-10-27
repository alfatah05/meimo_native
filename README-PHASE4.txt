Meimo v2 — Phase 4 pack (Editor dual-path + polling + block lock)
================================================================
Tidak push GitHub. Unzip ke root repo, overwrite file yang sama.

A. Prasyarat
------------
- Phase 3 API sudah live (health OK)
- localStorage meimo-shared-api = "https://domain.com/api"
- Phase 2 UI Shared + share-service server-aware

B. File di pack ini
-------------------
src/js/services/shared-api.js      (dari Phase 3, ikutkan)
src/js/services/share-service.js   (share/join/unshare server)
src/js/services/shared-sync.js     NEW — poll/push/lock session
src/js/editor/shared-collab.js     NEW — focus lock + apply remote
src/js/editor/editor-state.js      + replaceDocument()
src/js/app.js                      wire attachSharedCollab + destroy
src/js/notes/shared.js             join → server + buka editor
src/css/shared-collab.css          style block terkunci

C. CSS (wajib 1 baris)
-----------------------
Tambah di index.html (dan editor.html jika multi-page) setelah editor.css:

  <link rel="stylesheet" href="/src/css/shared-collab.css">

D. Alur runtime
---------------
1. Share (owner): share-service upload document → sessionToken di sharedMeta
2. Join: joinSharedNote → simpan lokal role=joiner + sessionToken → /editor/:id
3. Editor boot: bila metadata.shared + serverSynced + sessionToken
   → attachSharedCollab:
      - poll 2s (locks + document bila version berubah)
      - onChange → debounce push full document
      - focus block → apiLock; blur keluar body → unlock
      - remote lock → contenteditable=false + badge nama
4. destroyEditor / leave SPA → stop poll + unlock *

E. Konflik
----------
Push 409 version_conflict → apply dokumen server, user lanjut dari situ.
(Last-write-wins di level dokumen; lock mencegah edit block bersamaan.)

F. Belum Phase 4
----------------
- Presence UI list di chrome editor
- Adaptive polling
- Asset binary upload shared
- Web route /s/{noteId} tanpa install (Phase 5)

G. Uji cepat
------------
1. Set API base di console
2. Share note dari Home
3. Device/browser lain: Shared → Join dengan id+code+nama
4. Kedua sisi buka editor: ketik di block beda = OK; block sama = terkunci
