/**
 * shared-sync.js — dual-path sync + adaptive polling + offline queue (Phase 4–6).
 */

import * as sharedApi from "./shared-api.js";

export function isSharedServerNote(doc) {
  const m = doc && doc.metadata && doc.metadata.sharedMeta;
  return !!(
    doc &&
    doc.metadata &&
    doc.metadata.shared &&
    m &&
    m.serverSynced &&
    m.sessionToken &&
    sharedApi.isApiConfigured()
  );
}

export function getSharedMeta(doc) {
  return (doc && doc.metadata && doc.metadata.sharedMeta) || null;
}

/**
 * @param {object} opts
 * @param {string} opts.noteId
 * @param {string} opts.sessionToken
 * @param {number} [opts.initialVersion=0]
 * @param {number} [opts.intervalMs=2000] base interval
 * @param {(data:object)=>void} [opts.onRemoteDocument]
 * @param {(locks:array)=>void} [opts.onLocks]
 * @param {(presence:array)=>void} [opts.onPresence]
 * @param {(err:Error)=>void} [opts.onError]
 * @param {(online:boolean)=>void} [opts.onConnection]
 */
export function createSharedSync(opts) {
  const noteId = opts.noteId;
  const sessionToken = opts.sessionToken;
  let baseInterval = Math.max(1000, Math.min(3000, opts.intervalMs || 2000));
  let intervalMs = baseInterval;
  let version = opts.initialVersion || 0;
  let stopped = false;
  let timer = null;
  let pushing = false;
  let pendingDoc = null;
  let failStreak = 0;
  let activeEditing = false;
  let online = typeof navigator !== "undefined" ? navigator.onLine !== false : true;

  const emitLocks = (locks) => opts.onLocks && opts.onLocks(locks || []);
  const emitPresence = (presence) => opts.onPresence && opts.onPresence(presence || []);

  function computeInterval() {
    if (!online) return Math.min(10000, baseInterval * 4);
    if (failStreak >= 3) return Math.min(8000, baseInterval * (1 + failStreak));
    if (activeEditing) return 1000;
    return baseInterval;
  }

  function scheduleNext() {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    intervalMs = computeInterval();
    timer = setTimeout(tick, intervalMs);
  }

  async function tick() {
    if (stopped) return;
    if (!online) {
      scheduleNext();
      return;
    }
    try {
      const data = await sharedApi.apiPoll({
        noteId,
        sessionToken,
        sinceVersion: version,
      });
      failStreak = 0;
      if (data.version != null) version = data.version;
      emitLocks(data.locks);
      emitPresence(data.presence);
      if (data.changed && data.document && opts.onRemoteDocument) {
        opts.onRemoteDocument({
          document: data.document,
          title: data.title,
          version: data.version,
        });
      }
      // flush pending push after successful poll
      if (pendingDoc && !pushing) {
        const p = pendingDoc;
        pendingDoc = null;
        pushDocument(p.document, p.title).catch(() => {});
      }
    } catch (e) {
      failStreak += 1;
      if (opts.onError) opts.onError(e);
    } finally {
      scheduleNext();
    }
  }

  function start() {
    if (stopped) return;
    tick();
  }

  function stop() {
    stopped = true;
    if (timer) clearTimeout(timer);
    timer = null;
    try {
      if (online) {
        sharedApi.apiUnlock({ noteId, sessionToken, blockId: "*" }).catch(() => {});
      }
    } catch (_) {}
  }

  function getVersion() {
    return version;
  }

  function setVersion(v) {
    version = v | 0;
  }

  function setActiveEditing(flag) {
    activeEditing = !!flag;
  }

  function setOnline(flag) {
    const next = !!flag;
    if (next === online) return;
    online = next;
    if (opts.onConnection) opts.onConnection(online);
    if (online) {
      failStreak = 0;
      scheduleNext();
    }
  }

  async function pushDocument(document, title) {
    if (stopped || !document) return null;
    if (!online) {
      pendingDoc = { document, title };
      const err = new Error("offline");
      err.code = "offline";
      throw err;
    }
    if (pushing) {
      pendingDoc = { document, title };
      return null;
    }
    pushing = true;
    try {
      let current = { document, title };
      while (current) {
        try {
          const res = await sharedApi.apiPush({
            noteId,
            sessionToken,
            baseVersion: version,
            document: current.document,
            title: current.title,
          });
          if (res.version != null) version = res.version;
          failStreak = 0;
          current = pendingDoc;
          pendingDoc = null;
          return res;
        } catch (e) {
          if (e.status === 409 && e.payload) {
            version = e.payload.version || version;
            if (opts.onRemoteDocument && e.payload.document) {
              opts.onRemoteDocument({
                document: e.payload.document,
                title: e.payload.title,
                version: e.payload.version,
                conflict: true,
              });
            }
            pendingDoc = null;
            throw e;
          }
          failStreak += 1;
          pendingDoc = current;
          throw e;
        }
      }
    } finally {
      pushing = false;
    }
    return null;
  }

  async function lockBlock(blockId) {
    if (!blockId || !online) return null;
    return sharedApi.apiLock({ noteId, sessionToken, blockId });
  }

  async function unlockBlock(blockId) {
    if (!online) return null;
    return sharedApi.apiUnlock({
      noteId,
      sessionToken,
      blockId: blockId || "*",
    });
  }

  // browser online/offline
  const onWinOnline = () => setOnline(true);
  const onWinOffline = () => setOnline(false);
  if (typeof window !== "undefined") {
    window.addEventListener("online", onWinOnline);
    window.addEventListener("offline", onWinOffline);
  }

  const origStop = stop;
  stop = function stopWithListeners() {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", onWinOnline);
      window.removeEventListener("offline", onWinOffline);
    }
    origStop();
  };

  return {
    start,
    stop,
    getVersion,
    setVersion,
    pushDocument,
    lockBlock,
    unlockBlock,
    setActiveEditing,
    setOnline,
    isOnline: () => online,
  };
}
