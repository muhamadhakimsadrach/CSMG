import { useCallback, useEffect, useRef, useState } from "react";
import {
  createRegistration,
  deleteRegistration,
  fetchRegistrationById,
  fetchRegistrations,
  fetchStatusHistory,
  updateRegistration,
  updateRegistrationStatus,
} from "@/lib/api/registrations";

/**
 * useRegistrations - memuat daftar pendaftaran sesuai filter & paginasi,
 * lengkap dengan status loading/error serta aksi mutasi yang memicu reload.
 */
export function useRegistrations(filters = {}) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const key = JSON.stringify(filters);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const result = await fetchRegistrations(filters);
      if (id !== requestId.current) return;
      setRows(result.rows);
      setTotal(result.total);
      setError(null);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err.message);
      setRows([]);
      setTotal(0);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    rows,
    total,
    loading,
    error,
    reload: load,
    create: async (values, ctx) => {
      const created = await createRegistration(values, ctx);
      await load();
      return created;
    },
    changeStatus: async (registration, nextStatus, note, ctx) => {
      const updated = await updateRegistrationStatus(registration, nextStatus, note, ctx);
      await load();
      return updated;
    },
    update: async (id, patch, ctx) => {
      const updated = await updateRegistration(id, patch, ctx);
      await load();
      return updated;
    },
    remove: async (registration, ctx) => {
      await deleteRegistration(registration, ctx);
      await load();
      return true;
    },
  };
}

/** Data detail satu pendaftaran + riwayat status. */
export function useRegistrationDetail(id) {
  const [record, setRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [detail, hist] = await Promise.all([fetchRegistrationById(id), fetchStatusHistory("registration", id)]);
      setRecord(detail);
      setHistory(hist);
      setError(null);
    } catch (err) {
      setError(err.message);
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return { record, history, loading, error, reload: load, setRecord };
}

export { fetchStatusHistory };
