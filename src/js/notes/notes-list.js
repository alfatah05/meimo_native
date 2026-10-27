/**
 * notes-list.js
 * Render & pengelolaan Notes List (Home): Pinned strip + grid Terbaru/Semua
 * Notes/Hasil Pencarian, plus entry point untuk halaman index.html.
 *
 * Sumber data SATU-SATUNYA lewat Document Service (bukan IndexedDB
 * langsung) — lihat src/js/services/document-service.js. Note yang
 * `trashed`/`archived` tidak ditampilkan di Home (sesuai DOCUMENT_MODEL.md).
 */

import * as documentService from "../services/document-service.js";
import { shareNoteLocally } from "../services/share-service.js";
import { confirmDialog, infoDialog } from "../../components/modal.js";
import { debounce } from "../utils/debounce.js";
import { createNoteCard, createPinnedCard } from "./note-card.js";
import { t, initI18n } from "../i18n/i18n.js";
import { sortOptionLabel } from "./sorting.js";
import { toggleNotePin } from "./pin.js";
import { downloadNoteAsMeimo } from "./download-note.js";
import { filterNotes } from "./search.js";
import { SORT_OPTIONS, getSort, setSort, sortNotes } from "./sorting.js";
import { openPanel, closeAllPanels } from "../utils/dom.js";
import { showToast } from "../../components/toast.js";
import { ensureInstalledFontsLoaded } from "../services/font-service.js";
import { getObjectUrl } from "../services/image-service.js";
import { initRefreshOnRestore } from "../utils/reload-on-restore.js";
import { seedDefaultNotesIfNeeded } from "./seed-default-notes.js";
import "../utils/trap-back-navigation.js";

/** diisi saat boot() — dipanggil SPA saat kembali ke Home */
let __refreshHomeFn = null;
/** Skeleton Home belum pernah disembunyikan di sesi ini. */
let __homeSkeletonPending = true;

const SEARCH_DEBOUNCE_MS = 120;

/** Warm object-URL cache untuk semua gambar latar kartu sebelum render. */
async function preloadCardBackgrounds(notes) {
  const ids = new Set();
  for (const note of notes || []) {
    const id = note && note.metadata && note.metadata.cardStyle && note.metadata.cardStyle.bgImageAssetId;
    if (id) ids.add(id);
  }
  if (!ids.size) return;
  await Promise.allSettled([...ids].map((id) => getObjectUrl(id)));
}

function collectBgReady(root) {
  const promises = [];
  if (!root) return promises;
  root.querySelectorAll(".note-card, .pinned-card").forEach((el) => {
    if (el.__bgReady && typeof el.__bgReady.then === "function") {
      promises.push(el.__bgReady);
    }
  });
  return promises;
}

/** Bangun panel dropdown berisi pilihan urutan (dibuka lewat openPanel dom.js). */
function buildSortPanel(onPick) {
  const list = document.createElement("div");
  list.className = "toolbar-panel__list";
  const current = getSort();

  for (const opt of SORT_OPTIONS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toolbar-panel__item" + (opt.id === current ? " is-active" : "");
    btn.textContent = sortOptionLabel(opt);
    btn.addEventListener("click", () => onPick(opt));
    list.appendChild(btn);
  }
  return list;
}

