/**
 * multi-page-back.js
 * Hardware back untuk halaman multi-page (about, privacy, download, …)
 * yang TIDAK memuat spa-app.js — tanpa ini, tombol back HP di Capacitor
 * sering langsung exit app / tidak jalan.
 *
 * Juga apply warna StatusBar/NavBar sesuai tema tersimpan.
 */
(function () {
  function isNative() {
    try {
      const c = window.Capacitor;
      return !!(c && typeof c.isNativePlatform === "function" && c.isNativePlatform());
    } catch {
      return false;
    }
  }

  function fallbackHome() {
    // Prefer index.html (aman di Capacitor tanpa rewrite)
    window.location.assign("/index.html");
  }

  function handleBack() {
    // Ada history WebView → back normal (about ← index, privacy ← about)
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    fallbackHome();
  }

  function hookAppBack() {
    if (!isNative()) return;
    const App = window.Capacitor?.Plugins?.App;
    if (!App?.addListener) return;

    App.addListener("backButton", () => {
      handleBack();
    });
  }

  async function applyThemeBars() {
    if (!isNative()) return;
    try {
      const m = await import("./capacitor-bridge.js");
      await m.initNative();
      let theme = "dark";
      try {
        theme =
          document.documentElement.getAttribute("data-theme") ||
          localStorage.getItem("notes-app-theme") ||
          "dark";
      } catch (_) {}
      await m.applyNativeThemeColor?.(theme);
    } catch (e) {
      console.warn("[multi-page-back] theme bars", e);
    }
  }

  function boot() {
    hookAppBack();
    applyThemeBars();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
