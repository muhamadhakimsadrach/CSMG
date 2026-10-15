import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Download, History } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card, PageHeader } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { SearchInput, Select } from "@/components/common/Field";
import { EmptyState, ErrorState } from "@/components/common/LoadingSpinner";
import { Reveal } from "@/components/common/Reveal";
import { Pagination, Table } from "@/components/common/Table";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { parseError, supabase } from "@/lib/supabaseClient";
import { formatDateTime, timeAgo, toInputDate } from "@/lib/utils";
import { cn } from "@/utils/cn";

const PER_PAGE = 12;
const ENTITY_LABELS = {
  pendaftaran: "Pendaftaran",
  repair: "Perbaikan Air",
  pengguna: "Pengguna",
  workflow: "Alur Kerja",
  pengaturan: "Pengaturan",
};

const ACTION_TONES = {
  membuat: "success",
  memperbarui: "brand",
  memperbaharui: "brand",
  mengubah: "brand",
  menghapus: "danger",
  mencabut: "danger",
  menugaskan: "info",
  menyelesaikan: "success",
  memindahkan: "info",
  menyesuaikan: "warning",
};

/**
 * Audit Log Stream - daftar lengkap perubahan data lintas modul
 * dengan filter entitas, pencarian, dan ekspor CSV.
 */
export function ActivityLogPage() {
  const { can, isAdmin, profiles } = useAuth();
  const toast = useToast();
  const allowed = can("log_aktivitas", "read") || isAdmin;
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("");
  const [actor, setActor] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: qErr } = await supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(400);
      if (qErr) throw new Error(parseError(qErr, "Gagal memuat log aktivitas."));
      setLogs(data ?? []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  const peopleMap = useMemo(() => new Map((profiles ?? []).map((p) => [String(p.id), p.full_name])), [profiles]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (entity && log.entity_name !== entity) return false;
      if (actor && String(log.user_id) !== String(actor)) return false;
      if (!term) return true;
      const details = JSON.stringify(log.details ?? {}).toLowerCase();
      return [log.action, log.entity_name, peopleMap.get(String(log.user_id)) ?? "", details].join(" ").toLowerCase().includes(term);
    });
  }, [actor, entity, logs, peopleMap, search]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const rows = useMemo(() => filtered.slice((Math.min(page, pages) - 1) * PER_PAGE, Math.min(page, pages) * PER_PAGE), [filtered, page, pages]);

  const exportCsv = useCallback(() => {
    if (!filtered.length) {
      toast.warning("Tidak ada baris log untuk diekspor.");
      return;
    }
    const header = ["Waktu", "Pelaku", "Aksi", "Entitas", "Detail"];
    const lines = filtered.map((log) =>
      [
        formatDateTime(log.created_at),
        peopleMap.get(String(log.user_id)) ?? "Sistem",
        log.action,
        ENTITY_LABELS[log.entity_name] ?? log.entity_name,
        JSON.stringify(log.details ?? {}),
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `log-aktivitas-${toInputDate(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} baris log diekspor.`);
  }, [filtered, peopleMap, toast]);

  const columns = [
    {
      key: "created_at",
      header: "Waktu",
      render: (log) => (
        <div className="whitespace-nowrap">
          <p className="text-[12.5px] font-semibold text-slate-700">{timeAgo(log.created_at)}</p>
          <p className="text-[11px] text-slate-400">{formatDateTime(log.created_at)}</p>
        </div>
      ),
    },
    {
      key: "user_id",
      header: "Pelaku",
      render: (log) => (
        <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-slate-700">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-600">
            {(peopleMap.get(String(log.user_id)) ?? "SY").slice(0, 2).toUpperCase()}
          </span>
          {peopleMap.get(String(log.user_id)) ?? "Sistem / Pemicu DB"}
        </span>
      ),
    },
    {
      key: "action",
      header: "Aksi",
      render: (log) => {
        const tone = ACTION_TONES[String(log.action).split(" ")[0]?.toLowerCase()] ?? "neutral";
        return (
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={tone}>{String(log.action)}</Badge>
            <span className="text-[12px] text-slate-500">{ENTITY_LABELS[log.entity_name] ?? log.entity_name}</span>
          </div>
        );
      },
    },
    {
      key: "details",
      header: "Rincian",
      render: (log) => {
        const d = log.details ?? {};
        const entries = Object.entries(d).filter(([, v]) => typeof v !== "object" || v === null);
        if (!entries.length) return <span className="text-[12px] text-slate-400">—</span>;
        return (
          <div className="flex flex-wrap gap-1.5">
            {entries.slice(0, 4).map(([k, v]) => (
              <span key={k} className={cn("rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600")}>
                <span className="text-slate-400">{k}:</span> <span className="font-semibold">{String(v)}</span>
              </span>
            ))}
          </div>
        );
      },
    },
  ];

  if (!allowed) {
    return (
      <Card>
        <EmptyState icon={History} title="Log Aktivitas Tidak Terbuka" description="Peran Anda tidak memiliki izin baca pada modul log aktivitas." />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Audit Trail"
        title="Log Aktivitas Sistem"
        description="Setiap perubahan data pendaftaran, penugasan repair, dan tindakan administrasi tercatat di sini secara transparan."
        actions={
          <Button variant="secondary" icon={Download} onClick={exportCsv}>
            Ekspor CSV
          </Button>
        }
      />

      <Reveal>
        <Card>
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              <div className="sm:max-w-xs sm:flex-1">
                <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari aksi, tiket, atau pelaku…" />
              </div>
              <Select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} className="h-10 sm:w-44">
                <option value="">Seluruh entitas</option>
                {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
              <Select value={actor} onChange={(e) => { setActor(e.target.value); setPage(1); }} className="h-10 sm:w-48">
                <option value="">Seluruh pelaku</option>
                {(profiles ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </Select>
            </div>
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500">
              <Activity className="h-4 w-4 text-slate-400" aria-hidden />
              {filtered.length} catatan
            </p>
          </div>

          <Table
            columns={columns}
            rows={rows}
            loading={loading}
            keyField="id"
            emptyState={
              error ? (
                <ErrorState message={error} onRetry={load} />
              ) : (
                <EmptyState icon={History} title="Belum ada aktivitas" description="Aktivitas akan muncul begitu ada perubahan data pada sistem." />
              )
            }
            rowCard={(log) => (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-slate-800">{peopleMap.get(String(log.user_id)) ?? "Sistem"}</span>
                  <span className="text-[11px] text-slate-400">{timeAgo(log.created_at)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={ACTION_TONES[String(log.action).split(" ")[0]?.toLowerCase()] ?? "neutral"}>{log.action}</Badge>
                  <span className="text-[11.5px] text-slate-500">{ENTITY_LABELS[log.entity_name] ?? log.entity_name}</span>
                </div>
                {log.details?.ticket_number ? <p className="font-mono text-[11.5px] text-brand-700">{log.details.ticket_number}</p> : null}
              </div>
            )}
          />
          <Pagination page={Math.min(page, pages)} pages={pages} total={filtered.length} perPage={PER_PAGE} onPageChange={setPage} />
        </Card>
      </Reveal>
    </div>
  );
}

export default ActivityLogPage;
