Upload ke meimo.nbil.my.id (overwrite)
======================================
Path di server:
  public_html/src/js/services/share-service.js
  public_html/src/js/services/shared-api.js

Atau setara root website kamu.

Setelah upload:
1. Hard refresh browser (clear cache) — penting, service worker bisa cache JS lama
2. Opsional di console:
   localStorage.setItem('meimo-shared-api', 'https://meimo.nbil.my.id/api')
3. Join lagi dengan noteId + access code

Cek file sudah benar (harus loadNote, bukan getNote):
  https://meimo.nbil.my.id/src/js/services/share-service.js
  Ctrl+F "getNote" → harus 0 hasil
