/**
 * share-service.js
 * Share/unshare — lokal (Phase 2) + server (Phase 3) bila API dikonfigurasi.
 */

import * as documentService from "./document-service.js";
import { ensureOwnerKey, verifyOwnerKey, getOwnerKey } from "./owner-key.js";
import * as sharedApi from "./shared-api.js";

const ACCESS_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function generateAccessCode() {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += ACCESS_ALPHABET[bytes[i] % ACCESS_ALPHABET.length];
  }
  return out;
}

export function isValidAccessCode(code) {
  return /^[A-Za-z0-9]{8}$/.test((code || "").trim());
}

/**
 * Share note: lokal dulu, lalu upload ke server jika API ready.
 * @returns {{ note, accessCode, noteId, ownerKey, sessionToken?, serverSynced }}
 */
export async function shareNoteLocally(note) {
  if (!note || !note.id) throw new Error("Note tidak valid.");
  if (note.metadata && note.metadata.shared) {
    throw new Error("Note ini sudah di-share.");
  }

  const ownerKey = await ensureOwnerKey();
  const accessCode = generateAccessCode();
  const noteId = note.id;

  let sessionToken = null;
  let serverSynced = false;

  if (sharedApi.isApiConfigured()) {
    // Full document untuk server
    const full = await documentService.loadNote(note.id);
    const doc = full || note;
    try {
      const res = await sharedApi.apiShare({
        noteId,
        accessCode,
        ownerKey,
        title: doc.title || "",
        document: {
          id: doc.id,
          title: doc.title,
          blocks: doc.blocks,
          metadata: doc.metadata,
          schemaVersion: doc.schemaVersion,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
        displayName: "Owner",
      });
      sessionToken = res.sessionToken || null;
      serverSynced = true;
    } catch (e) {
      throw new Error("Gagal upload ke server: " + (e.message || e));
    }
  }

  const sharedMeta = {
    noteId,
    accessCode,
    role: "owner",
    joinedAt: new Date().toISOString(),
    displayName: "Owner",
    localBackupId: null,
    sessionToken,
    serverSynced,
  };

  const updated = await documentService.markNoteShared(note.id, sharedMeta);
  if (!updated) throw new Error("Gagal menandai note sebagai shared.");

  return {
    note: updated,
    accessCode,
    noteId,
    ownerKey,
    sessionToken,
    serverSynced,
    shareUrl: sharedApi.buildShareJoinUrl(noteId),
  };
}

export async function unshareNoteLocally(note, ownerKeyInput) {
  if (!note || !note.id) throw new Error("Note tidak valid.");
  if (!note.metadata || !note.metadata.shared) {
    throw new Error("Note ini tidak dalam status shared.");
  }
  if (note.metadata.sharedMeta && note.metadata.sharedMeta.role === "joiner") {
    throw new Error("Hanya pemilik yang bisa unshare.");
  }
  const ok = await verifyOwnerKey(ownerKeyInput);
  if (!ok) throw new Error("Owner Key tidak cocok.");

  const meta = note.metadata.sharedMeta || {};
  if (sharedApi.isApiConfigured() && meta.serverSynced) {
    try {
      await sharedApi.apiUnshare({
        noteId: meta.noteId || note.id,
        ownerKey: ownerKeyInput,
      });
    } catch (e) {
      // Jika server sudah tidak punya note, lanjut lokal
      if (e.status !== 404) throw e;
    }
  }

  return documentService.markNoteUnshared(note.id);
}

/**
 * Join shared note dari server → simpan lokal di tab Shared (role joiner).
 */
export async function joinSharedNote({ noteId, accessCode, displayName }) {
  if (!sharedApi.isApiConfigured()) {
    throw new Error("Server belum dikonfigurasi.");
  }
  if (!isValidAccessCode(accessCode)) throw new Error("Kode akses tidak valid.");
  if (!/^[\p{L}]{3,64}$/u.test((displayName || "").trim())) {
    throw new Error("Nama minimal 3 huruf.");
  }

  const res = await sharedApi.apiJoin({
    noteId: String(noteId).trim(),
    accessCode: String(accessCode).trim(),
    displayName: String(displayName).trim(),
  });

  const doc = res.document || {};
  const localId = noteId; // pakai noteId server sebagai id lokal shared

  // Simpan / update note lokal sebagai shared joiner
  // document-service saveNote expects full document shape
  const toSave = {
    id: localId,
    title: res.title || doc.title || "Shared note",
    blocks: doc.blocks || [],
    schemaVersion: doc.schemaVersion || 1,
    createdAt: doc.createdAt || new Date().toISOString(),
    updatedAt: doc.updatedAt || new Date().toISOString(),
    metadata: {
      ...(doc.metadata || {}),
      shared: true,
      trashed: false,
      pinned: false,
      archived: false,
      sharedMeta: {
        noteId,
        accessCode,
        role: "joiner",
        joinedAt: new Date().toISOString(),
        displayName: res.displayName || displayName,
        sessionToken: res.sessionToken,
        serverSynced: true,
        serverVersion: res.version || 1,
      },
    },
  };

  await documentService.saveNote(toSave);
  await documentService.markNoteShared(localId, toSave.metadata.sharedMeta);
  const saved = await documentService.loadNote(localId);
  return { note: saved, sessionToken: res.sessionToken, version: res.version };
}

export function getShareInfo(note) {
  if (!note || !note.metadata || !note.metadata.shared) return null;
  const meta = note.metadata.sharedMeta || {};
  return {
    noteId: meta.noteId || note.id,
    accessCode: meta.accessCode || "",
    role: meta.role || "owner",
    joinedAt: meta.joinedAt || null,
    displayName: meta.displayName || null,
    sessionToken: meta.sessionToken || null,
    serverSynced: !!meta.serverSynced,
  };
}

export async function hasOwnerKey() {
  return !!(await getOwnerKey());
}


/** URL publik join (Phase 5): /s/{noteId} */
export function getShareJoinUrl(noteId) {
  return sharedApi.buildShareJoinUrl(noteId);
}


/**
 * Ganti access code (owner only). Update server + sharedMeta lokal.
 */
export async function changeAccessCode(note, ownerKeyInput, newCode) {
  if (!note || !note.id) throw new Error("Note tidak valid.");
  if (!note.metadata || !note.metadata.shared) {
    throw new Error("Note ini tidak dalam status shared.");
  }
  const meta = note.metadata.sharedMeta || {};
  if (meta.role === "joiner") throw new Error("Hanya pemilik yang bisa ganti kode.");
  const ok = await verifyOwnerKey(ownerKeyInput);
  if (!ok) throw new Error("Owner Key tidak cocok.");
  if (!isValidAccessCode(newCode)) throw new Error("Kode akses harus 8 huruf/angka.");

  const noteId = meta.noteId || note.id;
  if (sharedApi.isApiConfigured() && meta.serverSynced) {
    await sharedApi.apiChangeCode({
      noteId,
      ownerKey: ownerKeyInput,
      accessCode: String(newCode).trim(),
    });
  }

  const nextMeta = {
    ...meta,
    accessCode: String(newCode).trim(),
  };
  return documentService.markNoteShared(note.id, nextMeta);
}
