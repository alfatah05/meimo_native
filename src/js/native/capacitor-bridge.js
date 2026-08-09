/**
 * capacitor-bridge.js
 * StatusBar + NavBar theme, hardware back, save-to-Downloads.
 * Tanpa static import @capacitor/* (aman di web).
 */

let _Capacitor = null;
let _StatusBar = null;
let _SplashScreen = null;
let _App = null;
let _Filesystem = null;
let _Directory = null;
let _Encoding = null;
let _Share = null;
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

    try {
      const sb = await import("@capacitor/status-bar");
      _StatusBar = sb.StatusBar;
    } catch (e) {
      console.warn("[Meimo] status-bar plugin missing", e);
    }

    try {
      const sp = await import("@capacitor/splash-screen");
      _SplashScreen = sp.SplashScreen;
    } catch (_) {}

    try {
      const appMod = await import("@capacitor/app");
      _App = appMod.App;
    } catch (_) {}

    try {
      const fs = await import("@capacitor/filesystem");
      _Filesystem = fs.Filesystem;
      _Directory = fs.Directory;
      _Encoding = fs.Encoding;
    } catch (e) {
      console.warn("[Meimo] filesystem plugin missing", e);
    }

    try {
      const sh = await import("@capacitor/share");
      _Share = sh.Share;
    } catch (_) {
      // optional
    }

    try {
      await _SplashScreen?.hide();
    } catch (_) {}

    // overlay=false supaya warna background bar benar-benar terlihat
    try {
      await _StatusBar?.setOverlaysWebView({ overlay: false });
    } catch (_) {}

    if (_App?.addListener) {
      _App.addListener("backButton", () => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          try {
            _App.exitApp();
          } catch (_) {}
        }
      });
    }

    // Terapkan tema tersimpan segera (first paint native)
    let theme = "dark";
    try {
      theme =
        document.documentElement.getAttribute("data-theme") ||
        localStorage.getItem("notes-app-theme") ||
        "dark";
    } catch (_) {}
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

/** Style icon: DARK = ikon gelap (bg terang), LIGHT = ikon terang (bg gelap) */
const THEME_STYLE = {
  light: "DARK",
  dark: "LIGHT",
  sepia: "DARK",
  paper: "DARK",
  oled: "LIGHT",
};

/**
 * Set warna StatusBar + NavigationBar + kontras ikon.
 * Dipanggil saat init dan setiap ganti tema.
 */
export async function applyNativeThemeColor(themeId) {
  if (!isNative()) return;

  // Pastikan plugin termuat
  if (!_StatusBar) {
    try {
      await initNative();
    } catch (_) {}
  }

  const bg = THEME_BG[themeId] || THEME_BG.dark;
  const style = THEME_STYLE[themeId] || "LIGHT";

  // meta theme-color (beberapa WebView ikut ini)
  try {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", bg);
  } catch (_) {}

  if (_StatusBar) {
    try {
      await _StatusBar.setOverlaysWebView({ overlay: false });
    } catch (_) {}
    try {
      await _StatusBar.setBackgroundColor({ color: bg });
    } catch (e) {
      console.warn("[Meimo] setBackgroundColor", e);
    }
    try {
      // Capacitor: Style.Dark = dark icons, Style.Light = light icons
      await _StatusBar.setStyle({ style });
    } catch (e) {
      console.warn("[Meimo] setStyle", e);
    }
  }

  // Navigation bar (Android) — lewat bridge internal Capacitor bila ada
  await setAndroidNavigationBar(bg, style === "DARK");
}

/**
 * Set warna navigation bar Android.
 * Menggunakan Capacitor Plugin registry / reflection lewat
 * window.Capacitor.Plugins bila tersedia; fallback CSS env tidak cukup
 * untuk nav bar sistem, jadi kita coba StatusBar API berulang +
 * document theme-color.
 */
