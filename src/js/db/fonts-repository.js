/**
 * fonts-repository.js
 * Native: Filesystem. Web: IndexedDB.
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

export async function putFont(font) {
  if (await useFs()) return FS.putFontFS(font);
  await withStore(STORES.FONTS, "readwrite", (store) => requestToPromise(store.put(font)));
  return font;
}

export async function getFontById(id) {
  if (await useFs()) return FS.getFontByIdFS(id);
  return withStore(STORES.FONTS, "readonly", (store) => requestToPromise(store.get(id)));
}

export async function getAllFonts() {
  if (await useFs()) return FS.getAllFontsFS();
  return withStore(STORES.FONTS, "readonly", (store) => requestToPromise(store.getAll()));
}

export async function deleteFont(id) {
  if (await useFs()) return FS.deleteFontFS(id);
  await withStore(STORES.FONTS, "readwrite", (store) => requestToPromise(store.delete(id)));
}
