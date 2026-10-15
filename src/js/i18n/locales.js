/**
 * locales.js — kamus UI: en (default), id, ja.
 * Konten catatan user tidak diterjemahkan.
 *
 * TEMP: file was accidentally overwritten; full restore follows in next commit if truncated.
 * SEE main branch for full content if this is incomplete.
 */

export const LOCALES = {
  en: {
    "nav.archive": "Open Archive",
    "nav.shared": "Open Shared",
    "nav.back": "Back",
    "shared.title": "Shared",
    "shared.section": "Shared notes",
    "shared.empty.title": "No shared notes",
    "shared.empty.desc": "Notes you share or join will appear here.",
    "shared.join.toggle": "Join a shared note",
    "shared.join.toggleDesc": "Enter note ID, access code, and your name",
    "shared.join.noteId": "Note ID",
    "shared.join.code": "Access code (8 characters)",
    "shared.join.name": "Your name (letters only, min 3)",
    "shared.join.submit": "Join",
    "shared.join.needId": "Enter the note ID.",
    "shared.join.needCode": "Enter a valid 8-character access code.",
    "shared.join.needName": "Name must be at least 3 letters (A–Z only).",
    "shared.join.soon": "Online join will be available in a later phase.",
    "title.shared": "Shared — Meimo",
    "title.home": "Notes — Home",
    "title.archive": "Archive — Meimo",
    "archive.title": "Archive",
    "home.title": "My Notes",
    "app.name": "Meimo"
  },
  id: {
    "nav.archive": "Buka Arsip",
    "nav.shared": "Buka Shared",
    "nav.back": "Kembali",
    "shared.title": "Shared",
    "shared.section": "Catatan shared",
    "shared.empty.title": "Belum ada catatan shared",
    "shared.empty.desc": "Catatan yang kamu bagikan atau gabungi akan muncul di sini.",
    "shared.join.toggle": "Gabung catatan shared",
    "shared.join.toggleDesc": "Masukkan ID catatan, kode akses, dan namamu",
    "shared.join.noteId": "ID catatan",
    "shared.join.code": "Kode akses (8 karakter)",
    "shared.join.name": "Namamu (huruf saja, min 3)",
    "shared.join.submit": "Gabung",
    "shared.join.needId": "Masukkan ID catatan.",
    "shared.join.needCode": "Masukkan kode akses 8 karakter yang valid.",
    "shared.join.needName": "Nama minimal 3 huruf (A–Z saja).",
    "shared.join.soon": "Gabung online akan tersedia di tahap berikutnya.",
    "title.shared": "Shared — Meimo",
    "title.home": "Catatan — Beranda",
    "title.archive": "Arsip — Meimo",
    "archive.title": "Arsip",
    "home.title": "Catatanku",
    "app.name": "Meimo"
  },
  ja: {
    "nav.archive": "アーカイブを開く",
    "nav.shared": "共有を開く",
    "nav.back": "戻る",
    "shared.title": "共有",
    "shared.section": "共有メモ",
    "shared.empty.title": "共有メモはありません",
    "shared.empty.desc": "共有したメモや参加したメモがここに表示されます。",
    "shared.join.toggle": "共有メモに参加",
    "shared.join.toggleDesc": "メモID、アクセスコード、名前を入力",
    "shared.join.noteId": "メモID",
    "shared.join.code": "アクセスコード（8文字）",
    "shared.join.name": "名前（英字のみ、3文字以上）",
    "shared.join.submit": "参加",
    "shared.join.needId": "メモIDを入力してください。",
    "shared.join.needCode": "有効な8文字のアクセスコードを入力してください。",
    "shared.join.needName": "名前は英字3文字以上にしてください。",
    "shared.join.soon": "オンライン参加は次の段階で利用できます。",
    "title.shared": "共有 — Meimo",
    "title.home": "メモ — ホーム",
    "title.archive": "アーカイブ — Meimo",
    "archive.title": "アーカイブ",
    "home.title": "マイメモ",
    "app.name": "Meimo"
  }
};

export const LANG_OPTIONS = [
  { id: "en", labelKey: "lang.en", nativeLabel: "English" },
  { id: "id", labelKey: "lang.id", nativeLabel: "Indonesia" },
  { id: "ja", labelKey: "lang.ja", nativeLabel: "日本語" },
];
