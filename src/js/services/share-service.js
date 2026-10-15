/**
 * share-service.js
 * Logika share/unshare catatan (Phase 2 = lokal dulu, belum hit server).
 *
 * Aturan (lihat project memory v2):
 * - Share opsional; default offline-first.
 * - Access: noteId + access code 8 char alphanumeric (case-sensitive).
 * - Owner Key per instalasi (owner-key.js) untuk unshare / ganti kode.
 * - Setelah share: metadata.shared = true → hilang dari Home, muncul di Shared.
 */

import * as documentService from "./document-service.js";
import { ensureOwnerKey, verifyOwnerKey, getOwnerKey } from "./owner-key.js";

const ACCESS_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Generate access code 8 karakter (tanpa karakter ambigu 0/O, 1/l). */
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
 * Share note secara lokal (Phase 2).
 * - Pastikan Owner Key ada
 * - Generate access code
 * - Tandai metadata.shared + sharedMeta (role owner)
 *
 * @returns {{ note, accessCode, noteId, ownerKey }}
 */
export async function shareNoteLocally(note) {
  if (!note || !note.id) {
    throw new Error("Note tidak valid.");
  }
  if (note.metadata && note.metadata.shared) {
    throw new Error("Note ini sudah di-share.");
  }

  const ownerKey = await ensureOwnerKey();
  const accessCode = generateAccessCode();
  // Phase 2: pakai id lokal sebagai noteId publik.
  // Phase 3 (server) bisa mengganti dengan id dari server.
  const noteId = note.id;

  const sharedMeta = {
    noteId,
    accessCode,
    role: "owner",
    joinedAt: new Date().toISOString(),
    displayName: null,
    localBackupId: null,
  };

  const updated = await documentService.markNoteShared(note.id, sharedMeta);
  if (!updated) {
    throw new Error("Gagal menandai note sebagai shared.");
  }

  return {
    note: updated,
    accessCode,
    noteId,
    ownerKey,
  };
}

/**
 * Unshare note (hanya owner, butuh Owner Key).
 * @returns {object|null} note setelah unshare
 */
export async function unshareNoteLocally(note, ownerKeyInput) {
  if (!note || !note.id) {
    throw new Error("Note tidak valid.");
  }
  if (!note.metadata || !note.metadata.shared) {
    throw new Error("Note ini tidak dalam status shared.");
  }
  if (note.metadata.sharedMeta && note.metadata.sharedMeta.role === "joiner") {
    throw new Error("Hanya pemilik yang bisa unshare.");
  }

  const ok = await verifyOwnerKey(ownerKeyInput);
  if (!ok) {
    throw new Error("Owner Key tidak cocok.");
  }

  return documentService.markNoteUnshared(note.id);
}

/** Ambil info share dari note (untuk tampilan). */
export function getShareInfo(note) {
  if (!note || !note.metadata || !note.metadata.shared) return null;
  const meta = note.metadata.sharedMeta || {};
  return {
    noteId: meta.noteId || note.id,
    accessCode: meta.accessCode || "",
    role: meta.role || "owner",
    joinedAt: meta.joinedAt || null,
    displayName: meta.displayName || null,
  };
}

/** Apakah device ini punya Owner Key tersimpan. */
export async function hasOwnerKey() {
  return !!(await getOwnerKey());
}
