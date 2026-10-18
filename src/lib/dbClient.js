// ============================================================================
// Database Adapter (Local Only)
// ============================================================================

import { createLocalSupabase, resetLocalDatabase } from "./localBackend";

export const BUCKETS = {
  assets: "app-assets",
  attachments: "attachments",
};

const activeClient = createLocalSupabase();

export let dbClient = activeClient;
export let supabase = activeClient;
export const isDemoMode = true;

/** Reset basis data lokal (hanya tersedia untuk administrator). */
export function resetDemoData() {
  resetLocalDatabase();
  return true;
}

/**
 * Upload helper: Mengunggah file ke penyimpanan lokal/data-url instan.
 */
export async function uploadFileToStorage(file, bucketName = "app-assets") {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ url: String(reader.result), isCloud: false });
    reader.onerror = () => reject(new Error("Gagal membaca berkas dokumen"));
    reader.readAsDataURL(file);
  });
}

/** Helper konsistensi: membungkus error database menjadi pesan berbahasa Indonesia. */
export function parseError(error, fallback = "Terjadi kesalahan pada sistem. Silakan coba lagi.") {
  if (!error) return fallback;
  const message = String(error.message ?? error ?? "");
  return message || fallback;
}

