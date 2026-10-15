// ============================================================================
// MODUL A - Pendaftaran Pelanggan Baru: operasi baca/tulis ke Supabase.
// ============================================================================

import { logActivity } from "@/lib/audit";
import { isDemoMode, parseError, supabase } from "@/lib/supabaseClient";
import { resolveStorageUrl, uploadFile } from "@/lib/storage";
import { buildTicketNumber, isValidNik, isValidPhone, nowIso } from "@/lib/utils";
import { DOCUMENT_FIELDS, isActiveConnection, isCommercial } from "@/lib/waterDomain";

const REQUIRED_FIELDS = ["customer_name", "identity_number", "phone_number", "address"];

function sanitizeTerm(term) {
  return String(term ?? "").replace(/[,%()]/g, "").trim();
}

/**
 * Daftar pendaftaran dengan filter status, rentang tanggal, pencarian, dan paginasi.
 */
export async function fetchRegistrations({ search = "", statusId = "", statusIds = [], dateFrom = "", dateTo = "", page = 1, perPage = 8 } = {}) {
  let query = supabase.from("registrations").select("*", { count: "exact" });
  if (statusId) query = query.eq("current_status_id", statusId);
  else if (statusIds.length) query = query.in("current_status_id", statusIds);
  if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00.000`);
  if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59.999`);
  const term = sanitizeTerm(search);
  if (term) {
    query = query.or(`customer_name.ilike.%${term}%,ticket_number.ilike.%${term}%,identity_number.ilike.%${term}%,city.ilike.%${term}%`);
  }
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);
  if (error) throw new Error(parseError(error, "Gagal memuat data pendaftaran."));
  return { rows: data ?? [], total: count ?? (data?.length ?? 0) };
}

export async function fetchRegistrationById(id) {
  const { data, error } = await supabase.from("registrations").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(parseError(error, "Gagal memuat detail pendaftaran."));
  if (!data) throw new Error("Data pendaftaran tidak ditemukan atau akses Anda dibatasi.");
  return { ...data, attachment_urls: await Promise.all((data.attachment_urls ?? []).map(resolveStorageUrl)) };
}

export async function fetchStatusHistory(entityType, entityId) {
  const { data, error } = await supabase
    .from("status_history")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(parseError(error, "Gagal memuat riwayat status."));
  return data ?? [];
}

export async function fetchAllRegistrationsForExport(params = {}) {
  let query = supabase.from("registrations").select("*");
  if (params.statusId) query = query.eq("current_status_id", params.statusId);
  if (params.dateFrom) query = query.gte("created_at", `${params.dateFrom}T00:00:00.000`);
  if (params.dateTo) query = query.lte("created_at", `${params.dateTo}T23:59:59.999`);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(1000);
  if (error) throw new Error(parseError(error, "Gagal menyiapkan data cetak."));
  return data ?? [];
}

