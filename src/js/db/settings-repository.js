/**
 * settings-repository.js
 * Native: Filesystem settings.json. Web: IndexedDB.
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

export async function getSetting(key) {
  if (await useFs()) return FS.getSettingFS(key);
  const row = await withStore(STORES.SETTINGS, "readonly", (store) =>
    requestToPromise(store.get(key))
  );
  return row ? row.value : undefined;
}

export async function setSetting(key, value) {
  if (await useFs()) return FS.setSettingFS(key, value);
  await withStore(STORES.SETTINGS, "readwrite", (store) =>
    requestToPromise(store.put({ key, value }))
  );
  return value;
}

export async function deleteSetting(key) {
  if (await useFs()) return FS.deleteSettingFS(key);
  await withStore(STORES.SETTINGS, "readwrite", (store) =>
    requestToPromise(store.delete(key))
  );
}
