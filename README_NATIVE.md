# Meimo Native (Capacitor Android)

Siap push ke GitHub. Actions otomatis build APK (Node 22 + Java 21).

## Fix error `webDir "." is not valid`

Sudah diperbaiki: `webDir` = `www`. Script `scripts/prepare-www.sh` menyalin file web ke folder `www/` sebelum `cap sync`.

## Quick start lokal

```bash
npm install --legacy-peer-deps
npm run prepare:www          # buat folder www/
npx cap add android          # sekali saja
npx cap sync android
npx cap open android
```

Atau satu perintah:
```bash
npm run cap:sync
```

## GitHub Actions

Push ke `main`/`master` → workflow **Build Android APK**:
1. Node 22 + Java 21
2. `npm install` → `prepare:www` → `cap add` → `cap sync`
3. `./gradlew assembleDebug`
4. Artifact: **meimo-android-debug**

## Fitur native

- Hardware back → history.back() + animasi View Transitions sama
- StatusBar/NavBar warna = tema (cold start + ganti tema)
- Splash `#1E1E1E`
- Safe-area padding
- Download .meimo / .zip ke folder Download Android
- Storage dual: Filesystem (native) / IndexedDB (web)
