/**
 * fs-storage.js
 * Backend penyimpanan native: @capacitor/filesystem → Directory.Data
 * (= /data/data/<package>/files/... di Android).
 *
 * Struktur:
 *   meimo-data/notes/{id}.json
 *   meimo-data/assets/{id}.bin          (base64 binary)
 *   meimo-data/assets/{id}.meta.json
 *   meimo-data/fonts/{id}.json         (meta + files base64)
 *   meimo-data/settings.json
 *   meimo-data/_meta.json              (versi migrasi)
 */

import { isNative, getFilesystem, initNative } from "../native/capacitor-bridge.js";

const ROOT = "meimo-data";

async function ensureReady() {
  if (!isNative()) throw new Error("FS storage hanya untuk native Capacitor");
  let { Filesystem, Directory, Encoding } = getFilesystem();
  if (!Filesystem || !Directory) {
    await initNative();
    ({ Filesystem, Directory, Encoding } = getFilesystem());
  }
  if (!Filesystem || !Directory) throw new Error("Filesystem plugin belum siap");
  return { Filesystem, Directory, Encoding, DIR: Directory.Data };
}

async function ensureDir(rel) {
  const { Filesystem, DIR } = await ensureReady();
  try {
    await Filesystem.mkdir({ path: `${ROOT}/${rel}`, directory: DIR, recursive: true });
  } catch (_) {}
}

async function writeJson(relPath, obj) {
  const { Filesystem, Encoding, DIR } = await ensureReady();
  const parent = relPath.includes("/") ? relPath.split("/").slice(0, -1).join("/") : "";
  if (parent) await ensureDir(parent);
  else await ensureDir("");
  await Filesystem.writeFile({
    path: `${ROOT}/${relPath}`,
    data: JSON.stringify(obj),
    directory: DIR,
    encoding: Encoding.UTF8,
    recursive: true,
  });
}

async function readJson(relPath) {
  const { Filesystem, Encoding, DIR } = await ensureReady();
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
  const { Filesystem, DIR } = await ensureReady();
  const parent = relPath.includes("/") ? relPath.split("/").slice(0, -1).join("/") : "";
  if (parent) await ensureDir(parent);
  await Filesystem.writeFile({
    path: `${ROOT}/${relPath}`,
    data: base64,
    directory: DIR,
    recursive: true,
  });
}

async function readBin(relPath) {
  const { Filesystem, DIR } = await ensureReady();
  try {
    const { data } = await Filesystem.readFile({
      path: `${ROOT}/${relPath}`,
      directory: DIR,
    });
    return data; // base64 string
  } catch {
    return null;
  }
}

async function removeFile(relPath) {
  const { Filesystem, DIR } = await ensureReady();
  try {
    await Filesystem.deleteFile({ path: `${ROOT}/${relPath}`, directory: DIR });
  } catch (_) {}
}

async function listDir(relPath) {
  const { Filesystem, DIR } = await ensureReady();
  try {
    await ensureDir(relPath);
    const { files } = await Filesystem.readdir({
      path: `${ROOT}/${relPath}`,
      directory: DIR,
    });
    return files || [];
  } catch {
    return [];
  }
}

/* ---------- helpers binary ---------- */
function arrayBufferToBase64(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf.buffer || buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const clean = String(base64 || "").replace(/^data:[^;]+;base64,/, "");
  const bin = atob(clean);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr.buffer;
}

/* ---------- Notes ---------- */
export async function putNoteFS(note) {
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
    const name = f.name || f;
    if (!String(name).endsWith(".json")) continue;
    const n = await readJson(`notes/${name}`);
    if (n) notes.push(n);
  }
  return notes;
}

export async function deleteNoteFS(id) {
  await removeFile(`notes/${id}.json`);
}

/* ---------- Assets (bytes ↔ base64) ---------- */
export async function putAssetFS(asset) {
  const { id, noteId, mimeType, createdAt } = asset;
  let base64 = asset.base64 || null;
  if (!base64 && asset.bytes) base64 = arrayBufferToBase64(asset.bytes);
  if (!base64 && asset.blob) {
    const buf = await asset.blob.arrayBuffer();
    base64 = arrayBufferToBase64(buf);
  }
  await writeJson(`assets/${id}.meta.json`, {
    id,
    noteId,
    mimeType: mimeType || "application/octet-stream",
    createdAt: createdAt || Date.now(),
  });
  if (base64) await writeBin(`assets/${id}.bin`, base64);
  return asset;
}

export async function getAssetByIdFS(id) {
  const meta = await readJson(`assets/${id}.meta.json`);
  if (!meta) return undefined;
  const base64 = await readBin(`assets/${id}.bin`);
  const bytes = base64 ? base64ToArrayBuffer(base64) : null;
  return {
    id: meta.id,
    noteId: meta.noteId,
    mimeType: meta.mimeType,
    createdAt: meta.createdAt,
    bytes,
    blob: null,
  };
}

export async function getAssetsByNoteIdFS(noteId) {
  const files = await listDir("assets");
  const out = [];
  for (const f of files) {
    const name = f.name || f;
    if (!String(name).endsWith(".meta.json")) continue;
    const meta = await readJson(`assets/${name}`);
    if (meta?.noteId === noteId) {
      const a = await getAssetByIdFS(meta.id);
      if (a) out.push(a);
    }
  }
  return out;
}

