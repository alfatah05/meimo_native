/**
 * notes-repository.js
 * Native (Capacitor): Filesystem Directory.Data — TANPA IndexedDB.
 * Web (browser): IndexedDB (hanya untuk dev/PWA web).
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

export async function putNote(note) {
  if (await useFs()) return FS.putNoteFS(note);
  await withStore(STORES.NOTES, "readwrite", (store) => requestToPromise(store.put(note)));
  return note;
}

export async function getNoteById(id) {
  if (await useFs()) return FS.getNoteByIdFS(id);
  return withStore(STORES.NOTES, "readonly", (store) => requestToPromise(store.get(id)));
}

export async function getAllNotes() {
  if (await useFs()) return FS.getAllNotesFS();
  return withStore(STORES.NOTES, "readonly", (store) => requestToPromise(store.getAll()));
}

export async function deleteNote(id) {
  if (await useFs()) return FS.deleteNoteFS(id);
  await withStore(STORES.NOTES, "readwrite", (store) => requestToPromise(store.delete(id)));
}

export async function putAsset(asset) {
  if (await useFs()) return FS.putAssetFS(asset);
  await withStore(STORES.ASSETS, "readwrite", (store) => requestToPromise(store.put(asset)));
  return asset;
}

export async function getAssetById(id) {
  if (await useFs()) return FS.getAssetByIdFS(id);
  return withStore(STORES.ASSETS, "readonly", (store) => requestToPromise(store.get(id)));
}

export async function getAssetsByNoteId(noteId) {
  if (await useFs()) return FS.getAssetsByNoteIdFS(noteId);
  return withStore(STORES.ASSETS, "readonly", (store) =>
    requestToPromise(store.index("noteId").getAll(noteId))
  );
}

export async function deleteAsset(id) {
  if (await useFs()) return FS.deleteAssetFS(id);
  await withStore(STORES.ASSETS, "readwrite", (store) => requestToPromise(store.delete(id)));
}

export async function deleteAssetsByNoteId(noteId) {
  if (await useFs()) return FS.deleteAssetsByNoteIdFS(noteId);
  await withStore(STORES.ASSETS, "readwrite", (store) => {
    return new Promise((resolve, reject) => {
      const request = store.index("noteId").openCursor(IDBKeyRange.only(noteId));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  });
}
