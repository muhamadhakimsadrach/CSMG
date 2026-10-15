// ============================================================================
// MODUL B - Gangguan & Perbaikan Air: operasi baca/tulis ke Supabase.
// ============================================================================

import { logActivity } from "@/lib/audit";
import { isDemoMode, parseError, supabase } from "@/lib/supabaseClient";
import { resolveStorageUrl, uploadFile } from "@/lib/storage";
import { buildTicketNumber, nowIso, SLA_HOURS } from "@/lib/utils";

const SORTABLE = new Set(["ticket_number", "title", "priority", "created_at", "updated_at", "resolved_at", "due_at"]);

export async function fetchRepairOrders({ search = "", priority = "", statusId = "", assignedTo = "", sort = "created_at", dir = "desc", page = 1, perPage = 10 } = {}) {
  let query = supabase.from("repair_orders").select("*", { count: "exact" });
  if (priority) query = query.eq("priority", priority);
  if (statusId) query = query.eq("current_status_id", statusId);
  if (assignedTo) query = query.eq("assigned_to", assignedTo);
  const term = String(search ?? "").replace(/[,%()]/g, "").trim();
  if (term) {
    query = query.or(`title.ilike.%${term}%,ticket_number.ilike.%${term}%,location_address.ilike.%${term}%,service_category.ilike.%${term}%`);
  }
  const column = SORTABLE.has(sort) ? sort : "created_at";
  const { data, count, error } = await query
    .order(column, { ascending: dir === "asc" })
    .range((page - 1) * perPage, page * perPage - 1);
  if (error) throw new Error(parseError(error, "Gagal memuat tiket perbaikan air."));
  return { rows: await Promise.all((data ?? []).map(hydrateRepair)), total: count ?? (data?.length ?? 0) };
}

/** Seluruh tiket (tanpa paginasi) - dipakai Kanban agar kolom tidak bolong. */
export async function fetchRepairBoard({ search = "", priority = "" } = {}) {
  let query = supabase.from("repair_orders").select("*");
  if (priority) query = query.eq("priority", priority);
  const term = String(search ?? "").replace(/[,%()]/g, "").trim();
  if (term) {
    query = query.or(`title.ilike.%${term}%,ticket_number.ilike.%${term}%,location_address.ilike.%${term}%`);
  }
  const { data, error } = await query.order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error(parseError(error, "Gagal memuat papan kerja repair."));
  return Promise.all((data ?? []).map(hydrateRepair));
}

export async function fetchRepairOrderById(id) {
  const { data, error } = await supabase.from("repair_orders").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(parseError(error, "Gagal memuat detail tiket."));
  if (!data) throw new Error("Tiket tidak ditemukan atau akses Anda dibatasi.");
  return hydrateRepair(data);
}

async function hydrateRepair(record) {
  return { ...record, proof_image_url: await resolveStorageUrl(record.proof_image_url) };
}

export function validateRepairForm(values) {
  const errors = {};
  if (!values.title?.trim()) errors.title = "Judul masalah wajib diisi.";
  if (!values.description?.trim()) errors.description = "Jelaskan kerusakan yang ditemukan.";
  if (!values.location_address?.trim()) errors.location_address = "Lokasi kerusakan wajib diisi.";
  if (!values.priority) errors.priority = "Tentukan tingkat prioritas.";
  if (!values.service_category?.trim()) errors.service_category = "Kategori layanan wajib dipilih.";
  return errors;
}

export async function createRepairOrder(values, { userId, initialStatusId, onProgress } = {}) {
  const errors = validateRepairForm(values);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  onProgress?.("Menyiapkan nomor tiket gangguan…");
  let ticketNumber = "";
  if (isDemoMode) {
    const { data: existing } = await supabase.from("repair_orders").select("ticket_number").limit(2000);
    ticketNumber = buildTicketNumber("RPR", (existing ?? []).map((r) => r.ticket_number));
  }
  const slaHours = values.sla_hours ?? SLA_HOURS[values.priority] ?? 48;
  const payload = {
    ticket_number: ticketNumber,
    title: values.title.trim(),
    customer_number: values.customer_number?.trim() || null,
    description: values.description.trim(),
    priority: values.priority,
    sla_hours: slaHours,
    location_address: values.location_address.trim(),
    service_category: values.service_category.trim(),
    assigned_to: values.assigned_to || null,
    assigned_division: values.assigned_division || null,
    current_status_id: initialStatusId ?? null,
    materials_used: [],
    due_at: new Date(Date.now() + slaHours * 3_600_000).toISOString(),
    created_by: userId ?? null,
    created_at: nowIso(),
  };
  onProgress?.("Menyimpan tiket…");
  const { data, error } = await supabase.from("repair_orders").insert(payload).select().single();
  if (error) throw new Error(parseError(error, "Gagal menyimpan tiket gangguan."));

  if (initialStatusId) {
    await supabase.from("status_history").insert({
      entity_type: "repair",
      entity_id: data.id,
      from_status_id: null,
      to_status_id: initialStatusId,
      note: "Tiket perbaikan air diajukan ke papan kerja teknisi.",
      changed_by: userId ?? null,
      created_at: nowIso(),
    });
  }

  await logActivity({
    userId,
    action: "Mengajukan tiket perbaikan air",
    entityName: "repair",
    entityId: data.id,
    details: { ticket_number: data.ticket_number, title: data.title, priority: data.priority },
  });
  return data;
}

