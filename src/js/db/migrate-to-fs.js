/**
 * migrate-to-fs.js
 * Migrasi sekali jalan: IndexedDB → Filesystem (Directory.Data).
 * Dipanggil dari spa-app / boot native SEBELUM notes list diload.
 */

import { isNative, initNative } from "../native/capacitor-bridge.js";
import * as FS from "./fs-storage.js";

const MIGRATION_FLAG = "idbToFsV1";

/**
 * Baca semua data dari IndexedDB langsung (tanpa repository),
 * tulis ke FS, set flag migrasi.
 * Aman dipanggil berulang — skip jika sudah migrated.
 */
export async function migrateIdbToFilesystem() {
  if (!isNative()) return { skipped: true, reason: "not-native" };

  await initNative();
  if (!(await FS.isFsAvailable())) {
    return { skipped: true, reason: "fs-unavailable" };
  }

  const meta = await FS.getMetaFS();
  if (meta[MIGRATION_FLAG]) {
    return { skipped: true, reason: "already-migrated", meta };
  }

  let notes = 0;
  let assets = 0;
  let fonts = 0;
  let settings = 0;

  try {
    const idbData = await readAllFromIdb();
    for (const note of idbData.notes || []) {
      await FS.putNoteFS(note);
      notes++;
    }
    for (const asset of idbData.assets || []) {
      await FS.putAssetFS(asset);
      assets++;
    }
    for (const font of idbData.fonts || []) {
      await FS.putFontFS(font);
      fonts++;
    }
    for (const row of idbData.settings || []) {
      if (row && row.key !== undefined) {
        await FS.setSettingFS(row.key, row.value);
        settings++;
      }
    }

    await FS.setMetaFS({
      [MIGRATION_FLAG]: true,
      migratedAt: new Date().toISOString(),
      counts: { notes, assets, fonts, settings },
    });

    // Hapus IDB setelah sukses (opsional, cegah data dobel / bingung)
    try {
      await deleteIdbDatabase();
    } catch (e) {
      console.warn("[migrate] gagal hapus IDB (abaikan):", e);
    }

    console.log("[migrate] IDB → FS selesai", { notes, assets, fonts, settings });
    return { ok: true, notes, assets, fonts, settings };
  } catch (err) {
    console.error("[migrate] gagal:", err);
    return { ok: false, error: String(err?.message || err) };
  }
}

function readAllFromIdb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      resolve({ notes: [], assets: [], fonts: [], settings: [] });
      return;
    }
    const req = indexedDB.open("personal-notes-db");
    req.onerror = () => resolve({ notes: [], assets: [], fonts: [], settings: [] });
    req.onsuccess = () => {
      const db = req.result;
      const names = [...db.objectStoreNames];
      if (names.length === 0) {
        db.close();
        resolve({ notes: [], assets: [], fonts: [], settings: [] });
        return;
      }
      const result = { notes: [], assets: [], fonts: [], settings: [] };
      const tx = db.transaction(names, "readonly");
      tx.oncomplete = () => {
        db.close();
        resolve(result);
      };
      tx.onerror = () => {
        db.close();
        resolve(result);
      };
      if (names.includes("notes")) {
        tx.objectStore("notes").getAll().onsuccess = (e) => {
          result.notes = e.target.result || [];
        };
      }
      if (names.includes("assets")) {
        tx.objectStore("assets").getAll().onsuccess = (e) => {
          result.assets = e.target.result || [];
        };
      }
      if (names.includes("fonts")) {
        tx.objectStore("fonts").getAll().onsuccess = (e) => {
          result.fonts = e.target.result || [];
        };
      }
      if (names.includes("settings")) {
        tx.objectStore("settings").getAll().onsuccess = (e) => {
          result.settings = e.target.result || [];
        };
      }
    };
  });
}

function deleteIdbDatabase() {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve();
      return;
    }
    const req = indexedDB.deleteDatabase("personal-notes-db");
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}
