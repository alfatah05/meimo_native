/**
 * capacitor-bridge.js
 *
 * PENTING: project ini STATIC (tanpa Vite/webpack).
 * Jangan pakai `import("@capacitor/...")` — di WebView bare specifier gagal.
 * Semua plugin diakses lewat window.Capacitor.Plugins (di-inject native).
 */

function getCap() {
  return typeof window !== "undefined" ? window.Capacitor : null;
}

export function isNative() {
  try {
    const c = getCap();
    return !!(c && typeof c.isNativePlatform === "function" && c.isNativePlatform());
  } catch {
    return false;
  }
}

function plugin(name) {
  try {
    const c = getCap();
    return c?.Plugins?.[name] || null;
  } catch {
    return null;
  }
}

function platform() {
  try {
    return getCap()?.getPlatform?.() || "web";
  } catch {
    return "web";
  }
}

const THEME_BG = {
  light: "#FFFFFF",
  dark: "#17181C",
  sepia: "#F4ECD8",
  paper: "#FBFAF5",
  oled: "#000000",
};

/** Capacitor Style: Dark = ikon gelap (bg terang), Light = ikon terang (bg gelap) */
const THEME_STYLE = {
  light: "DARK",
  dark: "LIGHT",
  sepia: "DARK",
  paper: "DARK",
  oled: "LIGHT",
};

let _ready = false;
let _backHooked = false;

export async function initNative() {
  if (!isNative()) return false;
  if (_ready) return true;

  try {
    // Splash
    try {
      await plugin("SplashScreen")?.hide?.();
    } catch (_) {}

    // StatusBar: jangan overlay supaya warna solid terlihat
    const StatusBar = plugin("StatusBar");
    try {
      await StatusBar?.setOverlaysWebView?.({ overlay: false });
    } catch (_) {}

    // Hardware back
    if (!_backHooked) {
      const App = plugin("App");
      if (App?.addListener) {
        App.addListener("backButton", () => {
          if (window.history.length > 1) window.history.back();
          else {
            try {
              App.exitApp?.();
            } catch (_) {}
          }
        });
        _backHooked = true;
      }
    }

    // Tema tersimpan → bars
    let theme = "dark";
    try {
      theme =
        document.documentElement.getAttribute("data-theme") ||
        localStorage.getItem("notes-app-theme") ||
        "dark";
    } catch (_) {}
    await applyNativeThemeColor(theme);

    _ready = true;
    console.log("[Meimo Native] bridge ready via Capacitor.Plugins", {
      platform: platform(),
      plugins: Object.keys(getCap()?.Plugins || {}),
    });
    return true;
  } catch (err) {
    console.warn("[Meimo Native] init failed:", err);
    return false;
  }
}

export async function applyNativeThemeColor(themeId) {
  if (!isNative()) return;

  const bg = THEME_BG[themeId] || THEME_BG.dark;
  const style = THEME_STYLE[themeId] || "LIGHT";
  const darkIcons = style === "DARK"; // true = dark icons on light bg

  try {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", bg);
  } catch (_) {}

  // 1) Official StatusBar plugin
  const StatusBar = plugin("StatusBar");
  if (StatusBar) {
    try {
      await StatusBar.setOverlaysWebView?.({ overlay: false });
    } catch (_) {}
    try {
      await StatusBar.setBackgroundColor?.({ color: bg });
    } catch (e) {
      console.warn("[Meimo] StatusBar.setBackgroundColor", e);
    }
    try {
      await StatusBar.setStyle?.({ style });
    } catch (e) {
      console.warn("[Meimo] StatusBar.setStyle", e);
    }
  }

  // 2) Custom MeimoSystemBars (status + nav bar, andal di Android 10–15)
  const SystemBars = plugin("MeimoSystemBars");
  if (SystemBars?.setColors) {
    try {
      await SystemBars.setColors({
        color: bg,
        darkIcons,
      });
    } catch (e) {
      console.warn("[Meimo] MeimoSystemBars.setColors", e);
    }
  } else {
    // Fallback nav bar saja
    const Nav = plugin("MeimoNavigationBar");
    if (Nav?.setColor) {
      try {
        await Nav.setColor({ color: bg, darkButtons: darkIcons });
      } catch (_) {}
    }
  }
}

/**
 * Simpan file ke folder Download publik (MediaStore) di Android.
 * Fallback: Documents → Cache + Share → <a download>.
 */
