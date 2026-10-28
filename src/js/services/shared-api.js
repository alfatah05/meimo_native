/**
 * shared-api.js — client Meimo Shared Notes API (Phase 3–5).
 *
 * Base URL (prioritas):
 *  1. localStorage `meimo-shared-api`  (wajib di app native / Capacitor)
 *  2. DEFAULT_BASE hardcode (opsional)
 *  3. same-origin `/api` HANYA di web http(s) non-localhost
 *
 * Di APK, origin sering `https://localhost` → jangan auto-pakai.
 */

const DEFAULT_BASE = ""; // mis. "https://meimo.example.com/api"
const LS_KEY = "meimo-shared-api";

function isNativeApp() {
  try {
    const c = typeof window !== "undefined" ? window.Capacitor : null;
    return !!(c && typeof c.isNativePlatform === "function" && c.isNativePlatform());
  } catch (_) {
    return false;
  }
}

function isLocalLikeHost(hostname) {
  const h = (hostname || "").toLowerCase();
  return (
    !h ||
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".local") ||
    h === "android" ||
    h.includes("capacitor")
  );
}

export function getApiBase() {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v && /^https?:\/\//i.test(v.trim())) return v.trim().replace(/\/+$/, "");
  } catch (_) {}

  if (DEFAULT_BASE) return DEFAULT_BASE.replace(/\/+$/, "");

  // Web only: same-origin /api
  try {
    if (isNativeApp()) return "";
    if (typeof window === "undefined" || !window.location) return "";
    const { protocol, hostname, origin } = window.location;
    if (!/^https?:$/i.test(protocol.replace(":", ""))) return "";
    if (isLocalLikeHost(hostname)) return "";
    return `${origin}/api`;
  } catch (_) {}
  return "";
}

export function setApiBase(url) {
  const cleaned = (url || "").trim().replace(/\/+$/, "");
  if (!cleaned) {
    try {
      localStorage.removeItem(LS_KEY);
    } catch (_) {}
    return;
  }
  localStorage.setItem(LS_KEY, cleaned);
}

export function isApiConfigured() {
  return !!getApiBase();
}

async function request(action, { method = "GET", body, sessionToken, query } = {}) {
  const base = getApiBase();
  if (!base) {
    throw new Error(
      "Shared API belum dikonfigurasi. Set localStorage meimo-shared-api ke https://domain.com/api"
    );
  }

  const q = new URLSearchParams({ action, ...(query || {}) });
  const url = `${base}/index.php?${q.toString()}`;
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (sessionToken) headers["X-Session-Token"] = sessionToken;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "omit",
    });
  } catch (e) {
    const err = new Error(
      `API ${action} network error: ${(e && e.message) || e} (url: ${url})`
    );
    err.cause = e;
    throw err;
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    const snippet = (text || "").replace(/\s+/g, " ").slice(0, 120);
    const err = new Error(
      `API ${action} non-JSON (${res.status}). Cek URL API & config.php. Body: ${snippet || "(empty)"}`
    );
    err.status = res.status;
    err.url = url;
    err.bodyText = text;
    throw err;
  }

  if (!res.ok || data?.ok === false) {
    const err = new Error(data?.error || `API ${action} failed (${res.status})`);
    err.status = res.status;
    err.payload = data;
    err.url = url;
    throw err;
  }
  return data;
}

export function apiShare(payload) {
  return request("share", { method: "POST", body: payload });
}

export function apiJoin({ noteId, accessCode, displayName }) {
  return request("join", {
    method: "POST",
    body: { noteId, accessCode, displayName },
  });
}

export function apiPoll({ noteId, sessionToken, sinceVersion }) {
  const query = { noteId };
  if (sinceVersion != null) query.sinceVersion = String(sinceVersion);
  return request("poll", { method: "GET", sessionToken, query });
}

export function apiPush({ noteId, sessionToken, baseVersion, document, title }) {
  return request("push", {
    method: "POST",
    sessionToken,
    body: { noteId, baseVersion, document, title },
  });
}

export function apiLock({ noteId, sessionToken, blockId }) {
  return request("lock", {
    method: "POST",
    sessionToken,
    body: { noteId, blockId },
  });
}

export function apiUnlock({ noteId, sessionToken, blockId }) {
  return request("unlock", {
    method: "POST",
    sessionToken,
    body: { noteId, blockId: blockId || "*" },
  });
}

export function apiPresence({ noteId, sessionToken }) {
  return request("presence", {
    method: "GET",
    sessionToken,
    query: { noteId },
  });
}

export function apiUnshare({ noteId, ownerKey }) {
  return request("unshare", {
    method: "POST",
    body: { noteId, ownerKey },
  });
}

export function apiChangeCode({ noteId, ownerKey, accessCode }) {
  return request("change-code", {
    method: "POST",
    body: { noteId, ownerKey, accessCode },
  });
}

export function apiHealth() {
  return request("health", { method: "GET" });
}

export function startPolling({ noteId, sessionToken, intervalMs = 2000, onUpdate, onError }) {
  let stopped = false;
  let version = 0;
  let timer = null;

  const tick = async () => {
    if (stopped) return;
    try {
      const data = await apiPoll({ noteId, sessionToken, sinceVersion: version });
      if (data.version != null) version = data.version;
      if (onUpdate) onUpdate(data);
    } catch (e) {
      if (onError) onError(e);
    } finally {
      if (!stopped) timer = setTimeout(tick, intervalMs);
    }
  };

  tick();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

/** Public join link for a note id (web origin; native needs real domain in setApiBase) */
export function buildShareJoinUrl(noteId) {
  try {
    const base = getApiBase();
    if (base) {
      // https://domain.com/api → https://domain.com/s/...
      const origin = base.replace(/\/api\/?$/, "");
      if (/^https?:\/\//i.test(origin)) {
        return `${origin}/s/${encodeURIComponent(noteId)}`;
      }
    }
    if (typeof window !== "undefined" && window.location && !isLocalLikeHost(window.location.hostname)) {
      return `${window.location.origin}/s/${encodeURIComponent(noteId)}`;
    }
  } catch (_) {}
  return `/s/${encodeURIComponent(noteId)}`;
}
