/**
 * router.js
 * Client-side router SPA: Home, Editor, Cadangkan, Trash, Font Manager, Arsip.
 *
 * - Intercept <a> internal ke rute SPA
 * - History API + same-document View Transitions
 * - Halaman di luar lingkup (about, download) tetap multi-page
 */

const HOME_PATHS = new Set(["/", "/library", "/index.html", "/library/"]);
const EDITOR_RE = /^\/editor(?:\/([^/]+))?\/?$/i;

const STATIC_ROUTES = {
  "/cadangkan": "cadangkan",
  "/cadangkan.html": "cadangkan",
  "/trash": "trash",
  "/trash.html": "trash",
  "/font-manager": "font-manager",
  "/font-manager.html": "font-manager",
  "/arsip": "arsip",
  "/arsip.html": "arsip",
  "/settings": "settings",
  "/settings.html": "settings",
  "/fitur-ai": "fitur-ai",
  "/fitur-ai.html": "fitur-ai",
};

/**
 * Halaman multi-page (bukan SPA shell). Di server Apache, .htaccess
 * rewrite /about → about.html. Di Capacitor WebView TIDAK ada rewrite,
 * jadi harus load file .html secara eksplisit.
 */
const MULTI_PAGE_FILES = {
  "/about": "/about.html",
  "/about.html": "/about.html",
  "/privacy-policy": "/privacy-policy.html",
  "/privacy-policy.html": "/privacy-policy.html",
  "/download": "/download.html",
  "/download.html": "/download.html",
};

/** Normalize path: buang trailing slash */
function normalizePath(pathname) {
  return (pathname || "/").replace(/\/+$/, "") || "/";
}

/** Map pretty URL → file nyata untuk full-page load (Capacitor / static). */
function resolveMultiPageFile(pathname) {
  const p = normalizePath(pathname);
  return MULTI_PAGE_FILES[p] || null;
}

/** Apakah path ini "home" SPA yang di static hosting = index.html */
function isSpaHomePath(pathname) {
  const p = normalizePath(pathname);
  return p === "/" || p === "/library" || p === "/index.html";
}

let currentRoute = null;
let onRouteCallback = null;
let started = false;

function parseRoute(pathname = window.location.pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (HOME_PATHS.has(path) || path === "") {
    return { name: "home", id: null };
  }
  const m = path.match(EDITOR_RE);
  if (m) {
    return { name: "editor", id: m[1] ? decodeURIComponent(m[1]) : null };
  }
  // bare path without trailing content
  const bare = path.startsWith("/") ? path : `/${path}`;
  if (STATIC_ROUTES[bare]) {
    return { name: STATIC_ROUTES[bare], id: null };
  }
  // also try with .html stripped already handled; startsWith patterns
  for (const [key, name] of Object.entries(STATIC_ROUTES)) {
    if (key.endsWith(".html")) continue;
    if (bare === key || bare.startsWith(key + "/")) {
      return { name, id: null };
    }
  }
  // /card-style/<id>
  const cs = bare.match(/^\/card-style(?:\/([^/]+))?\/?$/i);
  if (cs) {
    return { name: "card-style", id: cs[1] ? decodeURIComponent(cs[1]) : null };
  }
  return null;
}

function pathFor(route) {
  switch (route.name) {
    case "home":
      return "/library";
    case "editor":
      return route.id ? `/editor/${encodeURIComponent(route.id)}` : "/editor";
    case "cadangkan":
      return "/cadangkan";
    case "trash":
      return "/trash";
    case "font-manager":
      return "/font-manager";
    case "arsip":
      return "/arsip";
    case "settings":
      return "/settings";
    case "fitur-ai":
      return "/fitur-ai";
    case "card-style":
      return route.id
        ? `/card-style/${encodeURIComponent(route.id)}`
        : "/card-style";
    default:
      return "/library";
  }
}

/** ViewTransition aktif terakhir (null kalau tidak support / reduced-motion). */
let activeViewTransition = null;

/**
 * Jalankan `apply` di dalam Same-Document View Transition bila didukung.
 * Mengembalikan objek ViewTransition (atau null) supaya pemanggil bisa
 * `await vt.finished` sebelum kerja berat (font load, render clip-path
 * kompleks, dsb.) — mencegah jank di tengah animasi page-in (terutama
 * halaman Customisasi Kartu yang isinya berat).
 */
