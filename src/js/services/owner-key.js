/**
 * owner-key.js
 * Owner Key untuk kontrol note yang di-share (unshare, ganti access code).
 *
 * Aturan (v2):
 * - Satu Owner Key per instalasi app (bukan per note).
 * - Disimpan offline lewat settings-repository (IDB web / Filesystem native).
 * - Hanya device yang punya app + Owner Key yang bisa share / unshare.
 * - Kalau data settings masih ada setelah reinstall, key yang sama dipakai
 *   lagi (tidak generate baru).
 *
 * Server tidak menyimpan Owner Key plaintext; key ini rahasia di device.
 */

import { getSetting, setSetting } from "../db/settings-repository.js";

const SETTINGS_KEY = "ownerKey";

/** Karakter aman untuk key (tanpa ambigu 0/O, 1/l). */
const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/**
 * Generate Owner Key baru (24 karakter).
 * Dipanggil hanya saat device belum punya key sama sekali.
 */
function generateOwnerKey() {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += KEY_ALPHABET[bytes[i] % KEY_ALPHABET.length];
  }
  return out;
}

/**
 * Ambil Owner Key yang tersimpan. `null` jika belum pernah dibuat.
 */
export async function getOwnerKey() {
  const value = await getSetting(SETTINGS_KEY);
  if (typeof value === "string" && value.trim().length >= 16) {
    return value.trim();
  }
  return null;
}

/**
 * Pastikan device punya Owner Key. Jika belum ada → generate & simpan.
 * Jika sudah ada → kembalikan yang lama (jangan regenerate).
 */
export async function ensureOwnerKey() {
  const existing = await getOwnerKey();
  if (existing) return existing;
  const key = generateOwnerKey();
  await setSetting(SETTINGS_KEY, key);
  return key;
}

/**
 * Import / restore Owner Key manual (pindah device).
 * Validasi panjang minimal 16 karakter.
 */
export async function importOwnerKey(key) {
  const trimmed = (key || "").trim();
  if (trimmed.length < 16) {
    throw new Error("Owner Key terlalu pendek (minimal 16 karakter).");
  }
  await setSetting(SETTINGS_KEY, trimmed);
  return trimmed;
}

/**
 * Verifikasi string cocok dengan Owner Key di device ini.
 */
export async function verifyOwnerKey(input) {
  const stored = await getOwnerKey();
  if (!stored) return false;
  return stored === (input || "").trim();
}
