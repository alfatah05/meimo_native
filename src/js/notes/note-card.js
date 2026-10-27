/**
 * note-card.js
 * Representasi satu item catatan dalam daftar — dua varian:
 *   - createNoteCard(note)   -> kartu grid "Terbaru"/"Semua Notes"
 *   - createPinnedCard(note) -> kartu ringkas untuk strip "Pinned"
 *
 * Murni fungsi render (note -> DOM element), tidak menyentuh IndexedDB
 * atau Document Service selain memakai getSnippet() untuk cuplikan isi.
 */

import { createEl, openPanel, closeAllPanels } from "../utils/dom.js";
import { getSnippet } from "../services/document-service.js";
import { getObjectUrl } from "../services/image-service.js";
import { formatRelativeDate } from "../utils/date-format.js";
import { applyCardShapeAndColor, applyTitleFont, applyWashiTapeDecor } from "./card-style-presets.js";
import { t } from "../i18n/i18n.js";

const PIN_ICON_SVG =
  '<svg class="note-card__pin-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
  '<path d="M12 2l1.5 5.5L19 9l-4 3.5 1 6-4-3-4 3 1-6-4-3.5 5.5-1.5z"/></svg>';

const MORE_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
  '<circle cx="12" cy="5" r="1.8"></circle>' +
  '<circle cx="12" cy="12" r="1.8"></circle>' +
  '<circle cx="12" cy="19" r="1.8"></circle></svg>';

const CUSTOMIZE_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>';

const PIN_MENU_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12 17v5"></path>' +
  '<path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 0-2H8a1 1 0 0 0 0 2 1 1 0 0 1 1 1z"></path></svg>';

const UNPIN_MENU_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12 17v5"></path>' +
  '<path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 0-2H8a1 1 0 0 0 0 2 1 1 0 0 1 1 1z"></path>' +
  '<line x1="4" y1="4" x2="20" y2="20"></line></svg>';

const TRASH_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<polyline points="3 6 5 6 21 6"></polyline>' +
  '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>' +
  '<path d="M10 11v6"></path><path d="M14 11v6"></path>' +
  '<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>';

const ARCHIVE_MENU_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<polyline points="21 8 21 21 3 21 3 8"></polyline>' +
  '<rect x="1" y="3" width="22" height="5"></rect>' +
  '<line x1="10" y1="12" x2="14" y2="12"></line></svg>';

const UNARCHIVE_MENU_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<polyline points="21 8 21 21 3 21 3 8"></polyline>' +
  '<rect x="1" y="3" width="22" height="5"></rect>' +
  '<line x1="10" y1="12" x2="14" y2="12"></line>' +
  '<line x1="2" y1="2" x2="22" y2="22"></line></svg>';

const DOWNLOAD_MENU_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12 3v12"></path><polyline points="7 10 12 15 17 10"></polyline><path d="M4 19h16"></path></svg>';

const SHARE_MENU_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<circle cx="9" cy="7" r="3"></circle>' +
  '<circle cx="17" cy="7" r="3"></circle>' +
  '<path d="M3 19c0-3 2.5-5 6-5s6 2 6 5"></path>' +
  '<path d="M14 19c0-2 1.5-3.5 3-3.5s3 1.5 3 3.5"></path></svg>';

function noteHref(note) {
  return `/editor/${encodeURIComponent(note.id)}`;
}

function cardStyleHref(note) {
  return `/card-style/${encodeURIComponent(note.id)}`;
}

function applyStoredCardStyle(cardEl, titleEl, note) {
  const cardStyle = note.metadata && note.metadata.cardStyle;
  if (!cardStyle) return Promise.resolve();

  applyCardShapeAndColor(cardEl, cardStyle);
  applyTitleFont(titleEl, cardStyle);
  applyWashiTapeDecor(cardEl, cardStyle);

  if (!cardStyle.bgImageAssetId) return Promise.resolve();

  cardEl.classList.add("has-bg-image");
  cardEl.style.setProperty(
    "--card-bg-opacity",
    cardStyle.bgImageOpacity != null ? cardStyle.bgImageOpacity : 1
  );

  return getObjectUrl(cardStyle.bgImageAssetId).then((url) => {
    if (!url) return;
    cardEl.style.setProperty("--card-bg-image", `url("${url}")`);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    });
  });
}


