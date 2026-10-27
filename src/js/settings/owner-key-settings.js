/**
 * owner-key-settings.js — export / import Owner Key di Settings (Phase 6)
 */

import { getOwnerKey, importOwnerKey, ensureOwnerKey } from "../services/owner-key.js";
import { showToast } from "../../components/toast.js";
import { promptDialog, infoDialog, confirmDialog } from "../../components/modal.js";
import { t } from "../i18n/i18n.js";

function ensureSection() {
  let host = document.getElementById("settingsOwnerKeySection");
  if (host) return host;

  const actions = document.querySelector("#view-settings .backup-actions") ||
    document.querySelector(".backup-actions");
  if (!actions) return null;

  host = document.createElement("div");
  host.id = "settingsOwnerKeySection";
  host.style.display = "contents";

  const exportBtn = document.createElement("button");
  exportBtn.type = "button";
  exportBtn.className = "backup-action-btn";
  exportBtn.id = "settingsOwnerKeyExport";
  exportBtn.innerHTML = `
    <span class="backup-action-btn__icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="8" cy="15" r="4"></circle><path d="M12 15h8"></path><path d="M18 12v6"></path>
      </svg>
    </span>
    <span class="backup-action-btn__text">
      <span class="backup-action-btn__title">${t("settings.ownerKey.exportTitle") || "Owner Key"}</span>
      <span class="backup-action-btn__desc">${t("settings.ownerKey.exportDesc") || "Show / copy Owner Key for this device"}</span>
    </span>`;

  const importBtn = document.createElement("button");
  importBtn.type = "button";
  importBtn.className = "backup-action-btn";
  importBtn.id = "settingsOwnerKeyImport";
  importBtn.innerHTML = `
    <span class="backup-action-btn__icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
    </span>
    <span class="backup-action-btn__text">
      <span class="backup-action-btn__title">${t("settings.ownerKey.importTitle") || "Import Owner Key"}</span>
      <span class="backup-action-btn__desc">${t("settings.ownerKey.importDesc") || "Restore key after reinstall / new device"}</span>
    </span>`;

  host.append(exportBtn, importBtn);
  actions.appendChild(host);
  return host;
}

export async function initOwnerKeySettings() {
  const host = ensureSection();
  if (!host) return;

  const exportBtn = document.getElementById("settingsOwnerKeyExport");
  const importBtn = document.getElementById("settingsOwnerKeyImport");

  if (exportBtn && !exportBtn.dataset.bound) {
    exportBtn.dataset.bound = "1";
    exportBtn.addEventListener("click", async () => {
      try {
        const key = await ensureOwnerKey();
        await infoDialog({
          title: t("settings.ownerKey.exportTitle") || "Owner Key",
          message: t("settings.ownerKey.exportWarn") || "Keep this secret. Anyone with this key can unshare your notes.",
          rows: [{ label: "Owner Key", value: key }],
          okLabel: t("shared.success.ok") || "OK",
          onCopy: () => showToast(t("shared.success.copied") || "Copied"),
        });
      } catch (e) {
        showToast(e && e.message ? e.message : "Error");
      }
    });
  }

  if (importBtn && !importBtn.dataset.bound) {
    importBtn.dataset.bound = "1";
    importBtn.addEventListener("click", async () => {
      const ok = await confirmDialog({
        title: t("settings.ownerKey.importTitle") || "Import Owner Key",
        message: t("settings.ownerKey.importWarn") || "This replaces the Owner Key on this device.",
        confirmLabel: t("settings.ownerKey.importOk") || "Continue",
        cancelLabel: t("sheet.cancel") || "Cancel",
        danger: true,
      });
      if (!ok) return;
      const key = await promptDialog({
        title: t("settings.ownerKey.importTitle") || "Import Owner Key",
        message: t("settings.ownerKey.importPrompt") || "Paste Owner Key",
        placeholder: "Owner Key",
        confirmLabel: t("settings.ownerKey.importOk") || "Save",
        cancelLabel: t("sheet.cancel") || "Cancel",
      });
      if (key == null) return;
      try {
        await importOwnerKey(key);
        showToast(t("settings.ownerKey.importDone") || "Owner Key saved");
      } catch (e) {
        showToast(e && e.message ? e.message : "Import failed");
      }
    });
  }
}
