// ============================================================================
// Supabase Client & Realtime Database Adapter
// Mendukung koneksi live Supabase Cloud dengan sinkronisasi realtime,
// serta fallback otomatis ke penyimpanan lokal saat kredensial belum dikonfigurasi.
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import { createLocalSupabase, resetLocalDatabase } from "./localBackend";

export const BUCKETS = {
  assets: "app-assets",
  attachments: "attachments",
};

const STORAGE_URL_KEY = "aetra.supabase_url";
const STORAGE_ANON_KEY = "aetra.supabase_anon_key";

function resolveConfig() {
  const envUrl = typeof import.meta !== "undefined" ? import.meta.env?.VITE_SUPABASE_URL : "";
  const envKey = typeof import.meta !== "undefined" ? import.meta.env?.VITE_SUPABASE_ANON_KEY : "";

  let storedUrl = "";
  let storedKey = "";
  try {
    storedUrl = window.localStorage.getItem(STORAGE_URL_KEY) || "";
    storedKey = window.localStorage.getItem(STORAGE_ANON_KEY) || "";
  } catch {
    // ignore
  }

  const url = (storedUrl || envUrl || "").trim();
  const anonKey = (storedKey || envKey || "").trim();
  const isLive = Boolean(url && anonKey && url.startsWith("https://") && url.includes(".supabase.co"));

  return { url, anonKey, isLive };
}

let activeConfig = resolveConfig();
let activeClient = activeConfig.isLive
  ? createClient(activeConfig.url, activeConfig.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : createLocalSupabase();

export let dbClient = activeClient;
export let db = activeClient;
export let supabase = activeClient;
export const isDemoMode = !activeConfig.isLive;

/** Dapatkan konfigurasi Supabase saat ini (tanpa membocorkan key lengkap) */
export function getSupabaseConfig() {
  return {
    url: activeConfig.url,
    hasKey: Boolean(activeConfig.anonKey),
    isLive: activeConfig.isLive,
    maskedKey: activeConfig.anonKey
      ? `${activeConfig.anonKey.slice(0, 8)}...${activeConfig.anonKey.slice(-6)}`
      : "",
  };
}

/** Simpan dan aktifkan kredensial Supabase baru secara live */
export async function configureSupabase(url, anonKey) {
  const cleanUrl = String(url || "").trim();
  const cleanKey = String(anonKey || "").trim();

  if (!cleanUrl || !cleanKey) {
    throw new Error("URL Proyek dan Anon Key wajib diisi.");
  }
  if (!cleanUrl.startsWith("https://") || !cleanUrl.includes(".supabase.co")) {
    throw new Error("Format URL Supabase tidak valid. Contoh: https://xyzcompany.supabase.co");
  }

  const newClient = createClient(cleanUrl, cleanKey, {
    auth: { persistSession: true, autoRefreshToken: true },
    realtime: { params: { eventsPerSecond: 10 } },
  });

  // Uji koneksi sederhana
  const testRes = await newClient.from("app_settings").select("id").limit(1);
  if (testRes.error && testRes.error.code === "PGRST301") {
    // JWT error
    throw new Error("Anon Key tidak valid atau telah kedaluwarsa.");
  }

  try {
    window.localStorage.setItem(STORAGE_URL_KEY, cleanUrl);
    window.localStorage.setItem(STORAGE_ANON_KEY, cleanKey);
  } catch {
    // ignore
  }

  activeConfig = { url: cleanUrl, anonKey: cleanKey, isLive: true };
  activeClient = newClient;
  dbClient = newClient;
  db = newClient;
  supabase = newClient;

  return { success: true, message: "Koneksi Supabase Realtime berhasil diaktifkan!" };
}

/** Putuskan koneksi Supabase dan kembali ke penyimpanan lokal */
export function disconnectSupabase() {
  try {
    window.localStorage.removeItem(STORAGE_URL_KEY);
    window.localStorage.removeItem(STORAGE_ANON_KEY);
  } catch {
    // ignore
  }
  activeConfig = { url: "", anonKey: "", isLive: false };
  activeClient = createLocalSupabase();
  dbClient = activeClient;
  db = activeClient;
  supabase = activeClient;
}

/** Uji koneksi realtime Supabase */
export async function testSupabaseConnection() {
  if (!activeConfig.isLive) {
    return {
      success: false,
      isLive: false,
      message: "Supabase belum dikonfigurasi. Masukkan Project URL dan Anon Key untuk mengaktifkan sinkronisasi realtime.",
    };
  }

  try {
    const start = performance.now();
    const { data, error } = await activeClient.from("registrations").select("id").limit(1);
    const latency = Math.round(performance.now() - start);

    if (error) {
      if (error.code === "42P01" || /relation .* does not exist/i.test(error.message)) {
        return {
          success: true,
          isLive: true,
          latency,
          message: "Terhubung ke Supabase! Catatan: Tabel belum dibuat, silakan jalankan skrip SQL di SQL Editor Supabase.",
          needTables: true,
        };
      }
      return {
        success: false,
        isLive: true,
        message: `Terhubung ke gateway Supabase, namun terjadi kesalahan: ${error.message}`,
      };
    }

    return {
      success: true,
      isLive: true,
      latency,
      message: `Berhasil terhubung ke Supabase Realtime! (Latensi: ${latency}ms)`,
    };
  } catch (err) {
    return {
      success: false,
      isLive: true,
      message: err.message || "Gagal menghubungi server Supabase.",
    };
  }
}

/** Reset basis data lokal (hanya tersedia untuk administrator). */
export function resetDemoData() {
  resetLocalDatabase();
  return true;
}

/** Upload helper: Mengunggah file ke bucket Supabase atau data-url fallback */
export async function uploadFileToStorage(file, bucketName = "app-assets") {
  if (activeConfig.isLive && file instanceof File) {
    try {
      const ext = file.name.split(".").pop();
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const { data, error } = await activeClient.storage.from(bucketName).upload(filename, file);
      if (!error && data?.path) {
        const { data: pub } = activeClient.storage.from(bucketName).getPublicUrl(data.path);
        return { url: pub.publicUrl, isCloud: true };
      }
    } catch {
      // fallback to reader
    }
  }

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
  if (/failed to fetch|networkerror/i.test(message)) return "Server Supabase tidak dapat dijangkau. Periksa koneksi internet Anda.";
  if (/duplicate key|duplicate entry/i.test(message)) return "Data dengan nomor identifikasi atau nomor tiket tersebut sudah terdaftar.";
  if (/permission denied|access denied/i.test(message)) return "Anda tidak memiliki izin untuk operasi ini (kebijakan RLS).";
  if (/relation .* does not exist|table .* doesn't exist/i.test(message)) return "Tabel belum dibuat di database Supabase.";
  if (/JWT expired|invalid claim|session expired/i.test(message)) return "Sesi Anda berakhir. Silakan masuk kembali.";
  return message || fallback;
}
