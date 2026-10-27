# Test matrix — Meimo v2.0.0

## A. Web PWA
| # | Kasus | Hasil diharapkan |
|---|--------|------------------|
| A1 | Buka library offline | Note lokal muncul; Shared kosong atau isi sebelumnya |
| A2 | Share note (API on) | Dialog ID + kode + link + Owner Key; note hilang dari Home |
| A3 | Share tanpa API | Error jelas / tidak half-state |
| A4 | Buka `/s/{noteId}` incognito | Form join; join → editor |
| A5 | Join kode salah | Error, tidak masuk |
| A6 | 2 browser edit block beda | Keduanya bisa; sync ≤3s |
| A7 | 2 browser fokus block sama | Satu terkunci (badge nama) |
| A8 | Unfocus / tutup tab | Lock dilepas |
| A9 | Offline saat shared | Toast offline; edit lokal; online → push |
| A10 | Unshare + backup | Prompt download; note hilang Shared; server 404 join |
| A11 | Ganti access code | Kode lama gagal join; kode baru OK |
| A12 | Install PWA setelah v147 | Shell baru (tanpa stale SW) |

## B. App (Capacitor / Android)
| # | Kasus | Hasil diharapkan |
|---|--------|------------------|
| B1 | Share / join / unshare | Sama web |
| B2 | Owner Key survive reinstall* | *jika data app tidak di-clear |
| B3 | Import Owner Key di Settings | Unshare note lama OK |
| B4 | Deep link `/s/id` (opsional) | Form join atau Shared |

## C. Beban
| # | Kasus | Hasil diharapkan |
|---|--------|------------------|
| C1 | 5 user join | User ke-6 ditolak room full |
| C2 | Poll 5 menit idle | Tidak spam error; session tetap |
| C3 | Note besar ~1–2MB JSON | Push/poll masih OK atau error size jelas |

Centang sebelum merge ke `main`.