const UNSHARE_MENU_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<circle cx="9" cy="7" r="3"></circle><circle cx="17" cy="7" r="3"></circle>' +
  '<path d="M3 19c0-3 2.5-5 6-5"></path><path d="M14 19c0-2 1.5-3.5 3-3.5"></path>' +
  '<line x1="4" y1="4" x2="20" y2="20"></line></svg>';

const KEY_MENU_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<circle cx="8" cy="15" r="4"></circle><path d="M12 15h8"></path><path d="M18 12v6"></path></svg>';

const LINK_MENU_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>' +
  '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';

function openCardMenu(trigger, note, onTrash, onTogglePin, onArchive, onUnarchive, onDownload, onShare, onUnshare, onChangeCode, onShowShareInfo) {
  const panel = createEl("div", { className: "toolbar-panel__list" });

  if (onTogglePin) {
    const pinned = !!(note.metadata && note.metadata.pinned);
    const pinItem = createEl("button", {
      className: "toolbar-panel__item",
      attrs: { type: "button" },
      html: pinned
        ? `${UNPIN_MENU_ICON_SVG}<span>${t("note.unpin")}</span>`
        : `${PIN_MENU_ICON_SVG}<span>${t("note.pin")}</span>`,
    });
    pinItem.addEventListener("click", () => {
      closeAllPanels();
      onTogglePin(note);
    });
    panel.appendChild(pinItem);
  }

  if (onArchive) {
    const archiveItem = createEl("button", {
      className: "toolbar-panel__item",
      attrs: { type: "button" },
      html: `${ARCHIVE_MENU_ICON_SVG}<span>${t("note.archive")}</span>`,
    });
    archiveItem.addEventListener("click", () => {
      closeAllPanels();
      onArchive(note);
    });
    panel.appendChild(archiveItem);
  }

  if (onUnarchive) {
    const unarchiveItem = createEl("button", {
      className: "toolbar-panel__item",
      attrs: { type: "button" },
      html: `${UNARCHIVE_MENU_ICON_SVG}<span>${t("note.unarchive")}</span>`,
    });
    unarchiveItem.addEventListener("click", () => {
      closeAllPanels();
      onUnarchive(note);
    });
    panel.appendChild(unarchiveItem);
  }

  const customizeItem = createEl("a", {
    className: "toolbar-panel__item",
    attrs: { href: cardStyleHref(note) },
    html: `${CUSTOMIZE_ICON_SVG}<span>${t("note.customize")}</span>`,
  });
  customizeItem.addEventListener("click", () => closeAllPanels());
  panel.appendChild(customizeItem);

  if (onDownload) {
    const downloadItem = createEl("button", {
      className: "toolbar-panel__item",
      attrs: { type: "button" },
      html: `${DOWNLOAD_MENU_ICON_SVG}<span>${t("note.download")}</span>`,
    });
    downloadItem.addEventListener("click", () => {
      closeAllPanels();
      onDownload(note);
    });
    panel.appendChild(downloadItem);
  }

  if (onShare) {
    const shareItem = createEl("button", {
      className: "toolbar-panel__item",
      attrs: { type: "button" },
      html: `${SHARE_MENU_ICON_SVG}<span>${t("note.share")}</span>`,
    });
    shareItem.addEventListener("click", () => {
      closeAllPanels();
      onShare(note);
    });
    panel.appendChild(shareItem);
  }

  if (onShowShareInfo) {
    const infoItem = createEl("button", {
      className: "toolbar-panel__item",
      attrs: { type: "button" },
      html: `${LINK_MENU_ICON_SVG}<span>${t("note.shareInfo") || "Share info"}</span>`,
    });
    infoItem.addEventListener("click", () => {
      closeAllPanels();
      onShowShareInfo(note);
    });
    panel.appendChild(infoItem);
  }

  if (onChangeCode) {
    const codeItem = createEl("button", {
      className: "toolbar-panel__item",
      attrs: { type: "button" },
      html: `${KEY_MENU_ICON_SVG}<span>${t("note.changeCode") || "Change access code"}</span>`,
    });
    codeItem.addEventListener("click", () => {
      closeAllPanels();
      onChangeCode(note);
    });
    panel.appendChild(codeItem);
  }

  if (onUnshare) {
    const unshareItem = createEl("button", {
      className: "toolbar-panel__item toolbar-panel__item--danger",
      attrs: { type: "button" },
      html: `${UNSHARE_MENU_ICON_SVG}<span>${t("note.unshare")}</span>`,
    });
    unshareItem.addEventListener("click", () => {
      closeAllPanels();
      onUnshare(note);
    });
    panel.appendChild(unshareItem);
  }

  const deleteItem = createEl("button", {
    className: "toolbar-panel__item toolbar-panel__item--danger",
    attrs: { type: "button" },
    html: `${TRASH_ICON_SVG}<span>${t("note.delete")}</span>`,
  });
  deleteItem.addEventListener("click", () => {
    closeAllPanels();
    if (onTrash) onTrash(note);
  });
  panel.appendChild(deleteItem);

  openPanel(trigger, panel, { align: "left" });
}