function runWithViewTransition(apply) {
  activeViewTransition = null;
  if (
    typeof document.startViewTransition === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    const vt = document.startViewTransition(apply);
    activeViewTransition = vt;
    // Bersihkan referensi setelah selesai supaya tidak menahan objek lama.
    if (vt && vt.finished) {
      vt.finished.catch(() => {}).finally(() => {
        if (activeViewTransition === vt) activeViewTransition = null;
      });
    }
    return vt;
  }
  apply();
  return null;
}

/**
 * Tunggu animasi page transition selesai (atau langsung resolve kalau
 * tidak ada / sudah selesai). Dipakai halaman berat (card-style) supaya
 * mutasi DOM besar tidak tabrakan dengan animasi translateY page-in.
 */
export function waitForPageTransition() {
  const vt = activeViewTransition;
  if (!vt || !vt.finished) return Promise.resolve();
  return vt.finished.catch(() => {});
}

export function navigate(to, { replace = false } = {}) {
  const url = typeof to === "string" ? new URL(to, window.location.origin) : to;
  const route = parseRoute(url.pathname);

  if (!route) {
    const file = resolveMultiPageFile(url.pathname);
    const href = file
      ? file + (url.search || "") + (url.hash || "")
      : url.href;
    if (replace) window.location.replace(href);
    else window.location.assign(href);
    return;
  }

  const nextPath = pathFor(route) + (url.search || "") + (url.hash || "");
  const same =
    currentRoute &&
    currentRoute.name === route.name &&
    currentRoute.id === route.id &&
    window.location.search === (url.search || "");

  if (same && !replace) return;

  const apply = () => {
    if (replace) {
      window.history.replaceState({ spa: true, route }, "", nextPath);
    } else {
      window.history.pushState({ spa: true, route }, "", nextPath);
    }
    currentRoute = route;
    // Jangan return/await onRoute — VT harus selesai setelah ganti view sync
    // supaya skeleton di halaman tujuan langsung terlihat.
    if (typeof onRouteCallback === "function") {
      onRouteCallback(route);
    }
  };

  runWithViewTransition(apply);
}

export function getRoute() {
  return currentRoute || parseRoute();
}

export function syncRoute() {
  currentRoute = parseRoute();
  return currentRoute;
}

export function init(opts = {}) {
  if (started) return;
  started = true;
  onRouteCallback = opts.onRoute || null;

  currentRoute = parseRoute();

  document.addEventListener(
    "click",
    (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
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

      const route = parseRoute(url.pathname);
      if (!route) {
        // Multi-page (about, privacy, download): load file .html
        // supaya jalan di Capacitor (tanpa .htaccess rewrite).
        const file = resolveMultiPageFile(url.pathname);
        if (file) {
          e.preventDefault();
          window.location.assign(file + (url.search || "") + (url.hash || ""));
        }
        return;
      }

      e.preventDefault();
      // Kalau kita sedang di dokumen multi-page (bukan SPA shell),
      // pindah ke index.html dulu lalu biarkan SPA handle route.
      // Deteksi kasar: tidak ada window.__MEIMO_SPA__
      if (!window.__MEIMO_SPA__) {
        const targetPath = pathFor(route) + (url.search || "") + (url.hash || "");
        // Home → index.html; rute SPA lain juga lewat index (view di dalam SPA)
        window.location.assign("/index.html#" + encodeURIComponent(targetPath));
        return;
      }
      navigate(url, { replace: false });
    },
    true
  );

  window.addEventListener("popstate", () => {
    const route = parseRoute();
    if (!route) return;

    if (
      currentRoute &&
      currentRoute.name === route.name &&
      currentRoute.id === route.id
    ) {
      return;
    }

    runWithViewTransition(() => {
      currentRoute = route;
      // Jangan await — sama seperti navigate() (skeleton di halaman tujuan).
      if (typeof onRouteCallback === "function") {
        onRouteCallback(route);
      }
    });
  });

  if (typeof onRouteCallback === "function") {
    onRouteCallback(currentRoute);
  }
}

export default {
  navigate,
  init,
  getRoute,
  parseRoute,
  syncRoute,
  waitForPageTransition,
};