/** Validasi sisi klien sebelum submit (lapis pertama, RLS tetap penjaga terakhir). */
export function validateRegistrationForm(values, step) {
  const errors = {};
  if (step === 1) {
    if (!values.customer_name?.trim()) errors.customer_name = "Nama lengkap wajib diisi.";
    if (!isValidNik(values.identity_number)) errors.identity_number = "NIK harus tepat 16 digit angka.";
    if (!isValidPhone(values.phone_number?.replace(/[\s-]/g, ""))) errors.phone_number = "Gunakan nomor HP Indonesia yang valid (08xx atau +628xx).";
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) errors.email = "Format email belum benar.";
    if (!values.service_type) errors.service_type = "Pilih jenis layanan yang diminta.";
  }
  if (step === 2) {
    ["province", "city", "district", "village", "address"].forEach((key) => {
      if (!String(values[key] ?? "").trim()) {
        errors[key] = key === "address" ? "Alamat lengkap wajib diisi." : "Bagian ini wajib diisi.";
      }
    });
    if (values.latitude !== "" && values.latitude != null && (!Number.isFinite(Number(values.latitude)) || Math.abs(Number(values.latitude)) > 90)) errors.latitude = "Latitude harus antara -90 dan 90.";
    if (values.longitude !== "" && values.longitude != null && (!Number.isFinite(Number(values.longitude)) || Math.abs(Number(values.longitude)) > 180)) errors.longitude = "Longitude harus antara -180 dan 180.";
    if ((values.latitude === "") !== (values.longitude === "")) errors.latitude = "Isi kedua koordinat atau kosongkan keduanya.";
    if (values.building_area !== "" && values.building_area != null && Number(values.building_area) <= 0) errors.building_area = "Luas bangunan harus lebih dari nol.";
    if (values.occupants !== "" && values.occupants != null && (!Number.isInteger(Number(values.occupants)) || Number(values.occupants) < 1)) errors.occupants = "Jumlah penghuni minimal satu orang.";
  }
  if (step === 3) {
    DOCUMENT_FIELDS.filter((field) => field.required || (field.key === "businessFile" && isCommercial(values.service_type))).forEach((field) => {
      if (!values[field.key]) errors[field.key] = `${field.label} wajib diunggah.`;
    });
    if (!values.consent_accepted) errors.consent_accepted = "Persetujuan pemrosesan data diperlukan sebelum mengirim permohonan.";
  }
  return errors;
}

/**
 * Menyimpan pendaftaran baru: unggah lampiran -> generate nomor tiket ->
 * insert -> catat riwayat awal -> audit log.
 */
export async function createRegistration(values, { userId, initialStatusId, onProgress } = {}) {
  const validation = { ...validateRegistrationForm(values, 1), ...validateRegistrationForm(values, 2), ...validateRegistrationForm(values, 3) };
  if (Object.keys(validation).length) throw new Error(Object.values(validation)[0]);
  if (!initialStatusId) throw new Error("Alur sambungan air belum dikonfigurasi. Hubungi Admin Pusat.");
  const missing = REQUIRED_FIELDS.filter((key) => !String(values[key] ?? "").trim());
  if (missing.length) throw new Error(`Lengkapi isian berikut: ${missing.join(", ")}.`);
  if (!isValidNik(values.identity_number)) throw new Error("NIK tidak valid. NIK harus 16 digit angka.");

  onProgress?.("Mengunggah berkas lampiran…");
  const attachments = [];
  const attachmentLabels = [];
  for (const field of DOCUMENT_FIELDS.filter((field) => values[field.key])) {
    const res = await uploadFile(values[field.key], { bucket: "attachments", folder: `${userId}/registrations` });
    attachments.push(res.url);
    attachmentLabels.push(field.label);
  }

  onProgress?.("Menyiapkan nomor tiket…");
  let ticketNumber = "";
  if (isDemoMode) {
    const { data: existing } = await supabase.from("registrations").select("ticket_number").limit(2000);
    ticketNumber = buildTicketNumber("REG", (existing ?? []).map((r) => r.ticket_number));
  }

  const payload = {
    ticket_number: ticketNumber,
    customer_name: values.customer_name.trim(),
    identity_number: String(values.identity_number).trim(),
    phone_number: values.phone_number.trim(),
    email: values.email?.trim() || null,
    service_type: values.service_type,
    property_ownership: values.property_ownership || null,
    building_area: values.building_area ? Number(values.building_area) : null,
    occupants: values.occupants ? Number(values.occupants) : null,
    consent_accepted: Boolean(values.consent_accepted),
    attachment_labels: attachmentLabels,
    province: values.province?.trim() || null,
    city: values.city?.trim() || null,
    district: values.district?.trim() || null,
    village: values.village?.trim() || null,
    address: values.address.trim(),
    latitude: values.latitude === "" || values.latitude == null ? null : Number(values.latitude),
    longitude: values.longitude === "" || values.longitude == null ? null : Number(values.longitude),
    attachment_urls: attachments,
    current_status_id: initialStatusId ?? null,
    created_by: userId ?? null,
    created_at: nowIso(),
  };

  onProgress?.("Menyimpan data pendaftaran…");
  const { data, error } = await supabase.from("registrations").insert(payload).select().single();
  if (error) throw new Error(parseError(error, "Gagal menyimpan pendaftaran."));

  if (initialStatusId) {
    await supabase.from("status_history").insert({
      entity_type: "registration",
      entity_id: data.id,
      from_status_id: null,
      to_status_id: initialStatusId,
      note: "Berkas pendaftaran diterima melalui portal pelanggan.",
      changed_by: userId ?? null,
      created_at: nowIso(),
    });
  }

  await logActivity({
    userId,
    action: "Membuat pendaftaran pelanggan baru",
    entityName: "pendaftaran",
    entityId: data.id,
    details: { ticket_number: data.ticket_number, customer_name: data.customer_name, service_type: data.service_type },
  });

  return data;
}

