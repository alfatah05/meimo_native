/**
 * fs-storage.js
 * Native-only storage backend memakai @capacitor/filesystem di Directory.Data.
 * Struktur:
 *   data/notes/{id}.json
 *   data/assets/{id}.bin + data/assets/{id}.meta.json
 *   data/fonts/{id}.bin + data/fonts/{id}.meta.json
 *   data/settings.json
 *
 * Dipakai otomatis bila Capacitor native; web tetap IndexedDB.
 */

import { isNative, Filesystem, Directory, Encoding } from "../native/capacitor-bridge.js";

const ROOT = "meimo-data";
const DIR = Directory.Data;

async function ensureDir(path) {
  try {
    await Filesystem.mkdir({ path: `${ROOT}/${path}`, directory: DIR, recursive: true });
  } catch (_) {}
}

async function writeJson(relPath, obj) {
  await ensureDir(relPath.split("/").slice(0, -1).join("/") || "");
  await Filesystem.writeFile({
    path: `${ROOT}/${relPath}`,
    data: JSON.stringify(obj),
    directory: DIR,
    encoding: Encoding.UTF8,
    recursive: true,
  });
}

async function readJson(relPath) {
  try {
    const { data } = await Filesystem.readFile({
      path: `${ROOT}/${relPath}`,
      directory: DIR,
      encoding: Encoding.UTF8,
    });
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function writeBin(relPath, base64) {
  await ensureDir(relPath.split("/").slice(0, -1).join("/") || "");
  await Filesystem.writeFile({
    path: `${ROOT}/${relPath}`,
    data: base64,
    directory: DIR,
    recursive: true,
  });
}

async function readBin(relPath) {
  try {
    const { data } = await Filesystem.readFile({
      path: `${ROOT}/${relPath}`,
      directory: DIR,
    });
    return data; // base64
  } catch {
    return null;
  }
}

async function remove(relPath) {
  try {
    await Filesystem.deleteFile({ path: `${ROOT}/${relPath}`, directory: DIR });
  } catch (_) {}
}

async function listDir(relPath) {
  try {
    const { files } = await Filesystem.readdir({
      path: `${ROOT}/${relPath}`,
      directory: DIR,
    });
    return files || [];
  } catch {
    return [];
  }
}

/* ---- Notes ---- */
export async function putNoteFS(note) {
  if (!isNative()) throw new Error("FS storage only on native");
  await writeJson(`notes/${note.id}.json`, note);
  return note;
}

export async function getNoteByIdFS(id) {
  return readJson(`notes/${id}.json`);
}

export async function getAllNotesFS() {
  const files = await listDir("notes");
  const notes = [];
  for (const f of files) {
    if (!f.name?.endsWith(".json")) continue;
    const n = await readJson(`notes/${f.name}`);
    if (n) notes.push(n);
  }
  return notes;
}

export async function deleteNoteFS(id) {
  await remove(`notes/${id}.json`);
}

/* ---- Assets (binary as base64) ---- */
export async function putAssetFS(asset) {
  const { id, noteId, mimeType, ...meta } = asset;
  let base64 = asset.base64;
  if (!base64 && asset.blob) {
    base64 = await blobToBase64(asset.blob);
  }
  if (!base64 && asset.bytes) {
    base64 = btoa(String.fromCharCode(...new Uint8Array(asset.bytes)));
  }
  await writeJson(`assets/${id}.meta.json`, { id, noteId, mimeType, ...meta });
  if (base64) await writeBin(`assets/${id}.bin`, base64);
  return asset;
}

export async function getAssetByIdFS(id) {
  const meta = await readJson(`assets/${id}.meta.json`);
  if (!meta) return null;
  const base64 = await readBin(`assets/${id}.bin`);
  return { ...meta, base64 };
}

export async function getAssetsByNoteIdFS(noteId) {
  const files = await listDir("assets");
  const out = [];
  for (const f of files) {
    if (!f.name?.endsWith(".meta.json")) continue;
    const meta = await readJson(`assets/${f.name}`);
    if (meta?.noteId === noteId) {
      const id = meta.id;
      const base64 = await readBin(`assets/${id}.bin`);
      out.push({ ...meta, base64 });
    }
  }
  return out;
}

export async function deleteAssetFS(id) {
  await remove(`assets/${id}.meta.json`);
  await remove(`assets/${id}.bin`);
}

export async function deleteAssetsByNoteIdFS(noteId) {
  const assets = await getAssetsByNoteIdFS(noteId);
  for (const a of assets) await deleteAssetFS(a.id);
}

/* ---- Settings ---- */
export async function getSettingsFS() {
  return (await readJson("settings.json")) || {};
}

export async function putSettingsFS(obj) {
  await writeJson("settings.json", obj);
  return obj;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve((r.result || "").split(",")[1] || "");
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export async function isFsAvailable() {
  return isNative() && !!Filesystem;
}
