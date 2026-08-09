/**
 * capacitor-bridge.js
 * Deteksi platform native (Capacitor) & inisialisasi plugin StatusBar,
 * SplashScreen, App (back button), serta helper Filesystem untuk download
 * ke folder Download Android + storage data dir.
 *
 * Import sekali di spa-app.js / app.js setelah DOM ready.
 */

let Capacitor = null;
let StatusBar = null;
let SplashScreen = null;
let App = null;
let Filesystem = null;
let Directory = null;
let Encoding = null;

export function isNative() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

export async function initNative() {
  if (!isNative()) return false;

  try {
    // Dynamic import supaya web build tidak error jika plugin belum ada
    const core = await import("@capacitor/core");
    Capacitor = core.Capacitor;

    const sb = await import("@capacitor/status-bar");
    StatusBar = sb.StatusBar;

    const sp = await import("@capacitor/splash-screen");
    SplashScreen = sp.SplashScreen;

    const appMod = await import("@capacitor/app");
    App = appMod.App;

    const fs = await import("@capacitor/filesystem");
    Filesystem = fs.Filesystem;
    Directory = fs.Directory;
    Encoding = fs.Encoding;

    // Sembunyikan splash secepat mungkin
    try {
      await SplashScreen.hide();
    } catch (_) {}

    // StatusBar overlay + warna awal dari tema
    try {
      await StatusBar.setOverlaysWebView({ overlay: true });
    } catch (_) {}

    // Back button HP → history.back() (atau custom trap)
    App.addListener("backButton", ({ canGoBack }) => {
      // Biarkan router/trap-back-navigation menangani lewat popstate
      // dengan memanggil history.back() — View Transitions tetap jalan
      if (window.history.length > 1) {
        window.history.back();
      } else {
        // Sudah di root — biarkan trap-home menyerap, atau exit
        App.exitApp();
      }
    });

    // Apply theme color segera
    const theme = document.documentElement.getAttribute("data-theme") || "dark";
    await applyNativeThemeColor(theme);

    console.log("[Meimo Native] Capacitor bridge ready");
    return true;
  } catch (err) {
    console.warn("[Meimo Native] Gagal init bridge:", err);
    return false;
  }
}

/** Warna background per tema (sama dengan THEMES.swatch di theme-manager) */
const THEME_BG = {
  light: "#FFFFFF",
  dark: "#17181C",
  sepia: "#F4ECD8",
  paper: "#FBFAF5",
  oled: "#000000",
};

/** Warna ikon status bar: light = gelap, dark = putih */
const THEME_STYLE = {
  light: "DARK",
  dark: "LIGHT",
  sepia: "DARK",
  paper: "DARK",
  oled: "LIGHT",
};

export async function applyNativeThemeColor(themeId) {
  if (!isNative() || !StatusBar) return;
  const bg = THEME_BG[themeId] || "#1E1E1E";
  const style = THEME_STYLE[themeId] || "LIGHT";
  try {
    await StatusBar.setBackgroundColor({ color: bg });
    await StatusBar.setStyle({ style });
    // Juga update navigation bar (Android 8+)
    if (Capacitor.getPlatform() === "android") {
      // StatusBar plugin v6 mendukung navigationBarColor di beberapa versi
      try {
        await StatusBar.setBackgroundColor({ color: bg }); // re-apply
      } catch (_) {}
    }
  } catch (e) {
    console.warn("StatusBar set failed", e);
  }
}

/**
 * Simpan blob/file ke folder Download publik Android.
 * Fallback ke createObjectURL + <a download> kalau bukan native.
 */
export async function saveToDownloads(blobOrBase64, fileName, mimeType = "application/octet-stream") {
  if (!isNative() || !Filesystem) {
    // Web fallback
    const blob = blobOrBase64 instanceof Blob ? blobOrBase64 : base64ToBlob(blobOrBase64, mimeType);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { path: fileName, web: true };
  }

  let base64;
  if (blobOrBase64 instanceof Blob) {
    base64 = await blobToBase64(blobOrBase64);
  } else {
    base64 = blobOrBase64.replace(/^data:[^;]+;base64,/, "");
  }

  // Tulis ke Directory.ExternalStorage/Download (Android)
  // atau Directory.Documents sebagai fallback
  try {
    const result = await Filesystem.writeFile({
      path: `Download/${fileName}`,
      data: base64,
      directory: Directory.ExternalStorage,
      recursive: true,
    });
    return { path: result.uri || `Download/${fileName}`, native: true };
  } catch (e1) {
    // Fallback Directory.Documents
    try {
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });
      return { path: result.uri || fileName, native: true, fallback: "Documents" };
    } catch (e2) {
      console.error("Filesystem write failed", e1, e2);
      throw e2;
    }
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      resolve(dataUrl.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64, mime) {
  const bin = atob(base64.replace(/^data:[^;]+;base64,/, ""));
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export { Filesystem, Directory, Encoding, App, StatusBar, SplashScreen };
