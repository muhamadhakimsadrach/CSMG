// ============================================================================
// Utilitas unggah berkas ke Supabase Storage (bucket app-assets & attachments)
// dengan validasi tipe/ukuran serta penamaan aman.
// ============================================================================

import { BUCKETS, supabase, parseError, isDemoMode } from "./supabaseClient";

const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];

export const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB sesuai spesifikasi

function safeName(file) {
  const extRaw = String(file.name || "").split(".").pop() || "bin";
  const ext = extRaw.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  const stamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${rand}.${ext}`;
}

/**
 * @param {File} file
 * @param {{ bucket?: keyof typeof BUCKETS, folder?: string }} options
 * @returns {Promise<{ url: string, path: string }>}
 */
export async function uploadFile(file, options = {}) {
  const bucketKey = options.bucket ?? "attachments";
  const bucket = BUCKETS[bucketKey] ?? BUCKETS.attachments;
  if (!file) throw new Error("Berkas belum dipilih.");
  const allowed = bucketKey === "assets" ? ALLOWED : ["image/png", "image/jpeg", "image/webp", "application/pdf"];
  if (!allowed.includes(file.type)) {
    throw new Error(bucketKey === "assets" ? "Gunakan logo PNG, JPEG, WEBP, atau SVG." : "Dokumen harus berformat PNG, JPEG, WEBP, atau PDF.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Ukuran berkas ${Math.round(file.size / 1024 / 1024)} MB melebihi batas 2 MB.`);
  }
  const folder = options.folder ?? `${bucketKey}/${new Date().getFullYear()}`;
  const path = `${folder}/${safeName(file)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(parseError(error, "Gagal mengunggah berkas ke penyimpanan."));
  if (bucketKey === "attachments" && !isDemoMode) return { url: `storage://${bucket}/${path}`, path };
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

// Store stable object references; generate short-lived URLs only when displayed.
export async function resolveStorageUrl(value) {
  if (!value?.startsWith("storage://")) return value;
  const reference = value.slice("storage://".length);
  const slash = reference.indexOf("/");
  const bucket = reference.slice(0, slash);
  const path = reference.slice(slash + 1);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) throw new Error(parseError(error, "Dokumen privat tidak dapat diakses. Muat ulang atau periksa hak akses."));
  return data.signedUrl;
}

/** Membaca berkas menjadi data-URL untuk pratinjau segera (tanpa unggah). */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gagal membaca berkas yang dipilih."));
    reader.readAsDataURL(file);
  });
}