async function boot() {
  initI18n();
  const searchInput = document.getElementById("searchInput");
  const sortTrigger = document.getElementById("sortTrigger");
  const sortLabel = document.getElementById("sortLabel");
  const pinnedSection = document.getElementById("pinnedSection");
  const pinnedStrip = document.getElementById("pinnedStrip");
  const recentSection = document.getElementById("recentSection");
  const recentSectionTitle = document.getElementById("recentSectionTitle");
  const notesGrid = document.getElementById("notesGrid");
  const emptyState = document.getElementById("emptyState");
  const emptyStateTitle = document.getElementById("emptyStateTitle");
  const emptyStateDesc = document.getElementById("emptyStateDesc");

  if (!searchInput || !notesGrid) return;

  let allNotes = [];

  function updateSortLabel() {
    if (!sortLabel) return;
    const current = getSort();
    const opt = SORT_OPTIONS.find((o) => o.id === current) || SORT_OPTIONS[0];
    sortLabel.textContent = sortOptionLabel(opt);
  }
  updateSortLabel();

  if (sortTrigger) {
    sortTrigger.addEventListener("click", () => {
      const panel = buildSortPanel((opt) => {
        setSort(opt.id);
        updateSortLabel();
        closeAllPanels();
        render(searchInput.value);
      });
      openPanel(sortTrigger, panel, { align: "center" });
    });
  }

  async function handleTrash(note) {
    await documentService.moveToTrash(note.id);
    allNotes = allNotes.filter((n) => n.id !== note.id);
    render(searchInput.value);
    showToast(t("note.movedTrash", { title: note.title || t("note.untitled") }), {
      actionLabel: t("note.undo"),
      onAction: async () => {
        await documentService.restoreFromTrash(note.id);
        allNotes = await documentService.listNotes({ includeTrashed: false, includeArchived: false });
        render(searchInput.value);
      },
    });
  }

  async function handleTogglePin(note) {
    const updated = await toggleNotePin(note);
    allNotes = allNotes.map((n) => (n.id === updated.id ? updated : n));
    render(searchInput.value);
  }

  async function handleArchive(note) {
    await documentService.setArchived(note.id, true);
    allNotes = allNotes.filter((n) => n.id !== note.id);
    render(searchInput.value);
    showToast(t("note.movedArchive", { title: note.title || t("note.untitled") }), {
      actionLabel: t("note.undo"),
      onAction: async () => {
        await documentService.setArchived(note.id, false);
        allNotes = await documentService.listNotes({ includeTrashed: false, includeArchived: false });
        render(searchInput.value);
      },
    });
  }

  /** Bagikan catatan (Phase 2 lokal): pindah ke tab Shared + tampilkan ID/kode/Owner Key. */
  async function handleShare(note) {
    const ok = await confirmDialog({
      title: t("shared.confirm.title"),
      message: t("shared.confirm.message"),
      confirmLabel: t("shared.confirm.ok"),
      cancelLabel: t("sheet.cancel"),
      danger: false,
    });
    if (!ok) return;
    try {
      const result = await shareNoteLocally(note);
      allNotes = allNotes.filter((n) => n.id !== note.id);
      render(searchInput.value);
      await infoDialog({
        title: t("shared.success.title"),
        message: t("shared.success.message"),
        rows: [
          { label: t("shared.success.noteId"), value: result.noteId },
          { label: t("shared.success.code"), value: result.accessCode },
          { label: t("shared.success.link") || "Link", value: result.shareUrl || (location.origin + "/s/" + result.noteId) },
          { label: t("shared.success.ownerKey"), value: result.ownerKey },
        ],
        okLabel: t("shared.success.ok"),
        onCopy: () => showToast(t("shared.success.copied")),
      });
    } catch (err) {
      console.error("[notes-list] share:", err);
      showToast(err && err.message ? err.message : t("shared.fail"));
    }
  }

  function render(query) {
    const homeSkeleton = document.getElementById("homeSkeleton");

    const trimmed = (query || "").trim();
    const filtered = filterNotes(allNotes, trimmed);

    const activeSort = getSort();
    const pinned = sortNotes(filtered.filter((note) => note.metadata.pinned), activeSort);
    const others = sortNotes(filtered.filter((note) => !note.metadata.pinned), activeSort);

    pinnedStrip.innerHTML = "";
    if (pinned.length) {
      pinnedSection.hidden = false;
      for (const note of pinned) {
        pinnedStrip.appendChild(
          createPinnedCard(note, {
            onTrash: handleTrash,
            onTogglePin: handleTogglePin,
            onArchive: handleArchive,
            onDownload: downloadNoteAsMeimo,
            onShare: handleShare,
          })
        );
      }
    } else {
      pinnedSection.hidden = true;
    }

    notesGrid.innerHTML = "";
    recentSectionTitle.textContent = trimmed ? t("home.searchResults") : t("home.recent");
    if (others.length) {
      recentSection.hidden = false;
      for (const note of others) {
        notesGrid.appendChild(
          createNoteCard(note, {
            onTrash: handleTrash,
            onTogglePin: handleTogglePin,
            onArchive: handleArchive,
            onDownload: downloadNoteAsMeimo,
            onShare: handleShare,
          })
        );
      }
    } else {
      recentSection.hidden = true;
    }

    if (filtered.length === 0) {
      emptyState.hidden = false;
      if (trimmed) {
        emptyStateTitle.textContent = t("home.empty.none.title");
        emptyStateDesc.textContent = t("home.empty.none.desc", { q: trimmed });
      } else {
        emptyStateTitle.textContent = t("home.empty.title");
        emptyStateDesc.textContent = t("home.empty.desc");
      }
    } else {
      emptyState.hidden = true;
    }

    if (__homeSkeletonPending && homeSkeleton) {
      const bgReady = [...collectBgReady(pinnedStrip), ...collectBgReady(notesGrid)];
      const done = () => {
        if (!__homeSkeletonPending) return;
        __homeSkeletonPending = false;
        homeSkeleton.hidden = true;
      };
      if (!bgReady.length) {
        done();
      } else {
        const timeout = new Promise((r) => setTimeout(r, 4000));
        Promise.race([Promise.allSettled(bgReady), timeout]).then(done);
      }
    } else if (homeSkeleton && homeSkeleton.hidden === false && !__homeSkeletonPending) {
      homeSkeleton.hidden = true;
    }
  }

  const renderDebounced = debounce(() => render(searchInput.value), SEARCH_DEBOUNCE_MS);
  searchInput.addEventListener("input", renderDebounced);

  async function refreshData() {
    allNotes = await documentService.listNotes({ includeTrashed: false, includeArchived: false });
  }

  function hideHomeSkeleton() {
    const homeSkeleton = document.getElementById("homeSkeleton");
    if (homeSkeleton) homeSkeleton.hidden = true;
  }

  function withTimeout(promise, ms, label) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(`Timeout ${label} (${ms}ms)`));
      }, ms);
      Promise.resolve(promise).then(
        (v) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(v);
        },
        (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  }

  try {
    try {
      await withTimeout(seedDefaultNotesIfNeeded(), 15000, "seedDefaultNotes");
    } catch (err) {
      console.error("[notes-list] seed default notes gagal/timeout:", err);
    }
    try {
      await withTimeout(
        (async () => {
          await refreshData();
          const titleFonts = [
            ...new Set(
              (allNotes || [])
                .map((n) => n?.metadata?.cardStyle?.titleFont)
                .filter(Boolean)
            ),
          ];
          await Promise.all([
            ensureInstalledFontsLoaded({
              families: titleFonts,
              deferRest: true,
              concurrency: 2,
            }),
            preloadCardBackgrounds(allNotes),
          ]);
        })(),
        12000,
        "fonts+listNotes"
      );
    } catch (err) {
      console.error("[notes-list] fonts/listNotes gagal/timeout:", err);
      try {
        await withTimeout(refreshData(), 8000, "listNotes-retry");
      } catch (err2) {
        console.error("[notes-list] listNotes retry gagal:", err2);
        allNotes = [];
      }
    }
    render(searchInput.value);
  } catch (err) {
    console.error("[notes-list] boot gagal:", err);
    hideHomeSkeleton();
  } finally {
    hideHomeSkeleton();
  }

  async function refreshAndRender() {
    try {
      await refreshData();
      render(searchInput.value);
    } catch (err) {
      console.error("[notes-list] refreshAndRender gagal:", err);
      hideHomeSkeleton();
    }
  }

  initRefreshOnRestore(refreshAndRender);
  __refreshHomeFn = refreshAndRender;
}

export async function refreshHome() {
  if (typeof __refreshHomeFn === "function") {
    return __refreshHomeFn();
  }
}

export async function initHome() {
  return boot();
}

if (!window.__MEIMO_SPA__) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
}
