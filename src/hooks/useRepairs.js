import { useCallback, useEffect, useRef, useState } from "react";
import {
  assignRepairOrder,
  createRepairOrder,
  deleteRepairOrder,
  fetchRepairBoard,
  fetchRepairOrderById,
  fetchRepairOrders,
  updateRepairOrder,
  updateRepairStatus,
} from "@/lib/api/repairs";
import { fetchStatusHistory } from "@/lib/api/registrations";

/** Daftar tiket mode tabel (dengan sort/filter/paginasi). */
export function useRepairOrders(filters = {}) {
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
      const result = await fetchRepairOrders(filters);
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

  return { rows, total, loading, error, reload: load };
}

/** Seluruh tiket untuk papan Kanban (kolom per tahapan workflow). */
export function useRepairBoard(filters = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const key = JSON.stringify(filters);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRepairBoard(filters);
      setRows(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  const mutate = useCallback(
    async (fn) => {
      const result = await fn();
      await load();
      return result;
    },
    [load]
  );

  return {
    rows,
    loading,
    error,
    reload: load,
    create: (values, ctx) => mutate(() => createRepairOrder(values, ctx)),
    changeStatus: (order, nextStatus, note, ctx) => mutate(() => updateRepairStatus(order, nextStatus, note, ctx)),
    assign: (order, assignee, ctx) => mutate(() => assignRepairOrder(order, assignee, ctx)),
    update: (id, patch, ctx) => mutate(() => updateRepairOrder(id, patch, ctx)),
    remove: (order, ctx) => mutate(() => deleteRepairOrder(order, ctx)),
  };
}

/** Detail satu tiket + riwayat status. */
export function useRepairDetail(id) {
  const [record, setRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [detail, hist] = await Promise.all([fetchRepairOrderById(id), fetchStatusHistory("repair", id)]);
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

  return { record, history, loading, error, reload: load };
}