export function createNoteCard(note, { onTrash, onTogglePin, onArchive, onUnarchive, onDownload, onShare, onUnshare, onChangeCode, onShowShareInfo } = {}) {
  const card = createEl("a", {
    className: "note-card anim-slide-up",
    attrs: { href: noteHref(note), "aria-label": note.title || t("note.noTitle") },
  });

  const header = createEl("div", { className: "note-card__header" });
  const titleWrap = createEl("div", { className: "note-card__title-wrap" });
  const titleEl = createEl("div", { className: "note-card__title", text: note.title || t("note.untitled") });
  titleWrap.appendChild(titleEl);
  header.appendChild(titleWrap);
  if (note.metadata && note.metadata.pinned) {
    header.appendChild(createEl("span", { html: PIN_ICON_SVG }).firstElementChild);
  }
  if (onTrash || onTogglePin || onArchive || onUnarchive || onDownload || onShare || onUnshare || onChangeCode || onShowShareInfo) {
    const menuBtn = createEl("button", {
      className: "note-card__menu-btn",
      attrs: { type: "button", "aria-label": t("note.menu"), "aria-haspopup": "true", "aria-expanded": "false" },
      html: MORE_ICON_SVG,
    });
    menuBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openCardMenu(menuBtn, note, onTrash, onTogglePin, onArchive, onUnarchive, onDownload, onShare, onUnshare, onChangeCode, onShowShareInfo);
    });
    header.appendChild(menuBtn);
  }

  const snippet = createEl("p", {
    className: "note-card__snippet",
    text: getSnippet(note) || t("note.empty"),
  });

  const footer = createEl("div", { className: "note-card__footer" });
  footer.appendChild(createEl("span", { text: t("note.updated", { date: formatRelativeDate(note.updatedAt) }) }));

  const hideSnippet = !!(note.metadata && note.metadata.cardStyle && note.metadata.cardStyle.hideSnippet);
  if (hideSnippet) {
    snippet.hidden = true;
    card.classList.add("note-card--hide-snippet");
  }
  card.append(header, snippet, footer);
  card.__bgReady = applyStoredCardStyle(card, titleEl, note);
  return card;
}

export function createPinnedCard(note, { onTrash, onTogglePin, onArchive, onDownload, onShare } = {}) {
  const card = createEl("a", {
    className: "pinned-card",
    attrs: { href: noteHref(note), "aria-label": note.title || t("note.noTitle") },
  });
  const header = createEl("div", { className: "pinned-card__header" });
  const titleEl = createEl("div", { className: "pinned-card__title", text: note.title || t("note.untitled") });
  header.appendChild(titleEl);
  if (onTrash || onTogglePin || onArchive || onDownload || onShare) {
    const menuBtn = createEl("button", {
      className: "pinned-card__menu-btn",
      attrs: { type: "button", "aria-label": t("note.menu"), "aria-haspopup": "true", "aria-expanded": "false" },
      html: MORE_ICON_SVG,
    });
    menuBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openCardMenu(menuBtn, note, onTrash, onTogglePin, onArchive, null, onDownload, onShare);
    });
    header.appendChild(menuBtn);
  }
  card.appendChild(header);
  const pinnedSnippet = createEl("div", {
    className: "pinned-card__snippet",
    text: getSnippet(note, 80) || "Catatan kosong.",
  });
  if (note.metadata && note.metadata.cardStyle && note.metadata.cardStyle.hideSnippet) {
    pinnedSnippet.hidden = true;
    card.classList.add("pinned-card--hide-snippet");
  }
  card.appendChild(pinnedSnippet);
  card.__bgReady = applyStoredCardStyle(card, titleEl, note);
  return card;
}
