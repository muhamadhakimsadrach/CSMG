import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { logActivity } from "@/lib/audit";
import { isDemoMode, parseError, supabase } from "@/lib/supabaseClient";

const WorkflowContext = createContext(null);

export const WORKFLOW_TYPES = {
  REGISTRATION: { key: "REGISTRATION", label: "Alur Pendaftaran Pelanggan", shortLabel: "Pendaftaran", module: "pendaftaran" },
  REPAIR: { key: "REPAIR", label: "Alur Perbaikan Air", shortLabel: "Perbaikan Air", module: "repair" },
};

const byStep = (a, b) => a.step_order - b.step_order;

/**
 * WorkflowContext - satu sumber kebenaran untuk seluruh status alur kerja
 * (Pendaftaran & Perbaikan Air) beserta aturan siapa yang boleh memindahkannya.
 */
export function WorkflowProvider({ children }) {
  const { userId, profile, can, isAdmin } = useAuth();
  const toast = useToast();
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error: qErr } = await supabase
        .from("workflow_statuses")
        .select("*")
        .order("workflow_type", { ascending: true })
        .order("step_order", { ascending: true });
      if (qErr) throw new Error(parseError(qErr, "Gagal memuat konfigurasi alur kerja."));
      setStatuses(data ?? []);
      setError(null);
    } catch (err) {
      setError(err.message);
      toast.error(err.message, { title: "Alur Kerja" });
    } finally {
      setLoading(false);
    }
  }, [toast, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const statusesFor = useCallback(
    (type) => statuses.filter((s) => s.workflow_type === type).sort(byStep),
    [statuses]
  );

  const statusMap = useMemo(() => {
    const map = new Map();
    statuses.forEach((s) => map.set(String(s.id), s));
    return map;
  }, [statuses]);

  const statusOf = useCallback((id) => (id ? statusMap.get(String(id)) ?? null : null), [statusMap]);

  const initialStatus = useCallback(
    (type) => statusesFor(type).find((s) => s.is_initial) ?? statusesFor(type)[0] ?? null,
    [statusesFor]
  );

  /** Apakah peran aktif boleh memindahkan tiket ke status tujuan. */
  const canMoveTo = useCallback(
    (status) => {
      if (!status) return false;
      if (isAdmin) return true;
      if (!can(status.workflow_type === "REGISTRATION" ? "pendaftaran" : "repair", "update")) return false;
      const allowed = Array.isArray(status.allowed_role_ids) ? status.allowed_role_ids : [];
      if (!allowed.length) return true;
      if (!profile?.role_id) return false;
      return allowed.some((r) => String(r) === String(profile.role_id));
    },
    [can, profile, isAdmin]
  );

  const persistStatuses = useCallback(async (rows) => {
    if (!isDemoMode) {
      const { error } = await supabase.rpc("reorder_water_workflow", { p_status_ids: rows.map((row) => row.id) });
      if (error) throw new Error(parseError(error, "Gagal mengurutkan alur. Jalankan migrasi layanan air."));
      return;
    }
    for (let index = 0; index < rows.length; index += 1) {
      const { error } = await supabase.from("workflow_statuses").update({ step_order: -10000 - index }).eq("id", rows[index].id);
      if (error) throw new Error(parseError(error, "Gagal menyiapkan urutan status."));
    }
    for (const row of rows) {
      const { error: uErr } = await supabase.from("workflow_statuses").update({ step_order: row.step_order }).eq("id", row.id);
      if (uErr) throw new Error(parseError(uErr, "Gagal menyimpan urutan status."));
    }
  }, []);

  const saveStatus = useCallback(
    async (form) => {
      if (!can("workflow", "update") && !can("workflow", "create")) {
        toast.warning("Anda tidak memiliki izin untuk mengubah alur kerja.");
        return false;
      }
      setSaving(true);
      try {
        const payload = {
          workflow_type: form.workflow_type,
          status_name: form.status_name.trim(),
          step_order: Number(form.step_order),
          color_code: form.color_code,
          allowed_role_ids: form.allowed_role_ids ?? [],
          is_initial: Boolean(form.is_initial),
          is_final: Boolean(form.is_final),
        };
        const isEdit = Boolean(form.id);
        const { data, error: sErr } = isEdit
          ? await supabase.from("workflow_statuses").update(payload).eq("id", form.id).select().single()
          : await supabase.from("workflow_statuses").insert(payload).select().single();
        if (sErr) throw new Error(parseError(sErr, "Gagal menyimpan status alur kerja."));

        // One initial step is required; successful and rejected terminal states may coexist.
        const siblings = statuses.filter((s) => s.workflow_type === form.workflow_type && String(s.id) !== String(data.id));
        const cleanups = [];
        if (payload.is_initial) {
          siblings.filter((s) => s.is_initial).forEach((s) => cleanups.push({ id: s.id, patch: { is_initial: false } }));
        }
        for (const item of cleanups) {
          await supabase.from("workflow_statuses").update(item.patch).eq("id", item.id);
        }

        await logActivity({
          userId,
          action: isEdit ? "Memperbarui status alur kerja" : "Menambah status alur kerja",
          entityName: "workflow",
          entityId: data.id,
          details: { status_name: data.status_name, workflow_type: data.workflow_type, step_order: data.step_order },
        });
        await load();
        toast.success(`Status "${data.status_name}" berhasil ${isEdit ? "diperbarui" : "ditambahkan"}.`, { title: "Alur Kerja" });
        return data;
      } catch (err) {
        toast.error(err.message, { title: "Gagal Menyimpan Status" });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [can, load, statuses, toast, userId]
  );

  const moveStatus = useCallback(
    async (type, id, direction) => {
      if (!can("workflow", "update")) {
        toast.warning("Anda tidak memiliki izin untuk mengubah urutan alur kerja.");
        return false;
      }
      const list = statusesFor(type);
      const index = list.findIndex((s) => String(s.id) === String(id));
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || swapWith < 0 || swapWith >= list.length) return false;
      const reordered = [...list];
      [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];
      const payload = reordered.map((s, i) => ({ id: s.id, step_order: i + 1 }));
      try {
        await persistStatuses(payload);
        await logActivity({
          userId,
          action: "Mengurutkan ulang status alur kerja",
          entityName: "workflow",
          entityId: id,
          details: { workflow_type: type, moved: reordered[index].status_name, to_position: swapWith + 1 },
        });
        await load();
        return true;
      } catch (err) {
        toast.error(err.message, { title: "Gagal Mengurutkan" });
        return false;
      }
    },
    [can, load, persistStatuses, statusesFor, toast, userId]
  );

  const deleteStatus = useCallback(
    async (id) => {
      if (!can("workflow", "delete")) {
        toast.warning("Hanya peran dengan izin hapus yang dapat membuang status alur kerja.");
        return false;
      }
      try {
        const target = statusMap.get(String(id));
        const { error: dErr } = await supabase.from("workflow_statuses").delete().eq("id", id);
        if (dErr) throw new Error(parseError(dErr, "Gagal menghapus status."));
        await logActivity({
          userId,
          action: "Menghapus status alur kerja",
          entityName: "workflow",
          entityId: id,
          details: { status_name: target?.status_name, workflow_type: target?.workflow_type },
        });
        await load();
        toast.success("Status alur kerja dihapus.", { title: "Alur Kerja" });
        return true;
      } catch (err) {
        toast.error(err.message, { title: "Gagal Menghapus" });
        return false;
      }
    },
    [can, load, statusMap, toast, userId]
  );

  const value = useMemo(
    () => ({
      statuses,
      loading,
      saving,
      error,
      load,
      statusesFor,
      statusOf,
      statusMap,
      initialStatus,
      canMoveTo,
      saveStatus,
      moveStatus,
      deleteStatus,
    }),
    [statuses, loading, saving, error, load, statusesFor, statusOf, statusMap, initialStatus, canMoveTo, saveStatus, moveStatus, deleteStatus]
  );

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

export function useWorkflow() {
  const ctx = useContext(WorkflowContext);
  if (!ctx) throw new Error("useWorkflow harus dipakai di dalam WorkflowProvider.");
  return ctx;
}
