Meimo v2 — Phase 5 pack (Join web /s/{noteId} + konsisten app)
==============================================================
Unzip ke root repo. Tidak push GitHub.

A. Yang baru
------------
s.html                         Halaman join publik (tanpa install)
src/js/notes/join-public.js    Logic form → joinSharedNote → /editor/:id
htaccess                       Rewrite /s/{noteId} → s.html
src/js/router.js               Route name "join"
src/js/spa-app.js              Hard navigate ke /s/ (bukan SPA view)
src/js/services/shared-api.js  Default API = same-origin /api
                               + buildShareJoinUrl()
src/js/services/share-service.js  shareUrl di hasil share
src/js/notes/notes-list.js     Dialog share tampilkan Join link
src/js/i18n/join-public-locales.js + i18n.js merge

B. Deploy file manager
----------------------
1. Upload s.html + file JS/CSS di atas
2. Pastikan htaccess (atau .htaccess) di root memuat rule /s/
3. API Phase 3 di https://domain.com/api/

C. Alur
-------
Owner share → dialog: Note ID, Access code, Join link (/s/xxx), Owner Key
Orang lain buka link di browser → isi kode + nama → editor collab
App: Shared tab → Gabung (sama joinSharedNote)

D. Uji
------
1. Share note, copy Join link
2. Browser lain / incognito: buka link
3. Isi kode + nama huruf → masuk editor
4. Di app: Shared list juga menyimpan note yang di-join

E. Native (Capacitor)
---------------------
Path /s/{id} di WebView: tanpa Apache rewrite, buka s.html?id=
join-public.js sudah baca query ?id= sebagai fallback.
Optional deep link intent filter bisa Phase 6/7.