export async function deleteAssetFS(id) {
  await removeFile(`assets/${id}.meta.json`);
  await removeFile(`assets/${id}.bin`);
}

export async function deleteAssetsByNoteIdFS(noteId) {
  const assets = await getAssetsByNoteIdFS(noteId);
  for (const a of assets) await deleteAssetFS(a.id);
}

/* ---------- Fonts ---------- */
function fontMetaFromRaw(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    name: raw.name,
    family: raw.family,
    category: raw.category || "",
    source: raw.source || "library",
    installedAt: raw.installedAt,
    files: Array.isArray(raw.files)
      ? raw.files.map((f) => ({
          weight: f.weight || 400,
          style: f.style || "normal",
          mimeType: f.mimeType || "",
        }))
      : [],
  };
}

export async function putFontFS(font) {
  // font.files[].bytes → base64
  const serializable = {
    ...font,
    files: (font.files || []).map((f) => ({
      weight: f.weight,
      style: f.style,
      mimeType: f.mimeType,
      base64: f.base64 || (f.bytes ? arrayBufferToBase64(f.bytes) : null),
    })),
  };
  // hapus bytes mentah dari salinan
  for (const f of serializable.files) delete f.bytes;
  await writeJson(`fonts/${font.id}.json`, serializable);
  // Meta ringan terpisah — getAllFontsMetaFS tidak perlu decode base64.
  await writeJson(`fonts/${font.id}.meta.json`, fontMetaFromRaw(font));
  return font;
}

export async function getFontByIdFS(id) {
  const raw = await readJson(`fonts/${id}.json`);
  if (!raw) return undefined;
  return {
    ...raw,
    files: (raw.files || []).map((f) => ({
      weight: f.weight,
      style: f.style,
      mimeType: f.mimeType,
      bytes: f.base64 ? base64ToArrayBuffer(f.base64) : null,
    })),
  };
}

/** Baca hanya metadata (file .meta.json). Fallback ke full JSON tanpa decode base64. */
export async function getFontMetaByIdFS(id) {
  const meta = await readJson(`fonts/${id}.meta.json`);
  if (meta) return fontMetaFromRaw(meta);
  // Fallback: parse full file tapi JANGAN decode base64 → ArrayBuffer
  const raw = await readJson(`fonts/${id}.json`);
  if (!raw) return undefined;
  const m = fontMetaFromRaw(raw);
  // Tulis meta untuk next time
  try { await writeJson(`fonts/${id}.meta.json`, m); } catch (_) {}
  return m;
}

async function mapPoolFS(items, fn, concurrency = 4) {
  const list = Array.from(items || []);
  const out = new Array(list.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, Math.max(1, list.length)) }, async () => {
    while (i < list.length) {
      const idx = i++;
      out[idx] = await fn(list[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function getAllFontsMetaFS() {
  const files = await listDir("fonts");
  const ids = [];
  for (const f of files) {
    const name = String(f.name || f);
    // Prefer *.meta.json; kalau belum ada, pakai *.json (bukan *.meta.json)
    if (name.endsWith(".meta.json")) {
      ids.push(name.replace(/\.meta\.json$/, ""));
    }
  }
  // Juga id yang cuma punya full .json (belum punya meta)
  const idSet = new Set(ids);
  for (const f of files) {
    const name = String(f.name || f);
    if (name.endsWith(".json") && !name.endsWith(".meta.json")) {
      const id = name.replace(/\.json$/, "");
      if (!idSet.has(id)) {
        idSet.add(id);
        ids.push(id);
      }
    }
  }
  const results = await mapPoolFS(ids, (id) => getFontMetaByIdFS(id), 6);
  return results.filter(Boolean);
}

export async function getAllFontsFS() {
  const files = await listDir("fonts");
  const ids = [];
  for (const f of files) {
    const name = String(f.name || f);
    if (name.endsWith(".json") && !name.endsWith(".meta.json")) {
      ids.push(name.replace(/\.json$/, ""));
    }
  }
  // Parallel terbatas — sequential dulu sangat lambat saat banyak font
  const results = await mapPoolFS(ids, (id) => getFontByIdFS(id), 3);
  return results.filter(Boolean);
}

export async function deleteFontFS(id) {
  await removeFile(`fonts/${id}.json`);
  try { await removeFile(`fonts/${id}.meta.json`); } catch (_) {}
}

/* ---------- Settings (key-value map) ---------- */
export async function getSettingFS(key) {
  const all = (await readJson("settings.json")) || {};
  return all[key];
}

export async function setSettingFS(key, value) {
  const all = (await readJson("settings.json")) || {};
  all[key] = value;
  await writeJson("settings.json", all);
  return value;
}

export async function deleteSettingFS(key) {
  const all = (await readJson("settings.json")) || {};
  delete all[key];
  await writeJson("settings.json", all);
}

/* ---------- Meta / availability ---------- */
export async function getMetaFS() {
  return (await readJson("_meta.json")) || {};
}

export async function setMetaFS(patch) {
  const cur = (await readJson("_meta.json")) || {};
  const next = { ...cur, ...patch };
  await writeJson("_meta.json", next);
  return next;
}

export async function isFsAvailable() {
  if (!isNative()) return false;
  try {
    await ensureReady();
    return true;
  } catch {
    return false;
  }
}
