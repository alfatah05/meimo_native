/**
 * multi-page-back.js
 * Hardware back + pretty-URL fix untuk halaman multi-page
 * (about, privacy, download, …) yang TIDAK memuat spa-app.js.
 *
 * Di Capacitor WebView tidak ada .htaccess rewrite, jadi /about dan
 * /privacy-policy harus diarahkan ke about.html / privacy-policy.html.
 * Back ke Home → /index.html.
 */

(function () {
  const MULTI_PAGE_FILES = {
    "/about": "/about.html",
    "/about.html": "/about.html",
    "/privacy-policy": "/privacy-policy.html",
    "/privacy-policy.html": "/privacy-policy.html",
    "/download": "/download.html",
    "/download.html": "/download.html",
  };

  const HOME_PATHS = new Set(["/", "/library", "/library/", "/index.html"]);

  function isNative() {
    try {
      const c = window.Capacitor;
      return !!(c && typeof c.isNativePlatform === "function" && c.isNativePlatform());
    } catch {
      return false;
    }
  }

  function normalizePath(pathname) {
    return (pathname || "/").replace(/\/+$/, "") || "/";
  }

  function resolveTarget(pathname) {
    const p = normalizePath(pathname);
    if (HOME_PATHS.has(p) || p === "") return "/index.html";
    if (MULTI_PAGE_FILES[p]) return MULTI_PAGE_FILES[p];
    // SPA routes from multi-page: load shell then let SPA take over
    const spa = [
      "/cadangkan",
      "/trash",
      "/font-manager",
      "/arsip",
      "/settings",
      "/fitur-ai",
      "/editor",
      "/card-style",
    ];
    for (const prefix of spa) {
      if (p === prefix || p.startsWith(prefix + "/")) {
        return "/index.html#" + encodeURIComponent(p);
      }
    }
    return null;
  }

  function fallbackHome() {
    window.location.assign("/index.html");
  }

  function handleBack() {
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
   * Intercept <a href="/about"> dll. — aktif di SEMUA environment
   * (web static tanpa Apache rewrite juga), aman di PWA dengan rewrite
   * karena resolveTarget mengembalikan file yang sama-valid.
   */
  function hookPrettyLinks() {
    document.addEventListener(
      "click",
      (e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
          return;
        const a = e.target.closest("a[href]");
        if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
        if (
          e.target.closest(
            "button, [role='button'], input, select, textarea, label, summary"
          )
        ) {
          return;
        }

        let url;
        try {
          url = new URL(a.href, window.location.origin);
        } catch {
          return;
        }
        if (url.origin !== window.location.origin) return;

        // Already pointing at a real .html file under root — let browser handle
        const path = normalizePath(url.pathname);
        if (/\.html$/i.test(path) && !MULTI_PAGE_FILES[path] && !HOME_PATHS.has(path)) {
          return;
        }

        const file = resolveTarget(url.pathname);
        if (!file) return;

        e.preventDefault();
        window.location.assign(file + (url.search || "") + (url.hash || ""));
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
    hookPrettyLinks();
    hookAppBack();
    applyThemeBars();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
