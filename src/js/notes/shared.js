/**
 * shared.js — Shared tab (Phase 2–6)
 * list, join, unshare (backup dulu), change code, show share info
 */

import * as documentService from "../services/document-service.js";
import {
  unshareNoteLocally,
  getShareInfo,
  joinSharedNote,
  changeAccessCode,
  generateAccessCode,
  getShareJoinUrl,
} from "../services/share-service.js";
import { createNoteCard } from "./note-card.js";
import { sortNotes } from "./sorting.js";
import { downloadNoteAsMeimo } from "./download-note.js";
import { showToast } from "../../components/toast.js";
import { promptDialog, confirmDialog, infoDialog } from "../../components/modal.js";
import { t, initI18n } from "../i18n/i18n.js";

function byUpdatedAtDesc(notes) {
  return sortNotes(notes, "updatedAt");
}

export function isValidDisplayName(name) {
  const s = (name || "").trim();
  if (s.length < 3) return false;
  return /^[A-Za-z]+(?: [A-Za-z]+)*$/.test(s);
}

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
        const info = getShareInfo(note);
        const isOwner = !info || info.role !== "joiner";
        grid.appendChild(
          createNoteCard(note, {
            onDownload: downloadNoteAsMeimo,
            onUnshare: isOwner ? handleUnshare : undefined,
            onChangeCode: isOwner ? handleChangeCode : undefined,
            onShowShareInfo: handleShowShareInfo,
          })
        );
      }
    }
  }

  async function handleShowShareInfo(note) {
    const info = getShareInfo(note) || {};
    const noteId = info.noteId || note.id;
    const code = info.accessCode || "—";
    let shareUrl = "";
    try {
      shareUrl = getShareJoinUrl(noteId);
    } catch (_) {
      shareUrl = `/s/${noteId}`;
    }
    await infoDialog({
      title: t("shared.success.title"),
      message: t("shared.success.message"),
      rows: [
        { label: t("shared.success.noteId"), value: noteId },
        { label: t("shared.success.code"), value: code },
        { label: t("shared.success.link") || "Join link", value: shareUrl },
      ],
      okLabel: t("shared.success.ok"),
      onCopy: () => showToast(t("shared.success.copied")),
    });
  }

  async function handleChangeCode(note) {
    const key = await promptDialog({
      title: t("shared.changeCode.title"),
      message: t("shared.changeCode.message"),
      placeholder: t("shared.unshare.placeholder"),
      confirmLabel: t("shared.changeCode.continue"),
      cancelLabel: t("sheet.cancel"),
      danger: false,
    });
    if (key == null) return;
    if (!key) {
      showToast(t("shared.unshare.needKey"));
      return;
    }
    let newCode = await promptDialog({
      title: t("shared.changeCode.newTitle"),
      message: t("shared.changeCode.newMessage"),
      placeholder: "Ab3xY9kQ",
      confirmLabel: t("shared.changeCode.ok"),
      cancelLabel: t("sheet.cancel"),
      danger: false,
    });
    if (newCode == null) return;
    newCode = (newCode || "").trim();
    if (!newCode) {
      // auto-generate if empty
      newCode = generateAccessCode();
    }
    try {
      const updated = await changeAccessCode(note, key, newCode);
      sharedNotes = sharedNotes.map((n) => (n.id === note.id ? updated : n));
      render();
      showToast(t("shared.changeCode.done") + ": " + newCode);
    } catch (err) {
      console.error("[shared] changeCode:", err);
      showToast(err && err.message ? err.message : t("shared.changeCode.fail"));
    }
  }

  async function handleUnshare(note) {
    // Phase 6: sarankan backup dulu
    const wantBackup = await confirmDialog({
      title: t("shared.unshare.backupTitle"),
      message: t("shared.unshare.backupMessage"),
      confirmLabel: t("shared.unshare.backupYes"),
      cancelLabel: t("shared.unshare.backupNo"),
      danger: false,
    });
    if (wantBackup) {
      try {
        await downloadNoteAsMeimo(note);
        showToast(t("shared.unshare.backupDone"));
      } catch (e) {
        console.warn("[shared] backup before unshare:", e);
      }
    }

    const key = await promptDialog({
      title: t("shared.unshare.title"),
      message: t("shared.unshare.message"),
      placeholder: t("shared.unshare.placeholder"),
      confirmLabel: t("shared.unshare.ok"),
      cancelLabel: t("sheet.cancel"),
      danger: true,
    });
    if (key == null) return;
    if (!key) {
      showToast(t("shared.unshare.needKey"));
      return;
    }
    try {
      await unshareNoteLocally(note, key);
      sharedNotes = sharedNotes.filter((n) => n.id !== note.id);
      render();
      showToast(t("shared.unshare.done"));
    } catch (err) {
      console.error("[shared] unshare:", err);
      showToast(err && err.message ? err.message : t("shared.unshare.fail"));
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
      const noteId = ((joinNoteId && joinNoteId.value) || "").trim();
      const code = ((joinAccessCode && joinAccessCode.value) || "").trim();
      const name = ((joinDisplayName && joinDisplayName.value) || "").trim();

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

      if (joinSubmit) joinSubmit.disabled = true;
      try {
        const result = await joinSharedNote({
          noteId,
          accessCode: code,
          displayName: name,
        });
        sharedNotes = byUpdatedAtDesc(await documentService.listSharedNotes());
        render();
        showToast(t("shared.join.submit") + " ✓");
        const id = (result && result.note && result.note.id) || noteId;
        window.location.href = "/editor/" + encodeURIComponent(id);
      } catch (err) {
        console.error("[shared] join:", err);
        showToast(err && err.message ? err.message : t("shared.join.soon"));
      } finally {
        if (joinSubmit) joinSubmit.disabled = false;
      }
    });
  }

  await load();
}

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
