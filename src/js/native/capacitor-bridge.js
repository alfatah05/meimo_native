/**
 * capacitor-bridge.js
 * Deteksi platform native (Capacitor) & inisialisasi plugin.
 * AMAN di web: tidak ada static import @capacitor/* — semua dynamic.
 * Modul ini TIDAK boleh di-static-import dari jalur kritis data (db/notes).
 */

let _Capacitor = null;
let _StatusBar = null;
let _SplashScreen = null;
let _App = null;
let _Filesystem = null;
let _Directory = null;
let _Encoding = null;
let _ready = false;

export function isNative() {
  try {
    return !!(
      typeof window !== "undefined" &&
      window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === "function" &&
      window.Capacitor.isNativePlatform()
    );
  } catch {
    return false;
  }
}

export async function initNative() {
  if (!isNative()) return false;
  if (_ready) return true;

  try {
    const core = await import("@capacitor/core");
    _Capacitor = core.Capacitor;

    const sb = await import("@capacitor/status-bar");
    _StatusBar = sb.StatusBar;

    const sp = await import("@capacitor/splash-screen");
    _SplashScreen = sp.SplashScreen;

    const appMod = await import("@capacitor/app");
    _App = appMod.App;

    const fs = await import("@capacitor/filesystem");
    _Filesystem = fs.Filesystem;
    _Directory = fs.Directory;
    _Encoding = fs.Encoding;

    try {
      await _SplashScreen.hide();
    } catch (_) {}

    try {
      await _StatusBar.setOverlaysWebView({ overlay: true });
    } catch (_) {}

    _App.addListener("backButton", () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        try {
          _App.exitApp();
        } catch (_) {}
      }
    });

    const theme = document.documentElement.getAttribute("data-theme") || "dark";
    await applyNativeThemeColor(theme);

    _ready = true;
    console.log("[Meimo Native] bridge ready");
    return true;
  } catch (err) {
    console.warn("[Meimo Native] init skipped:", err?.message || err);
    return false;
  }
}

const THEME_BG = {
  light: "#FFFFFF",
  dark: "#17181C",
  sepia: "#F4ECD8",
  paper: "#FBFAF5",
  oled: "#000000",
};

const THEME_STYLE = {
  light: "DARK",
  dark: "LIGHT",
  sepia: "DARK",
  paper: "DARK",
  oled: "LIGHT",
};

export async function applyNativeThemeColor(themeId) {
  if (!isNative() || !_StatusBar) return;
  const bg = THEME_BG[themeId] || "#1E1E1E";
  const style = THEME_STYLE[themeId] || "LIGHT";
  try {
    await _StatusBar.setBackgroundColor({ color: bg });
    await _StatusBar.setStyle({ style });
  } catch (e) {
    console.warn("[Meimo Native] StatusBar failed", e);
  }
}

/**
 * Simpan blob ke folder Download Android.
 * Web: fallback <a download>.
 */
export async function saveToDownloads(blobOrBase64, fileName, mimeType = "application/octet-stream") {
  if (!isNative() || !_Filesystem || !_Directory) {
    const blob =
      blobOrBase64 instanceof Blob
        ? blobOrBase64
        : base64ToBlob(blobOrBase64, mimeType);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { path: fileName, web: true };
  }

  let base64;
  if (blobOrBase64 instanceof Blob) {
    base64 = await blobToBase64(blobOrBase64);
  } else {
    base64 = String(blobOrBase64).replace(/^data:[^;]+;base64,/, "");
  }

  try {
    const result = await _Filesystem.writeFile({
      path: `Download/${fileName}`,
      data: base64,
      directory: _Directory.ExternalStorage,
      recursive: true,
    });
    return { path: result.uri || `Download/${fileName}`, native: true };
  } catch (e1) {
    try {
      const result = await _Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: _Directory.Documents,
        recursive: true,
      });
      return { path: result.uri || fileName, native: true, fallback: "Documents" };
    } catch (e2) {
      console.error("[Meimo Native] write failed", e1, e2);
      throw e2;
    }
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result || "";
      resolve(String(dataUrl).split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64, mime) {
  const clean = String(base64).replace(/^data:[^;]+;base64,/, "");
  const bin = atob(clean);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Getter lazy — null sampai initNative sukses */
export function getFilesystem() {
  return { Filesystem: _Filesystem, Directory: _Directory, Encoding: _Encoding };
}