export async function updateRegistrationStatus(registration, nextStatus, note, { userId, actorName, customerNumber, meterDiameter } = {}) {
  if (!nextStatus) throw new Error("Status tujuan tidak valid.");
  const payload = {
    current_status_id: nextStatus.id,
    updated_at: nowIso(),
  };
  if (isActiveConnection(nextStatus)) {
    if (!(customerNumber || registration.customer_number)?.trim()) throw new Error("Nomor pelanggan dari sistem Aetra diperlukan sebelum aktivasi.");
    payload.customer_number = (customerNumber || registration.customer_number).trim();
    payload.meter_diameter = meterDiameter || registration.meter_diameter || null;
  }
  if (note) {
    payload.verification_note = note;
    payload.verified_by = userId ?? null;
    payload.verified_at = nowIso();
  }
  const { data, error } = await supabase.from("registrations").update(payload).eq("id", registration.id).select().single();
  if (error) throw new Error(parseError(error, "Gagal memperbarui status pendaftaran."));

  await supabase.from("status_history").insert({
    entity_type: "registration",
    entity_id: registration.id,
    from_status_id: registration.current_status_id ?? null,
    to_status_id: nextStatus.id,
    note: note?.trim() || `Status diubah menjadi "${nextStatus.status_name}" oleh ${actorName ?? "petugas"}.`,
    changed_by: userId ?? null,
    created_at: nowIso(),
  });

  await logActivity({
    userId,
    action: "Memperbarui status pendaftaran",
    entityName: "pendaftaran",
    entityId: registration.id,
    details: { ticket_number: registration.ticket_number, status: nextStatus.status_name },
  });
  return data;
}

export async function updateRegistration(id, patch, { userId, ticketNumber } = {}) {
  const { data, error } = await supabase.from("registrations").update({ ...patch, updated_at: nowIso() }).eq("id", id).select().single();
  if (error) throw new Error(parseError(error, "Gagal memperbarui data pendaftaran."));
  await logActivity({
    userId,
    action: "Memperbarui data pendaftaran",
    entityName: "pendaftaran",
    entityId: id,
    details: { ticket_number: ticketNumber ?? data?.ticket_number, fields: Object.keys(patch) },
  });
  return data;
}

export async function deleteRegistration(registration, { userId } = {}) {
  try {
    await supabase.from("status_history").delete().eq("entity_type", "registration").eq("entity_id", registration.id);
  } catch (error) {
    console.warn("[sigap] pembersihan riwayat gagal", error);
  }
  const { error } = await supabase.from("registrations").delete().eq("id", registration.id);
  if (error) throw new Error(parseError(error, "Gagal menghapus pendaftaran."));
  await logActivity({
    userId,
    action: "Menghapus pendaftaran",
    entityName: "pendaftaran",
    entityId: registration.id,
    details: { ticket_number: registration.ticket_number, customer_name: registration.customer_name },
  });
  return true;
}
