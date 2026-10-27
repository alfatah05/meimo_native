/**
 * shared-api.js — client Meimo Shared Notes API (Phase 3–5).
 * Base URL: localStorage `meimo-shared-api`, atau same-origin `/api`.
 */

const DEFAULT_BASE = "";
const LS_KEY = "meimo-shared-api";

export function getApiBase() {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v && /^https?:\/\//i.test(v)) return v.replace(/\/+$/, "");
  } catch (_) {}
  if (DEFAULT_BASE) return DEFAULT_BASE.replace(/\/+$/, "");
  // Phase 5: default same-origin (web deploy + api/ di hosting yang sama)
  try {
    if (typeof window !== "undefined" && window.location && window.location.origin) {
      return `${window.location.origin}/api`;
    }
  } catch (_) {}
  return "";
}

export function setApiBase(url) {
  localStorage.setItem(LS_KEY, (url || "").replace(/\/+$/, ""));
}

export function isApiConfigured() {
  return !!getApiBase();
}

async function request(action, { method = "GET", body, sessionToken, query } = {}) {
  const base = getApiBase();
  if (!base) throw new Error("Shared API belum dikonfigurasi (setApiBase).");

  const q = new URLSearchParams({ action, ...(query || {}) });
  const url = `${base}/index.php?${q.toString()}`;
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (sessionToken) headers["X-Session-Token"] = sessionToken;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "omit",
  });

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    throw new Error(`API ${action} non-JSON (${res.status})`);
  }
  if (!res.ok || data?.ok === false) {
    const err = new Error(data?.error || `API ${action} failed (${res.status})`);
    err.status = res.status;
    err.payload = data;
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

/** Public join link for a note id */
export function buildShareJoinUrl(noteId) {
  try {
    const origin = window.location.origin;
    return `${origin}/s/${encodeURIComponent(noteId)}`;
  } catch (_) {
    return `/s/${encodeURIComponent(noteId)}`;
  }
}