async function setAndroidNavigationBar(hexColor, darkIcons) {
  try {
    if (!_Capacitor || _Capacitor.getPlatform() !== "android") return;

    const plugins = window.Capacitor?.Plugins || {};

    // Custom plugin (android-patches/NavigationBarPlugin.java)
    if (plugins.MeimoNavigationBar?.setColor) {
      await plugins.MeimoNavigationBar.setColor({
        color: hexColor,
        darkButtons: darkIcons,
      });
      return;
    }

    if (plugins.NavigationBar?.setColor) {
      await plugins.NavigationBar.setColor({ color: hexColor, darkButtons: darkIcons });
      return;
    }
    if (plugins.StatusBar?.setNavigationBarColor) {
      await plugins.StatusBar.setNavigationBarColor({ color: hexColor });
      return;
    }
  } catch (e) {
    console.warn("[Meimo] nav bar color", e);
  }
}

/**
 * Simpan file ke Download (native) atau trigger <a download> (web).
 */
export async function saveToDownloads(blobOrBase64, fileName, mimeType = "application/octet-stream") {
  // Web
  if (!isNative()) {
    return webDownload(blobOrBase64, fileName, mimeType);
  }

  // Pastikan plugin siap
  if (!_Filesystem || !_Directory) {
    await initNative();
  }
  if (!_Filesystem || !_Directory) {
    console.warn("[Meimo] Filesystem unavailable, web fallback");
    return webDownload(blobOrBase64, fileName, mimeType);
  }

  let base64;
  if (blobOrBase64 instanceof Blob) {
    base64 = await blobToBase64(blobOrBase64);
  } else {
    base64 = String(blobOrBase64).replace(/^data:[^;]+;base64,/, "");
  }

  // Minta permission baca/tulis storage (Android ≤12)
  try {
    if (typeof _Filesystem.requestPermissions === "function") {
      await _Filesystem.requestPermissions();
    }
  } catch (_) {}

  const attempts = [];

  // 1) ExternalStorage/Download/ (paling dekat folder Download user)
  attempts.push(async () => {
    const r = await _Filesystem.writeFile({
      path: `Download/${fileName}`,
      data: base64,
      directory: _Directory.ExternalStorage,
      recursive: true,
    });
    return { path: r.uri || `Download/${fileName}`, where: "Download" };
  });

  // 2) Directory.External + Download
  if (_Directory.External) {
    attempts.push(async () => {
      const r = await _Filesystem.writeFile({
        path: `Download/${fileName}`,
        data: base64,
        directory: _Directory.External,
        recursive: true,
      });
      return { path: r.uri || fileName, where: "External/Download" };
    });
  }

  // 3) Documents
  attempts.push(async () => {
    const r = await _Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: _Directory.Documents,
      recursive: true,
    });
    return { path: r.uri || fileName, where: "Documents" };
  });

  // 4) Cache + Share sheet (user bisa "Save to Downloads")
  attempts.push(async () => {
    const r = await _Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: _Directory.Cache,
      recursive: true,
    });
    let uri = r.uri;
    try {
      const u = await _Filesystem.getUri({
        path: fileName,
        directory: _Directory.Cache,
      });
      uri = u.uri || uri;
    } catch (_) {}

    if (_Share && uri) {
      try {
        await _Share.share({
          title: fileName,
          url: uri,
          dialogTitle: "Simpan file",
        });
        return { path: uri, where: "Share", shared: true };
      } catch (_) {}
    }
    return { path: uri || fileName, where: "Cache" };
  });

  let lastErr = null;
  for (const attempt of attempts) {
    try {
      const result = await attempt();
      console.log("[Meimo] file saved:", result);
      return { ...result, native: true };
    } catch (e) {
      lastErr = e;
      console.warn("[Meimo] save attempt failed:", e?.message || e);
    }
  }

  // Terakhir: web-style download di WebView (kadang tetap jalan)
  try {
    return webDownload(blobOrBase64, fileName, mimeType);
  } catch (e) {
    throw lastErr || e;
  }
}

function webDownload(blobOrBase64, fileName, mimeType) {
  const blob =
    blobOrBase64 instanceof Blob
      ? blobOrBase64
      : base64ToBlob(blobOrBase64, mimeType);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 2000);
  return { path: fileName, web: true };
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

export function getFilesystem() {
  return { Filesystem: _Filesystem, Directory: _Directory, Encoding: _Encoding };
}
