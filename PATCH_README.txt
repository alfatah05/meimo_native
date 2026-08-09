Meimo Native Patch v1.23.22-cap5
================================

FIX:
1. Download note (.meimo) + Cadangkan zip — multi-fallback:
   ExternalStorage/Download → External → Documents → Cache+Share
2. StatusBar warna = tema (realtime + cold start)
3. NavigationBar warna = tema (plugin MeimoNavigationBar)
4. Icon status/nav kontras (DARK icons di tema terang, LIGHT di gelap)
5. overlay=false supaya warna bar terlihat jelas

Apply:
  unzip -o meimo-patch-v1.23.22-cap5.zip
  git add . && git commit -m "fix: download + status/nav bar theme (cap5)" && git push
