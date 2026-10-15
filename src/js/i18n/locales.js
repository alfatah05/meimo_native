/**
 * locales.js — kamus UI: en (default), id, ja.
 * Pack per bahasa di ./locales/ agar file lebih mudah di-maintain.
 */
import en from "./locales/en.js";
import id from "./locales/id.js";
import ja from "./locales/ja.js";

export const LOCALES = { en, id, ja };

export const DEFAULT_LOCALE = "en";

export const LANGUAGES = [
  { id: "en", labelKey: "lang.en", nativeLabel: "English" },
  { id: "id", labelKey: "lang.id", nativeLabel: "Indonesia" },
  { id: "ja", labelKey: "lang.ja", nativeLabel: "日本語" },
];
