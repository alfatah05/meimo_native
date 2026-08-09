Meimo patch v1.24.0-icon-assets

Icon full seperti meimo_release_v1_20_0:
  pakai @capacitor/assets (bukan copy manual ke mipmap)

- resources/icon.png = icon kamu (tanpa resize)
- npm run assets → generate adaptive icon benar
- background icon #1E1E1E (bukan putih)
- patch-android.sh TIDAK menimpa icon lagi

Apply:
  unzip -o meimo-patch-v1.24.0-icon-assets.zip
  git add .
  git commit -m "fix: generate launcher icons via @capacitor/assets (full icon)"
  git push

Uninstall app lama, install APK baru.