export async function saveToDownloads(blobOrBase64, fileName, mimeType = "application/octet-stream") {
  if (!isNative()) {
    return webDownload(blobOrBase64, fileName, mimeType);
  }

  let base64;
  if (blobOrBase64 instanceof Blob) {
    base64 = await blobToBase64(blobOrBase64);
    if (!mimeType || mimeType === "application/octet-stream") {
      mimeType = blobOrBase64.type || mimeType;
    }
  } else {
    base64 = String(blobOrBase64).replace(/^data:[^;]+;base64,/, "");
  }

  // A) Custom plugin MediaStore → public Downloads (paling andal)
  const Saver = plugin("MeimoFileSaver");
  if (Saver?.saveToDownloads) {
    try {
      const res = await Saver.saveToDownloads({
        fileName,
        base64,
        mimeType,
      });
      console.log("[Meimo] MeimoFileSaver OK", res);
      return { path: res?.uri || res?.path || fileName, where: "Download", native: true };
    } catch (e) {
      console.warn("[Meimo] MeimoFileSaver failed", e);
    }
  }

  // B) Filesystem plugin (Capacitor.Plugins.Filesystem)
  const Filesystem = plugin("Filesystem");
  const Directory = guessDirectoryEnum(Filesystem);

  if (Filesystem?.writeFile) {
    // Permission
    try {
      await Filesystem.requestPermissions?.();
    } catch (_) {}

    const tries = [
      { path: `Download/${fileName}`, directory: Directory.EXTERNAL_STORAGE },
      { path: `Download/${fileName}`, directory: Directory.EXTERNAL },
      { path: fileName, directory: Directory.DOCUMENTS },
      { path: fileName, directory: Directory.DATA },
      { path: fileName, directory: Directory.CACHE },
    ];

    for (const t of tries) {
      if (t.directory == null) continue;
      try {
        const r = await Filesystem.writeFile({
          path: t.path,
          data: base64,
          directory: t.directory,
          recursive: true,
        });
        console.log("[Meimo] Filesystem write OK", t, r);

        // Share sheet sebagai cara user menyimpan ke Download
        if (t.directory === Directory.CACHE || t.directory === Directory.DATA) {
          const shared = await tryShare(Filesystem, t.path, t.directory, fileName, r?.uri);
          if (shared) return shared;
        }

        return {
          path: r?.uri || t.path,
          where: String(t.directory),
          native: true,
        };
      } catch (e) {
        console.warn("[Meimo] write fail", t, e);
      }
    }
  }

  // C) Web-style di WebView
  try {
    return webDownload(blobOrBase64, fileName, mimeType);
  } catch (e) {
    throw new Error("Gagal menyimpan file: " + (e?.message || e));
  }
}

function guessDirectoryEnum(Filesystem) {
  // Capacitor injects Directory on the plugin in some builds; otherwise use string constants
  // Official values: DOCUMENTSCACHE, DATA, CACHE, EXTERNAL, EXTERNAL_STORAGE, LIBRARY...
  const D = {
    DOCUMENTS: "DOCUMENTS",
    DATA: "DATA",
    CACHE: "CACHE",
    EXTERNAL: "EXTERNAL",
    EXTERNAL_STORAGE: "EXTERNAL_STORAGE",
  };
  // Prefer real enum if present on plugin / global
  try {
    const capD = getCap()?.Directory || Filesystem?.Directory;
    if (capD) {
      return {
        DOCUMENTS: capD.Documents ?? capD.DOCUMENTS ?? D.DOCUMENTS,
        DATA: capD.Data ?? capD.DATA ?? D.DATA,
        CACHE: capD.Cache ?? capD.CACHE ?? D.CACHE,
        EXTERNAL: capD.External ?? capD.EXTERNAL ?? D.EXTERNAL,
        EXTERNAL_STORAGE: capD.ExternalStorage ?? capD.EXTERNAL_STORAGE ?? D.EXTERNAL_STORAGE,
      };
    }
  } catch (_) {}
  return D;
}

async function tryShare(Filesystem, path, directory, fileName, uriHint) {
  const Share = plugin("Share");
  if (!Share?.share) return null;

  let uri = uriHint;
  try {
    const u = await Filesystem.getUri?.({ path, directory });
    uri = u?.uri || uri;
  } catch (_) {}

  if (!uri) return null;

  try {
    await Share.share({
      title: fileName,
      url: uri,
      dialogTitle: "Simpan / bagikan file",
    });
    return { path: uri, where: "Share", shared: true, native: true };
  } catch (e) {
    console.warn("[Meimo] Share failed", e);
    return null;
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
  }, 2500);
  return { path: fileName, web: true };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || "").split(",")[1] || "");
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

/** Dipakai fs-storage.js */
export function getFilesystem() {
  const Filesystem = plugin("Filesystem");
  const Directory = guessDirectoryEnum(Filesystem);
  // Map ke bentuk mirip @capacitor/filesystem enum
  const DirObj = {
    Data: Directory.DATA,
    Cache: Directory.CACHE,
    Documents: Directory.DOCUMENTS,
    External: Directory.EXTERNAL,
    ExternalStorage: Directory.EXTERNAL_STORAGE,
  };
  return {
    Filesystem,
    Directory: DirObj,
    Encoding: { UTF8: "utf8" },
  };
}
