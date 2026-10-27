/**
 * shared-collab.js — lock per-block + adaptive sync (Phase 4–6).
 * Phase 6: lock heartbeat ~25s, offline/online toast, activeEditing flag.
 */

import * as selectionApi from "./selection.js";
import { isSharedServerNote, getSharedMeta, createSharedSync } from "../services/shared-sync.js";

const LOCKED_CLASS = "is-shared-locked";
const LOCKED_BY_ATTR = "data-locked-by";
const HEARTBEAT_MS = 25000;

/**
 * @returns {{ stop: function, pushNow: function } | null}
 */
export function attachSharedCollab(opts) {
  const { state, bodyEl, titleEl, renderAll, saveLocal, onStatus } = opts;
  if (!state || !bodyEl) return null;

  const doc0 = state.getDocument();
  if (!isSharedServerNote(doc0)) return null;

  const meta = getSharedMeta(doc0);
  const noteId = meta.noteId || doc0.id;
  const sessionToken = meta.sessionToken;
  let applyingRemote = false;
  let myLockedBlockId = null;
  let remoteLocks = [];
  let heartbeatTimer = null;

  function status(msg, type) {
    if (typeof onStatus === "function") onStatus(msg, type);
  }

  function applyLocksToDom() {
    const els = selectionApi.getBlockElements(bodyEl);
    const byId = new Map();
    for (const el of els) {
      const id = el.getAttribute("data-block-id");
      if (id) byId.set(id, el);
    }
    for (const el of els) {
      el.classList.remove(LOCKED_CLASS);
      el.removeAttribute(LOCKED_BY_ATTR);
      if (el.getAttribute("contenteditable") === "false" && el.dataset.sharedLock === "1") {
        el.setAttribute("contenteditable", "true");
        delete el.dataset.sharedLock;
      }
    }
    for (const lock of remoteLocks) {
      if (lock.isMine) continue;
      const el = byId.get(lock.blockId);
      if (!el) continue;
      el.classList.add(LOCKED_CLASS);
      el.setAttribute(LOCKED_BY_ATTR, lock.displayName || "?");
      el.setAttribute("contenteditable", "false");
      el.dataset.sharedLock = "1";
    }
  }

  function applyRemoteDocument(payload) {
    if (!payload || !payload.document) return;
    applyingRemote = true;
    try {
      const remote = payload.document;
      const local = state.getDocument();
      const merged = {
        ...remote,
        id: local.id,
        metadata: {
          ...(remote.metadata || {}),
          ...(local.metadata || {}),
          shared: true,
          sharedMeta: {
            ...(remote.metadata && remote.metadata.sharedMeta),
            ...(local.metadata && local.metadata.sharedMeta),
            sessionToken,
            serverSynced: true,
            serverVersion: payload.version,
          },
        },
      };
      if (typeof state.replaceDocument === "function") {
        state.replaceDocument(merged, { silentHistory: true });
      } else if (payload.title != null && state.setTitle) {
        state.setTitle(payload.title);
      }
      if (titleEl && payload.title != null) titleEl.textContent = payload.title;
      if (typeof renderAll === "function") renderAll();
      applyLocksToDom();
      if (typeof saveLocal === "function") saveLocal(merged);
    } finally {
      applyingRemote = false;
    }
  }

  const sync = createSharedSync({
    noteId,
    sessionToken,
    initialVersion: meta.serverVersion || 0,
    intervalMs: 2000,
    onRemoteDocument: (payload) => {
      if (payload.conflict || !myLockedBlockId) {
        applyRemoteDocument(payload);
      } else if (payload.version != null) {
        meta.serverVersion = payload.version;
      }
    },
    onLocks: (locks) => {
      remoteLocks = locks || [];
      applyLocksToDom();
    },
    onPresence: () => {},
    onError: (err) => {
      console.warn("[shared-collab] poll:", err && err.message);
    },
    onConnection: (isOnline) => {
      status(
        isOnline ? "online" : "offline",
        isOnline ? "success" : "warn"
      );
    },
  });

  function clearHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function startHeartbeat() {
    clearHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (myLockedBlockId) {
        sync.lockBlock(myLockedBlockId).catch(() => {});
      }
    }, HEARTBEAT_MS);
  }

  async function lockFocusedBlock() {
    const sel = selectionApi.getModelSelection(bodyEl);
    if (!sel) return;
    const blocks = state.getDocument().blocks || [];
    const block = blocks[sel.startBlockIndex];
    if (!block || !block.id) return;
    const blockId = block.id;

    const held = remoteLocks.find((l) => l.blockId === blockId && !l.isMine);
    if (held) return;

    if (myLockedBlockId && myLockedBlockId !== blockId) {
      try {
        await sync.unlockBlock(myLockedBlockId);
      } catch (_) {}
      myLockedBlockId = null;
    }
    try {
      await sync.lockBlock(blockId);
      myLockedBlockId = blockId;
      sync.setActiveEditing(true);
      startHeartbeat();
    } catch (e) {
      if (e && e.status === 423) applyLocksToDom();
    }
  }

  async function releaseMyLock() {
    clearHeartbeat();
    sync.setActiveEditing(false);
    if (!myLockedBlockId) return;
    const id = myLockedBlockId;
    myLockedBlockId = null;
    try {
      await sync.unlockBlock(id);
    } catch (_) {}
  }

  const onSelectionChange = () => {
    if (applyingRemote) return;
    if (!bodyEl.contains(document.activeElement)) return;
    lockFocusedBlock();
  };

  const onFocusIn = (e) => {
    if (!bodyEl.contains(e.target)) return;
    lockFocusedBlock();
  };

  const onFocusOut = (e) => {
    const next = e.relatedTarget;
    if (next && bodyEl.contains(next)) return;
    setTimeout(() => {
      if (!bodyEl.contains(document.activeElement)) {
        releaseMyLock();
      }
    }, 50);
  };

  document.addEventListener("selectionchange", onSelectionChange);
  bodyEl.addEventListener("focusin", onFocusIn);
  bodyEl.addEventListener("focusout", onFocusOut);

  const unsub = state.onChange
    ? state.onChange(() => {
        if (applyingRemote) return;
        sync.setActiveEditing(true);
        schedulePush();
      })
    : null;

  let pushTimer = null;
  function schedulePush() {
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      pushNow();
    }, 700);
  }

  async function pushNow() {
    if (applyingRemote) return;
    const doc = state.getDocument();
    try {
      await sync.pushDocument(doc, doc.title || "");
      const m = getSharedMeta(doc);
      if (m) m.serverVersion = sync.getVersion();
      if (typeof saveLocal === "function") saveLocal(doc);
    } catch (e) {
      if (e && e.code === "offline") {
        status("offline", "warn");
        return;
      }
      if (!e || e.status !== 409) {
        console.warn("[shared-collab] push:", e && e.message);
      }
    }
  }

  sync.start();

  return {
    stop() {
      if (pushTimer) clearTimeout(pushTimer);
      clearHeartbeat();
      document.removeEventListener("selectionchange", onSelectionChange);
      bodyEl.removeEventListener("focusin", onFocusIn);
      bodyEl.removeEventListener("focusout", onFocusOut);
      if (typeof unsub === "function") unsub();
      releaseMyLock();
      sync.stop();
    },
    pushNow,
  };
}
