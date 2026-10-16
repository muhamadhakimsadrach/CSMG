// ============================================================================
// Database & TiDB MySQL Client Adapter
// Terintegrasi dengan database terpusat TiDB MySQL untuk operasional
// PT Aetra Air Tangerang.
// ============================================================================

import { createLocalSupabase, resetLocalDatabase } from "./localBackend";

export const isDemoMode = false;

export const BUCKETS = {
  assets: "app-assets",
  attachments: "attachments",
};

// Client database relasional terpadu TiDB MySQL
export const dbClient = createLocalSupabase();

// Alias ekspor untuk kompatibilitas seluruh komponen aplikasi
export const db = dbClient;
export const supabase = dbClient;

/** Reset basis data lokal (hanya tersedia untuk administrator). */
export function resetDemoData() {
  resetLocalDatabase();
  return true;
}

/**
 * Upload helper: Mengunggah file ke penyimpanan lokal/data-url instan.
 */
export async function uploadFileToStorage(
  file,
  _bucketName = "app-assets"
) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ url: String(reader.result), isCloud: false });
    reader.onerror = () => reject(new Error("Gagal membaca berkas dokumen"));
    reader.readAsDataURL(file);
  });
}

/** Helper konsistensi: membungkus error database menjadi pesan berbahasa Indonesia. */
export function parseError(error, fallback = "Terjadi kesalahan pada server database. Silakan coba lagi.") {
  if (!error) return fallback;
  const message = String(error.message ?? error ?? "");
  if (/Invalid login credentials/i.test(message)) return "Email atau kata sandi tidak sesuai.";
  if (/Email not confirmed/i.test(message)) return "Email akun belum dikonfirmasi. Hubungi administrator.";
  if (/failed to fetch|networkerror/i.test(message)) return "Server database tidak dapat dijangkau. Periksa koneksi TiDB MySQL.";
  if (/duplicate key|duplicate entry/i.test(message)) return "Data dengan nomor identifikasi atau nomor tiket tersebut sudah terdaftar.";
  if (/permission denied|access denied/i.test(message)) return "Anda tidak memiliki izin untuk operasi ini.";
  if (/relation .* does not exist|table .* doesn't exist/i.test(message)) return "Tabel database belum tersedia di TiDB MySQL.";
  if (/JWT expired|invalid claim|session expired/i.test(message)) return "Sesi Anda berakhir. Silakan masuk kembali.";
  return message || fallback;
}
