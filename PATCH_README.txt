Meimo patch v1.24.0-perf-fonts

Percepatan buka Editor / Font Library / Customisasi Kartu (offline-first):

1. ensureInstalledFontsLoaded:
   - prioritaskan font yang dipakai note
   - sisa di requestIdleCallback
   - concurrency max 2 (tidak spike CPU)

2. Editor: load note dulu → font yang dipakai dulu → UI
3. Font Library: preview font lazy (IntersectionObserver)
4. Card style: sama, font prioritas saja di critical path
5. SPA: prefetch modul berat di idle setelah home
6. Skeleton editor min 80ms (dari 220ms)
7. manifest.json force-cache

Apply:
  unzip -o meimo-patch-v1.24.0-perf-fonts.zip
  git add src/js/
  git commit -m "perf: faster font load for editor, library, card-style"
  git push
