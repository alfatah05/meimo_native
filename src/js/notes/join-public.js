/**
 * join-public.js — halaman /s/{noteId} (Phase 5)
 * Join tanpa install: form kode + nama → server → editor.
 */

import { joinSharedNote, isValidAccessCode } from "../services/share-service.js";
import { isValidDisplayName } from "./shared.js";
import { t, initI18n, applyI18n } from "../i18n/i18n.js";
import * as sharedApi from "../services/shared-api.js";

function getNoteIdFromPath() {
  const m = window.location.pathname.match(/\/s\/([^/]+)\/?$/i);
  if (m) return decodeURIComponent(m[1]);
  return new URLSearchParams(window.location.search).get("id") || "";
}

function setError(el, msg) {
  if (!el) return;
  if (!msg) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = msg;
}

async function boot() {
  initI18n();
  try {
    applyI18n(document);
  } catch (_) {}

  const noteId = getNoteIdFromPath().trim();
  const idEl = document.getElementById("joinPublicNoteId");
  const form = document.getElementById("joinPublicForm");
  const codeEl = document.getElementById("joinPublicCode");
  const nameEl = document.getElementById("joinPublicName");
  const submit = document.getElementById("joinPublicSubmit");
  const errEl = document.getElementById("joinPublicError");

  if (idEl) idEl.textContent = noteId || "—";

  if (!noteId) {
    setError(errEl, t("joinPublic.needLink") || "Invalid share link.");
    if (form) form.querySelectorAll("input,button").forEach((el) => (el.disabled = true));
    return;
  }

  // Pastikan API base (same-origin /api kalau belum di-set)
  if (!sharedApi.isApiConfigured()) {
    try {
      sharedApi.setApiBase(`${window.location.origin}/api`);
    } catch (_) {}
  }

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setError(errEl, "");
    const code = (codeEl && codeEl.value || "").trim();
    const name = (nameEl && nameEl.value || "").trim();

    if (!isValidAccessCode(code)) {
      setError(errEl, t("shared.join.needCode"));
      return;
    }
    if (!isValidDisplayName(name)) {
      setError(errEl, t("shared.join.needName"));
      return;
    }

    if (submit) submit.disabled = true;
    try {
      const result = await joinSharedNote({
        noteId,
        accessCode: code,
        displayName: name,
      });
      const id = (result && result.note && result.note.id) || noteId;
      window.location.href = `/editor/${encodeURIComponent(id)}`;
    } catch (err) {
      console.error("[join-public]", err);
      setError(errEl, (err && err.message) || t("shared.join.soon"));
    } finally {
      if (submit) submit.disabled = false;
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
