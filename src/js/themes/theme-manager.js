/**
 * theme-manager.js
 * Tema UI + sync StatusBar/NavBar native.
 */

export const THEME_STORAGE_KEY = "notes-app-theme";

export const THEMES = [
  { id: "light", label: "Terang", swatch: "#FFFFFF" },
  { id: "dark", label: "Gelap", swatch: "#17181C" },
  { id: "sepia", label: "Sepia", swatch: "#F4ECD8" },
  { id: "paper", label: "Kertas", swatch: "#FBFAF5" },
  { id: "oled", label: "OLED Hitam", swatch: "#000000" },
];

export function getTheme() {
  return document.documentElement.getAttribute("data-theme") || "light";
}

export function setTheme(themeId) {
  const valid = THEMES.some((t) => t.id === themeId) ? themeId : "light";
  document.documentElement.setAttribute("data-theme", valid);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, valid);
  } catch (_) {}
  applyThemeColorMeta(valid);

  // Native bars — realtime
  import("../native/capacitor-bridge.js")
    .then((m) => {
      if (typeof m.applyNativeThemeColor === "function") {
        return m.applyNativeThemeColor(valid);
      }
    })
    .catch(() => {});

  return valid;
}

function applyThemeColorMeta(themeId) {
  const theme = THEMES.find((t) => t.id === themeId);
  if (!theme) return;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme.swatch);
}

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
