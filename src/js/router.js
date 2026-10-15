/**
 * router.js
 * Client-side router SPA: Home, Editor, Cadangkan, Trash, Font Manager, Arsip, Shared.
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
  "/shared": "shared",
  "/shared.html": "shared",
  "/settings": "settings",
  "/settings.html": "settings",
  "/fitur-ai": "fitur-ai",
  "/fitur-ai.html": "fitur-ai",
};

/**
 * Multi-page (bukan SPA). Di web di-rewrite oleh .htaccess.
 * Di Capacitor WebView tidak ada rewrite → harus ke file .html.
 * Hanya dipakai jika isNativePlatform().
 */
const MULTI_PAGE_NATIVE = {
  "/about": "/about.html",
  "/privacy-policy": "/privacy-policy.html",
  "/download": "/download.html",
};

function isNativePlatform() {
  try {
    const c = typeof window !== "undefined" ? window.Capacitor : null;
    return !!(c && typeof c.isNativePlatform === "function" && c.isNativePlatform());
  } catch {
    return false;
  }
}

function nativeMultiPageUrl(pathname, search = "", hash = "") {
  const bare = (pathname || "/").replace(/\/+$/, "") || "/";
  const htmlPath = MULTI_PAGE_NATIVE[bare];
  if (!htmlPath) return null;
  return htmlPath + (search || "") + (hash || "");
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
  const bare = path.startsWith("/") ? path : `/${path}`;
  if (STATIC_ROUTES[bare]) {
    return { name: STATIC_ROUTES[bare], id: null };
  }
  for (const [key, name] of Object.entries(STATIC_ROUTES)) {
    if (key.endsWith(".html")) continue;
    if (bare === key || bare.startsWith(key + "/")) {
      return { name, id: null };
    }
  }
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
    case "shared":
      return "/shared";
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

let activeViewTransition = null;

function runWithViewTransition(apply) {
  activeViewTransition = null;
  if (
    typeof document.startViewTransition === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    const vt = document.startViewTransition(apply);
    activeViewTransition = vt;
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

export function waitForPageTransition() {
  const vt = activeViewTransition;
  if (!vt || !vt.finished) return Promise.resolve();
  return vt.finished.catch(() => {});
}

export function navigate(to, { replace = false } = {}) {
  const url = typeof to === "string" ? new URL(to, window.location.origin) : to;
  const route = parseRoute(url.pathname);

  if (!route) {
    if (isNativePlatform()) {
      const nativeUrl = nativeMultiPageUrl(url.pathname, url.search, url.hash);
      if (nativeUrl) {
        try {
          window.history.replaceState({ spa: true }, "", "/index.html");
        } catch (_) {}
        if (replace) window.location.replace(nativeUrl);
        else window.location.assign(nativeUrl);
        return;
      }
    }
    if (replace) window.location.replace(url.href);
    else window.location.assign(url.href);
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
        if (isNativePlatform()) {
          const nativeUrl = nativeMultiPageUrl(url.pathname, url.search, url.hash);
          if (nativeUrl) {
            e.preventDefault();
            try {
              window.history.replaceState({ spa: true }, "", "/index.html");
            } catch (_) {}
            window.location.assign(nativeUrl);
          }
        }
        return;
      }

      e.preventDefault();
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
