/**
 * modal.js
 * Dialog konfirmasi sederhana + info/prompt untuk alur Share (v2).
 * Mengembalikan Promise sesuai jenis dialog.
 */

import { createEl } from "../js/utils/dom.js";

export function confirmDialog({
  title = "Konfirmasi",
  message = "",
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  danger = true,
} = {}) {
  return new Promise((resolve) => {
    const overlay = createEl("div", { className: "modal-overlay anim-fade-in" });
    const panel = createEl("div", {
      className: "modal-panel anim-scale-in",
      attrs: { role: "alertdialog", "aria-modal": "true" },
    });

    panel.appendChild(createEl("div", { className: "modal-panel__title", text: title }));
    if (message) {
      panel.appendChild(createEl("p", { className: "modal-panel__message", text: message }));
    }

    const actions = createEl("div", { className: "modal-panel__actions" });
    const cancelBtn = createEl("button", {
      className: "modal-btn modal-btn--ghost",
      text: cancelLabel,
      attrs: { type: "button" },
    });
    const confirmBtn = createEl("button", {
      className: `modal-btn ${danger ? "modal-btn--danger" : "modal-btn--primary"}`,
      text: confirmLabel,
      attrs: { type: "button" },
    });

    function close(result) {
      overlay.remove();
      document.removeEventListener("keydown", onKeydown);
      resolve(result);
    }

    function onKeydown(e) {
      if (e.key === "Escape") close(false);
    }

    cancelBtn.addEventListener("click", () => close(false));
    confirmBtn.addEventListener("click", () => close(true));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(false);
    });
    document.addEventListener("keydown", onKeydown);

    actions.append(cancelBtn, confirmBtn);
    panel.appendChild(actions);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    confirmBtn.focus();
  });
}

/**
 * Dialog info (satu tombol OK). rows: [{ label, value, copyable? }]
 */
export function infoDialog({
  title = "",
  message = "",
  rows = [],
  okLabel = "OK",
  onCopy,
} = {}) {
  return new Promise((resolve) => {
    const overlay = createEl("div", { className: "modal-overlay anim-fade-in" });
    const panel = createEl("div", {
      className: "modal-panel anim-scale-in",
      attrs: { role: "dialog", "aria-modal": "true" },
    });

    panel.appendChild(createEl("div", { className: "modal-panel__title", text: title }));
    if (message) {
      panel.appendChild(createEl("p", { className: "modal-panel__message", text: message }));
    }

    for (const row of rows) {
      const block = createEl("div", {
        className: "modal-panel__message",
        attrs: { style: "margin-top:8px" },
      });
      block.appendChild(
        createEl("div", {
          text: row.label || "",
          attrs: { style: "opacity:0.7;font-size:0.85em;margin-bottom:4px" },
        })
      );
      const line = createEl("div", {
        attrs: { style: "display:flex;align-items:center;gap:8px;flex-wrap:wrap" },
      });
      const val = createEl("code", {
        text: row.value || "",
        attrs: { style: "word-break:break-all;user-select:all" },
      });
      line.appendChild(val);
      if (row.copyable !== false && row.value) {
        const copyBtn = createEl("button", {
          className: "modal-btn modal-btn--ghost",
          text: "Copy",
          attrs: { type: "button", style: "padding:4px 10px;font-size:0.85em" },
        });
        copyBtn.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(String(row.value));
            if (typeof onCopy === "function") onCopy(row.value);
            copyBtn.textContent = "OK";
            setTimeout(() => {
              copyBtn.textContent = "Copy";
            }, 1200);
          } catch (_) {
            /* ignore */
          }
        });
        line.appendChild(copyBtn);
      }
      block.appendChild(line);
      panel.appendChild(block);
    }

    const actions = createEl("div", { className: "modal-panel__actions" });
    const okBtn = createEl("button", {
      className: "modal-btn modal-btn--primary",
      text: okLabel,
      attrs: { type: "button" },
    });

    function close() {
      overlay.remove();
      document.removeEventListener("keydown", onKeydown);
      resolve(true);
    }
    function onKeydown(e) {
      if (e.key === "Escape" || e.key === "Enter") close();
    }

    okBtn.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", onKeydown);

    actions.appendChild(okBtn);
    panel.appendChild(actions);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    okBtn.focus();
  });
}

/**
 * Dialog dengan satu field teks (mis. Owner Key untuk unshare).
 * Resolve string (trim) atau null jika batal.
 */
export function promptDialog({
  title = "",
  message = "",
  placeholder = "",
  confirmLabel = "OK",
  cancelLabel = "Batal",
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    const overlay = createEl("div", { className: "modal-overlay anim-fade-in" });
    const panel = createEl("div", {
      className: "modal-panel anim-scale-in",
      attrs: { role: "dialog", "aria-modal": "true" },
    });

    panel.appendChild(createEl("div", { className: "modal-panel__title", text: title }));
    if (message) {
      panel.appendChild(createEl("p", { className: "modal-panel__message", text: message }));
    }

    const input = createEl("input", {
      className: "search-bar__input",
      attrs: {
        type: "text",
        placeholder: placeholder || "",
        autocomplete: "off",
        spellcheck: "false",
        style: "width:100%;margin:8px 0 4px",
      },
    });
    panel.appendChild(input);

    const actions = createEl("div", { className: "modal-panel__actions" });
    const cancelBtn = createEl("button", {
      className: "modal-btn modal-btn--ghost",
      text: cancelLabel,
      attrs: { type: "button" },
    });
    const confirmBtn = createEl("button", {
      className: `modal-btn ${danger ? "modal-btn--danger" : "modal-btn--primary"}`,
      text: confirmLabel,
      attrs: { type: "button" },
    });

    function close(result) {
      overlay.remove();
      document.removeEventListener("keydown", onKeydown);
      resolve(result);
    }
    function onKeydown(e) {
      if (e.key === "Escape") close(null);
      if (e.key === "Enter") close((input.value || "").trim() || null);
    }

    cancelBtn.addEventListener("click", () => close(null));
    confirmBtn.addEventListener("click", () => close((input.value || "").trim() || null));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(null);
    });
    document.addEventListener("keydown", onKeydown);

    actions.append(cancelBtn, confirmBtn);
    panel.appendChild(actions);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    input.focus();
  });
}
