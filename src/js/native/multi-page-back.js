/**
 * multi-page-back.js
 * Hardware back untuk halaman multi-page (about, privacy, download, …)
 * yang TIDAK memuat spa-app.js — tanpa ini, tombol back HP di Capacitor
 * sering langsung exit app / tidak jalan.
 *
 * Juga apply warna StatusBar/NavBar sesuai tema tersimpan.
 *
 * Native-only: Capacitor WebView tidak punya rewrite URL (beda dengan
 * .htaccess di web). Path cantik seperti /about, /privacy-policy, /library
 * harus diarahkan ke file .html yang benar supaya halaman bisa dibuka.
 * Di browser (isNative() === false) tidak ada perubahan perilaku.
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

  /**
   * Map path extensionless → file nyata di www/ (hanya dipakai di native).
   * SPA shell → index.html; multi-page statis → *.html masing-masing.
   */
  const NATIVE_PATH_MAP = {
    "/": "/index.html",
    "/library": "/index.html",
    "/index.html": "/index.html",
    "/about": "/about.html",
    "/privacy-policy": "/privacy-policy.html",
    "/download": "/download.html",
    // SPA routes yang kalau di-full-load dari multi-page page tetap aman
    "/settings": "/index.html",
    "/arsip": "/index.html",
    "/trash": "/index.html",
    "/cadangkan": "/index.html",
    "/font-manager": "/index.html",
    "/fitur-ai": "/index.html",
    "/editor": "/index.html",
    "/card-style": "/index.html",
  };

  function resolveNativePath(pathname) {
    const bare = (pathname || "/").replace(/\/+$/, "") || "/";
    if (NATIVE_PATH_MAP[bare]) return NATIVE_PATH_MAP[bare];
    // /editor/<id> atau /card-style/<id> → SPA shell
    if (/^\/editor(?:\/|$)/i.test(bare) || /^\/card-style(?:\/|$)/i.test(bare)) {
      return "/index.html";
    }
    // Sudah .html → biarkan
    if (/\.html$/i.test(bare)) return bare;
    return null;
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

  /**
   * Intercept klik <a> internal di native: rewrite path cantik → file .html.
   * Tidak menyentuh target=_blank, download, atau origin luar.
   */
  function hookNativeLinks() {
    if (!isNative()) return;

    document.addEventListener(
      "click",
      (e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
          return;
        const a = e.target.closest("a[href]");
        if (!a || a.target === "_blank" || a.hasAttribute("download")) return;

        let url;
        try {
          url = new URL(a.href, window.location.origin);
        } catch {
          return;
        }
        if (url.origin !== window.location.origin) return;

        const resolved = resolveNativePath(url.pathname);
        if (!resolved) return;

        // Sudah mengarah ke file yang benar → biarkan
        const currentBare = (url.pathname || "/").replace(/\/+$/, "") || "/";
        if (currentBare === resolved || currentBare.endsWith(resolved)) return;

        e.preventDefault();
        const next = resolved + (url.search || "") + (url.hash || "");
        window.location.assign(next);
      },
      true
    );
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
    hookNativeLinks();
    applyThemeBars();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