export async function updateRepairStatus(order, nextStatus, note, { userId, proofFile, materials, technicianNotes } = {}) {
  if (!nextStatus?.id) throw new Error("Status tujuan tidak tersedia.");
  if (nextStatus.is_final && !proofFile && !order.proof_image_url) throw new Error("Foto bukti perbaikan diperlukan untuk menyelesaikan tiket.");
  if (nextStatus.is_final && !(technicianNotes || order.technician_notes)?.trim()) throw new Error("Catatan teknis diperlukan untuk menyelesaikan tiket.");
  const patch = { current_status_id: nextStatus?.id ?? order.current_status_id, updated_at: nowIso() };
  const isFinal = Boolean(nextStatus?.is_final);

  let proofUrl = order.proof_image_url ?? null;
  if (proofFile instanceof File) {
    const res = await uploadFile(proofFile, { bucket: "attachments", folder: `${userId}/repairs` });
    proofUrl = res.url;
  }
  if (proofUrl !== order.proof_image_url) patch.proof_image_url = proofUrl;
  if (technicianNotes !== undefined) patch.technician_notes = technicianNotes;
  if (Array.isArray(materials)) patch.materials_used = materials;
  if (isFinal && !order.resolved_at) patch.resolved_at = nowIso();
  if (!isFinal) patch.resolved_at = null;

  const { data, error } = await supabase.from("repair_orders").update(patch).eq("id", order.id).select().single();
  if (error) throw new Error(parseError(error, "Gagal memperbarui tiket gangguan."));

  await supabase.from("status_history").insert({
    entity_type: "repair",
    entity_id: order.id,
    from_status_id: order.current_status_id ?? null,
    to_status_id: nextStatus?.id ?? null,
    note: note?.trim() || `Status diubah menjadi "${nextStatus?.status_name ?? "Belum ditentukan"}".`,
    changed_by: userId ?? null,
    created_at: nowIso(),
  });

  await logActivity({
    userId,
    action: isFinal ? "Menyelesaikan tiket perbaikan air" : "Memperbarui status tiket gangguan",
    entityName: "repair",
    entityId: order.id,
    details: { ticket_number: order.ticket_number, status: nextStatus?.status_name, materials: Array.isArray(materials) ? materials.length : undefined },
  });
  return data;
}

export async function assignRepairOrder(order, assignee, { userId } = {}) {
  const { data, error } = await supabase
    .from("repair_orders")
    .update({ assigned_to: assignee?.id ?? null, assigned_division: assignee?.department ?? null, updated_at: nowIso() })
    .eq("id", order.id)
    .select()
    .single();
  if (error) throw new Error(parseError(error, "Gagal menugaskan teknisi."));
  await logActivity({
    userId,
    action: "Menugaskan teknisi pada tiket gangguan",
    entityName: "repair",
    entityId: order.id,
    details: { ticket_number: order.ticket_number, technician: assignee?.full_name ?? "Dilepas" },
  });
  return data;
}

export async function updateRepairOrder(id, patch, { userId, ticketNumber } = {}) {
  const { data, error } = await supabase.from("repair_orders").update({ ...patch, updated_at: nowIso() }).eq("id", id).select().single();
  if (error) throw new Error(parseError(error, "Gagal memperbarui tiket."));
  await logActivity({
    userId,
    action: "Memperbarui tiket perbaikan air",
    entityName: "repair",
    entityId: id,
    details: { ticket_number: ticketNumber, fields: Object.keys(patch) },
  });
  return data;
}

export async function deleteRepairOrder(order, { userId } = {}) {
  try {
    await supabase.from("status_history").delete().eq("entity_type", "repair").eq("entity_id", order.id);
  } catch (error) {
    console.warn("[sigap] pembersihan riwayat gagal", error);
  }
  const { error } = await supabase.from("repair_orders").delete().eq("id", order.id);
  if (error) throw new Error(parseError(error, "Gagal menghapus tiket gangguan."));
  await logActivity({
    userId,
    action: "Menghapus tiket perbaikan air",
    entityName: "repair",
    entityId: order.id,
    details: { ticket_number: order.ticket_number, title: order.title },
  });
  return true;
}
