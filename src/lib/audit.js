import { supabase } from "./supabaseClient";

/**
 * Menulis baris audit ke public.activity_logs.
 * Kegagalan penulisan log tidak boleh menggagalkan aksi utama pengguna,
 * sehingga error di sini hanya dicatat ke konsol.
 */
export async function logActivity({ userId, action, entityName, entityId = null, details = {} }) {
  try {
    const { error } = await supabase.from("activity_logs").insert({
      user_id: userId ?? null,
      action,
      entity_name: entityName,
      entity_id: entityId ?? null,
      details: details ?? {},
      created_at: new Date().toISOString(),
    });
    if (error) console.warn("[sigap] audit log gagal dicatat:", error.message);
    return !error;
  } catch (error) {
    console.warn("[sigap] audit log gagal dicatat:", error);
    return false;
  }
}

/** Deskripsi ringkas audit log untuk Activity Stream. */
export function describeActivity(log, actorName) {
  const d = log.details ?? {};
  const subject = d.ticket_number ?? d.app_name ?? d.role_name ?? d.title ?? d.customer_name ?? d.name ?? null;
  const who = actorName ?? "Sistem";
  return {
    headline: `${who} · ${log.action}`,
    subject,
    extra: subject ? null : d.entity ?? null,
  };
}
