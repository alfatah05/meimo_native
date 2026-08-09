/**
 * fonts-repository.js
 * Native: Filesystem. Web: IndexedDB.
 *
 * getAllFonts()       → full records (termasuk bytes) — mahal, hindari di hot path
 * getAllFontsMeta()   → id/name/family/category/source saja — murah
 * getFontById(id)     → full record satu font (untuk FontFace)
 */

import { withStore, requestToPromise } from "./db.js";
import { STORES } from "./schema.js";
import { isNative } from "../native/capacitor-bridge.js";
import * as FS from "./fs-storage.js";

async function useFs() {
  try {
    return isNative() && (await FS.isFsAvailable());
  } catch {
    return false;
  }
}

function stripToMeta(font) {
  if (!font) return null;
  return {
    id: font.id,
    name: font.name,
    family: font.family,
    category: font.category || "",
    source: font.source || "library",
    installedAt: font.installedAt,
    // file descriptors tanpa bytes — cukup untuk tahu weight/style yang ada
    files: Array.isArray(font.files)
      ? font.files.map((f) => ({
          weight: f.weight || 400,
          style: f.style || "normal",
          mimeType: f.mimeType || "",
        }))
      : [],
  };
}

export async function putFont(font) {
  if (await useFs()) return FS.putFontFS(font);
  await withStore(STORES.FONTS, "readwrite", (store) => requestToPromise(store.put(font)));
  return font;
}

export async function getFontById(id) {
  if (await useFs()) return FS.getFontByIdFS(id);
  return withStore(STORES.FONTS, "readonly", (store) => requestToPromise(store.get(id)));
}

/** Full records termasuk ArrayBuffer — mahal. Prefer getAllFontsMeta + getFontById. */
export async function getAllFonts() {
  if (await useFs()) return FS.getAllFontsFS();
  return withStore(STORES.FONTS, "readonly", (store) => requestToPromise(store.getAll()));
}

/**
 * Hanya metadata (tanpa decode base64 / tanpa ArrayBuffer).
 * Di native FS: baca file meta ringan; di IDB: getAll lalu strip (IDB
 * tetap harus baca blob sekali, tapi pemanggil tidak mem-FontFace-kan
 * semuanya).
 */
export async function getAllFontsMeta() {
  if (await useFs()) return FS.getAllFontsMetaFS();
  const all = await withStore(STORES.FONTS, "readonly", (store) =>
    requestToPromise(store.getAll())
  );
  return (all || []).map(stripToMeta);
}

export async function deleteFont(id) {
  if (await useFs()) return FS.deleteFontFS(id);
  await withStore(STORES.FONTS, "readwrite", (store) => requestToPromise(store.delete(id)));
}

export { stripToMeta };
