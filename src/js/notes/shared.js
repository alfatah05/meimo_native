/**
 * shared.js
 * Halaman Shared (shared.html / SPA view-shared): daftar catatan yang
 * statusnya metadata.shared = true (hasil share milik sendiri atau join).
 *
 * Phase 1: list lokal + UI shell "Gabung catatan" (belum hit server).
 * Pola UI mengikuti arsip.js agar konsisten dengan design system v1.
 */

import * as documentService from "../services/document-service.js";
import { createNoteCard } from "./note-card.js";
import { sortNotes } from "./sorting.js";
import { downloadNoteAsMeimo } from "./download-note.js";
import { showToast } from "../../components/toast.js";
import { t, initI18n } from "../i18n/i18n.js";

function byUpdatedAtDesc(notes) {
  return sortNotes(notes, "updatedAt");
}

/** Validasi nama sementara: min 3 huruf, hanya a-zA-Z (spasi di tengah boleh). */
export function isValidDisplayName(name) {
  const s = (name || "").trim();
  if (s.length < 3) return false;
  return /^[A-Za-z]+(?: [A-Za-z]+)*$/.test(s);
}

/** Access code 8 char alphanumeric case-sensitive. */
export function isValidAccessCode(code) {
  return /^[A-Za-z0-9]{8}$/.test((code || "").trim());
}

async function boot() {
  const grid = document.getElementById("sharedGrid");
  const section = document.getElementById("sharedSection");
  const sectionSkeleton = document.getElementById("sharedSectionSkeleton");
  const emptyState = document.getElementById("sharedEmptyState");
  const joinForm = document.getElementById("sharedJoinForm");
  const joinNoteId = document.getElementById("joinNoteId");
  const joinAccessCode = document.getElementById("joinAccessCode");
  const joinDisplayName = document.getElementById("joinDisplayName");
  const joinSubmit = document.getElementById("joinSubmit");
  const joinToggle = document.getElementById("sharedJoinToggle");
  const joinPanel = document.getElementById("sharedJoinPanel");

  if (!grid) return;

  let sharedNotes = [];

  function render() {
    grid.innerHTML = "";
    if (sharedNotes.length === 0) {
      if (section) section.hidden = true;
      if (emptyState) emptyState.hidden = false;
    } else {
      if (section) section.hidden = false;
      if (emptyState) emptyState.hidden = true;
      for (const note of sharedNotes) {
        grid.appendChild(
          createNoteCard(note, {
            onDownload: downloadNoteAsMeimo,
            // Phase 1: belum ada unshare/trash dari shared list
          })
        );
      }
    }
  }

  async function load() {
    try {
      sharedNotes = byUpdatedAtDesc(await documentService.listSharedNotes());
      render();
    } finally {
      if (sectionSkeleton) sectionSkeleton.hidden = true;
    }
  }

  if (joinToggle && joinPanel) {
    joinToggle.addEventListener("click", () => {
      const open = joinPanel.hidden;
      joinPanel.hidden = !open;
      joinToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  if (joinForm) {
    joinForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const noteId = (joinNoteId && joinNoteId.value || "").trim();
      const code = (joinAccessCode && joinAccessCode.value || "").trim();
      const name = (joinDisplayName && joinDisplayName.value || "").trim();

      if (!noteId) {
        showToast(t("shared.join.needId"));
        return;
      }
      if (!isValidAccessCode(code)) {
        showToast(t("shared.join.needCode"));
        return;
      }
      if (!isValidDisplayName(name)) {
        showToast(t("shared.join.needName"));
        return;
      }

      // Phase 1: belum ada server — tampilkan feedback saja.
      showToast(t("shared.join.soon"));
      if (joinSubmit) joinSubmit.disabled = false;
    });
  }

  await load();
}

/** Init untuk SPA / multi-page. */
export async function initShared() {
  initI18n();
  return boot();
}

if (!window.__MEIMO_SPA__) {
  const start = () => {
    initI18n();
    boot();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
}
