// ============================================================================
// Klien Supabase terpadu.
// - Bila VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY tersedia  -> mode CLOUD.
// - Bila kosong                                                 -> MODE DEMO (adapter lokal).
// Seluruh modul aplikasi hanya berbicara terhadap objek `supabase` sehingga
// pemindahan ke proyek Supabase asli tidak memerlukan perubahan kode.
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import { createLocalSupabase, resetLocalDatabase } from "./localBackend";

const url = (import.meta.env?.VITE_SUPABASE_URL ?? "").trim();
const anonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY ?? "").trim();

export const isDemoMode = !(url && anonKey);

export const BUCKETS = {
  assets: "app-assets",
  attachments: "attachments",
};

let client;
try {
  client = isDemoMode
    ? createLocalSupabase()
    : createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: "sigap.auth",
        },
        global: { headers: { "x-application-name": "sigap-portal-terpadu" } },
      });
} catch (error) {
  console.error("[sigap] inisialisasi Supabase gagal, kembali ke mode demo", error);
  client = createLocalSupabase();
}

export const supabase = client;

/** Reset basis data lokal (hanya tersedia pada mode demo). */
export function resetDemoData() {
  if (!isDemoMode) return false;
  resetLocalDatabase();
  return true;
}

/** Helper konsistensi: membungkus error Supabase menjadi pesan berbahasa Indonesia. */
export function parseError(error, fallback = "Terjadi kesalahan pada server. Silakan coba lagi.") {
  if (!error) return fallback;
  const message = String(error.message ?? error ?? "");
  if (/Invalid login credentials/i.test(message)) return "Email atau kata sandi tidak sesuai.";
  if (/Email not confirmed/i.test(message)) return "Email akun belum dikonfirmasi. Hubungi administrator.";
  if (/failed to fetch|networkerror/i.test(message)) return "Server tidak dapat dijangkau. Periksa koneksi dan konfigurasi Supabase.";
  if (/Could not find.*column|column .* does not exist/i.test(message)) return "Struktur layanan air belum diperbarui. Jalankan supabase/migrations/20261014_aetra_water_services.sql.";
  if (/duplicate key/i.test(message)) return "Data dengan identifier tersebut sudah terdaftar.";
  if (/row-level security|new row violates/i.test(message)) return "Anda tidak memiliki izin untuk operasi ini (ditolak oleh RLS).";
  if (/relation .* does not exist/i.test(message)) return "Tabel belum tersedia. Jalankan skema supabase/schema.sql pada SQL Editor.";
  if (/JWT expired|invalid claim/i.test(message)) return "Sesi Anda berakhir. Silakan masuk kembali.";
  return message || fallback;
}
