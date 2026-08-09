/**
 * theme-manager.js
 * Mengelola tema aplikasi (Light/Dark/Sepia/Paper/OLED Black) — satu state
 * global yang berlaku di semua halaman (Home, Editor, Sampah) lewat atribut
 * `data-theme` di <html>, disimpan di localStorage supaya konsisten dipakai
 * ulang saat app dibuka lagi.
 *
 * Native (Capacitor): juga sync StatusBar + NavigationBar color + icon contrast.
 */

export const THEME_STORAGE_KEY = "notes-app-theme";

export const THEMES = [
  { id: "light", label: "Terang", swatch: "#FFFFFF" },
  { id: "dark", label: "Gelap", swatch: "#17181C" },
  { id: "sepia", label: "Sepia", swatch: "#F4ECD8" },
  { id: "paper", label: "Kertas", swatch: "#FBFAF5" },
  { id: "oled", label: "OLED Hitam", swatch: "#000000" },
];

/** Tema yang sedang aktif di halaman ini. */
export function getTheme() {
  return document.documentElement.getAttribute("data-theme") || "light";
}

/** Terapkan & simpan tema baru. Mengembalikan id tema yang benar-benar dipakai. */
export function setTheme(themeId) {
  const valid = THEMES.some((t) => t.id === themeId) ? themeId : "light";
  document.documentElement.setAttribute("data-theme", valid);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, valid);
  } catch (_) {
    // localStorage tidak tersedia (mis. private mode) — tema tetap berlaku
    // untuk sesi berjalan saja, tidak fatal.
  }
  applyThemeColorMeta(valid);
  // Native StatusBar / NavBar
  import("../native/capacitor-bridge.js")
    .then((m) => m.applyNativeThemeColor?.(valid))
    .catch(() => {});
  return valid;
}

/**
 * Sinkronkan warna status bar (`<meta name="theme-color">`) dengan warna
 * background tema yang baru aktif.
 */
function applyThemeColorMeta(themeId) {
  const theme = THEMES.find((t) => t.id === themeId);
  if (!theme) return;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme.swatch);
}

/** Init tema dari localStorage (dipanggil di head inline + runtime). */
export function initThemeFromStorage() {
  let saved = "dark";
  try {
    saved = localStorage.getItem(THEME_STORAGE_KEY) || "dark";
  } catch (_) {}
  if (!THEMES.some((t) => t.id === saved)) saved = "dark";
  document.documentElement.setAttribute("data-theme", saved);
  applyThemeColorMeta(saved);
  return saved;
}
