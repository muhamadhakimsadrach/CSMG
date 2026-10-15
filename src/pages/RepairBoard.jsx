import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Filter,
  GripVertical,
  KanbanSquare,
  LayoutGrid,
  MapPin,
  RotateCcw,
  Search,
  Table2,
  Trash2,
  UserCog,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card, CardBody, PageHeader } from "@/components/common/Card";
import { PriorityBadge, SlaBadge, StatusBadge } from "@/components/common/Badge";
import { Field, Select } from "@/components/common/Field";
import { EmptyState, ErrorState, LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Modal } from "@/components/common/Modal";
import { Reveal, useNow } from "@/components/common/Reveal";
import { Pagination, Table } from "@/components/common/Table";
import { RepairCompletionForm } from "@/components/forms/RepairCompletionForm";
import { RepairForm } from "@/components/forms/RepairForm";
import { useAuth } from "@/context/AuthContext";
import { useConfirm, useToast } from "@/context/ToastContext";
import { useWorkflow } from "@/context/WorkflowContext";
import { useRepairBoard, useRepairOrders } from "@/hooks/useRepairs";
import { PRIORITY_META, formatDateTime, timeAgo } from "@/lib/utils";
import { cn } from "@/utils/cn";

const PER_PAGE = 10;
const PRIORITIES = ["Urgent", "High", "Medium", "Low"];

/**
 * MODUL B - Gangguan & Perbaikan Air dengan tampilan ganda
 * (Kanban drag & drop + tabel ringkas), penugasan teknisi, dan SLA timer.
 */
export function RepairBoardPage() {
  const { can, isAdmin, userId, profiles, roles } = useAuth();
  const toast = useToast();
  const confirmAction = useConfirm();
  const { statusesFor, statusOf, canMoveTo, initialStatus } = useWorkflow();
  const [view, setView] = useState(() => (window.innerWidth < 768 ? "board" : "board"));
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");
  const [sort, setSort] = useState({ column: "created_at", dir: "desc" });
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [moveMenu, setMoveMenu] = useState(null);

  const now = useNow(20000);
  const canRead = can("repair", "read") || isAdmin;
  const canCreate = can("repair", "create") || isAdmin;
  const canUpdate = can("repair", "update") || isAdmin;
  const statuses = statusesFor("REPAIR");

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [search]);

  const board = useRepairBoard({ search: debouncedSearch, priority });
  const table = useRepairOrders({ search: debouncedSearch, priority, assignedTo: assignee, sort: sort.column, dir: sort.dir, page, perPage: PER_PAGE });
  const rows = view === "board" ? board.rows : table.rows;
  const loading = view === "board" ? board.loading : table.loading;
  const error = view === "board" ? board.error : table.error;
  const reload = view === "board" ? board.reload : table.reload;

  const people = useMemo(() => (profiles ?? []).filter((person) => person.is_active !== false && /teknik/i.test(roles.find((role) => role.id === person.role_id)?.role_name ?? "")), [profiles, roles]);
  const personById = useCallback((id) => people.find((p) => String(p.id) === String(id)) ?? null, [people]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
    if (params.get("new") === "1" && canCreate) {
      setCreateOpen(true);
      window.location.hash = "/repairs";
    } else if (params.get("ticket")) {
      const found = board.rows.find((r) => String(r.id) === params.get("ticket"));
      if (found) {
        setDetail(found);
        window.location.hash = "/repairs";
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canCreate, board.loading]);

  const grouped = useMemo(() => {
    const map = new Map(statuses.map((s) => [String(s.id), []]));
    const unassigned = [];
    (board.rows ?? []).forEach((order) => {
      const key = String(order.current_status_id ?? "");
      if (map.has(key)) map.get(key).push(order);
      else unassigned.push(order);
    });
    return { map, unassigned };
  }, [board.rows, statuses]);

  const moveTicket = useCallback(
    async (order, targetStatus, note) => {
      if (!canUpdate) {
        toast.warning("Peran Anda tidak memiliki izin mengubah tiket gangguan.");
        return;
      }
      if (!canMoveTo(targetStatus)) {
        toast.error(`Status "${targetStatus.status_name}" hanya dapat diisi oleh peran tertentu.`, { title: "Perpindahan Ditolak" });
        return;
      }
      try {
        if (targetStatus.is_final) {
          setDetail(order);
          setMoveMenu(null);
          toast.info("Selesaikan tiket dengan formulir penyelesaian untuk melengkapi bukti & material.");
          return;
        }
        await board.changeStatus(order, targetStatus, note ?? `Tiket dipindahkan ke "${targetStatus.status_name}" melalui papan kerja.`, {
          userId,
        });
        toast.success(`${order.ticket_number} → ${targetStatus.status_name}`, { title: "Status Diperbarui" });
      } catch (err) {
        toast.error(err.message ?? "Gagal memperbarui tiket.", { title: "Perubahan Gagal" });
      }
    },
    [board, canMoveTo, canUpdate, toast, userId]
  );

  const handleDrop = useCallback(
    async (statusId) => {
      setDragOver(null);
      const order = board.rows.find((r) => String(r.id) === String(dragId));
      setDragId(null);
      if (!order) return;
      const target = statuses.find((s) => String(s.id) === String(statusId));
      if (!target || String(target.id) === String(order.current_status_id)) return;
      await moveTicket(order, target);
    },
    [board.rows, dragId, moveTicket, statuses]
  );

  if (!canRead) {
    return (
      <Card>
        <EmptyState
          icon={Wrench}
          title="Akses Papan Repair Dibatasi"
          description="Peran Anda tidak memiliki izin baca pada modul perbaikan air. Mintalah Admin Pusat menyesuaikan matriks izin."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Layanan Air Tangerang"
        title="Gangguan & Perbaikan Air"
        description="Tindak lanjuti kebocoran pipa, gangguan meter, tekanan, dan kualitas air dengan penugasan tim teknis."
        actions={
          <>
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
              {[
                { key: "board", label: "Kanban", icon: LayoutGrid },
                { key: "table", label: "Tabel", icon: Table2 },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setView(opt.key)}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-semibold transition-all",
                    view === opt.key ? "bg-ink-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <opt.icon className="h-4 w-4" aria-hidden />
                  {opt.label}
                </button>
              ))}
            </div>
            {canCreate ? (
              <Button icon={Wrench} onClick={() => setCreateOpen(true)}>
                Tiket Baru
              </Button>
            ) : null}
          </>
        }
      />

      <Reveal>
        <Card>
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari judul, tiket, atau lokasi…"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[13px] transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="hidden items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:inline-flex">
                  <Filter className="h-3.5 w-3.5" aria-hidden /> Prioritas
                </span>
                <button
                  type="button"
                  onClick={() => setPriority("")}
                  className={cn(
                    "h-8 rounded-lg px-2.5 text-[12px] font-semibold transition-colors",
                    priority === "" ? "bg-ink-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  )}
                >
                  Semua
                </button>
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority((prev) => (prev === p ? "" : p))}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold transition-all",
                      priority === p ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-300" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_META[p].dot)} />
                    {PRIORITY_META[p].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {view === "table" ? (
                <div className="w-44">
                  <Select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="h-9 text-[12.5px]">
                    <option value="">Seluruh teknisi</option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}
              {priority || search || assignee ? (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={RotateCcw}
                  onClick={() => {
                    setPriority("");
                    setSearch("");
                    setAssignee("");
                  }}
                >
                  Bersihkan
                </Button>
              ) : null}
              <span className="rounded-md bg-slate-100 px-2 py-1 text-[11.5px] font-semibold text-slate-500">
                {view === "board" ? `${board.rows.length} tiket` : `${table.total} tiket`}
              </span>
            </div>
          </div>

          {loading && !rows.length ? (
            <LoadingSpinner label="Memuat papan kerja…" className="py-16" />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : view === "board" ? (
            <div className="no-scrollbar overflow-x-auto p-4">
              <div className="flex min-w-max gap-3">
                {statuses.map((status) => {
                  const items = grouped.map.get(String(status.id)) ?? [];
                  const overdue = items.filter((o) => !o.resolved_at && o.due_at && new Date(o.due_at).getTime() < now).length;
                  return (
                    <section
                      key={status.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(String(status.id));
                      }}
                      onDragLeave={() => setDragOver((prev) => (prev === String(status.id) ? null : prev))}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDrop(status.id);
                      }}
                      className={cn(
                        "flex w-[286px] shrink-0 flex-col rounded-xl border bg-slate-50/70 transition-all duration-200",
                        dragOver === String(status.id) && canUpdate ? "border-brand-400 bg-brand-50/60 ring-2 ring-brand-500/25" : "border-slate-200"
                      )}
                    >
                      <header className="flex items-center gap-2 border-b border-slate-200/70 px-3 py-2.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color_code }} aria-hidden />
                        <h3 className="min-w-0 flex-1 truncate font-display text-[13px] font-semibold tracking-tight text-slate-800">{status.status_name}</h3>
                        <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
                          {items.length}
                        </span>
                        {overdue > 0 ? (
                          <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10.5px] font-bold text-rose-600">{overdue} telat</span>
                        ) : null}
                      </header>
                      <div className="flex flex-col gap-2 p-2.5">
                        {items.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-[11.5px] text-slate-400">
                            Letakkan tiket di sini
                          </p>
                        ) : (
                          items.map((order) => (
                            <article
                              key={order.id}
                              draggable={canUpdate}
                              onDragStart={() => setDragId(order.id)}
                              onDragEnd={() => {
                                setDragId(null);
                                setDragOver(null);
                              }}
                              onClick={() => setDetail(order)}
                              className={cn(
                                "group cursor-pointer rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
                                dragId === String(order.id) && "opacity-40 ring-2 ring-brand-500/40"
                              )}
                            >
                              <div className="flex items-start gap-2">
                                {canUpdate ? (
                                  <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                                ) : null}
                                <div className="min-w-0 flex-1">
                                  <p className="font-mono text-[11px] font-semibold text-brand-700">{order.ticket_number}</p>
                                  <h4 className="mt-1 line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900">{order.title}</h4>
                                </div>
                              </div>
                              <p className="mt-2 flex items-center gap-1 truncate text-[11.5px] text-slate-500">
                                <MapPin className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
                                {order.location_address}
                              </p>
                              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                <PriorityBadge priority={order.priority} size="sm" />
                                <SlaBadge order={order} />
                              </div>
                              <footer className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                                <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-slate-500">
                                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-slate-100 text-[9px] font-bold text-slate-600">
                                    {(personById(order.assigned_to)?.full_name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                                  </span>
                                  <span className="truncate">{personById(order.assigned_to)?.full_name ?? "Belum ditugaskan"}</span>
                                </span>
                                <div className="relative">
                                  <button
                                    type="button"
                                    disabled={!canUpdate}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMoveMenu(moveMenu === order.id ? null : order.id);
                                    }}
                                    className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-600"
                                  >
                                    Ubah <ChevronDown className="h-3 w-3" aria-hidden />
                                  </button>
                                  {moveMenu === order.id ? (
                                    <div
                                      className="absolute right-0 top-6 z-20 w-56 animate-fade-up overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <p className="px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Pindahkan ke</p>
                                      {statuses.map((s) => {
                                        const allowed = canUpdate && canMoveTo(s) && String(s.id) !== String(order.current_status_id);
                                        return (
                                          <button
                                            key={s.id}
                                            type="button"
                                            disabled={!allowed}
                                            onClick={() => {
                                              setMoveMenu(null);
                                              moveTicket(order, s);
                                            }}
                                            className={cn(
                                              "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] transition-colors",
                                              allowed ? "text-slate-700 hover:bg-slate-50" : "cursor-not-allowed text-slate-300"
                                            )}
                                          >
                                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color_code }} />
                                            {s.status_name}
                                            {String(s.id) === String(order.current_status_id) ? <span className="ml-auto text-[10px]">aktif</span> : null}
                                            {!canMoveTo(s) && String(s.id) !== String(order.current_status_id) ? (
                                              <span className="ml-auto text-[10px] text-slate-400">terkunci</span>
                                            ) : null}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : null}
                                </div>
                              </footer>
                            </article>
                          ))
                        )}
                      </div>
                    </section>
                  );
                })}
                {grouped.unassigned.length > 0 ? (
                  <section className="flex w-[286px] shrink-0 flex-col rounded-xl border border-dashed border-slate-300 bg-white/60">
                    <header className="px-3 py-2.5 text-[12px] font-semibold text-slate-500">Tanpa Tahapan ({grouped.unassigned.length})</header>
                    <div className="flex flex-col gap-2 p-2.5">
                      {grouped.unassigned.map((order) => (
                        <button key={order.id} type="button" onClick={() => setDetail(order)} className="rounded-lg border border-slate-200 bg-white p-3 text-left text-[12.5px] hover:bg-slate-50">
                          <p className="font-mono text-[11px] text-brand-700">{order.ticket_number}</p>
                          <p className="mt-1 line-clamp-2 font-semibold text-slate-800">{order.title}</p>
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
          ) : (
            <RepairTable
              rows={table.rows}
              loading={table.loading}
              sort={sort}
              setSort={setSort}
              total={table.total}
              page={page}
              setPage={setPage}
              statuses={statuses}
              statusOf={statusOf}
              people={people}
              onOpen={setDetail}
            />
          )}
        </Card>
      </Reveal>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Pengajuan Tiket Perbaikan Air"
        subtitle="Tiket baru masuk ke antrean papan kerja dan mulai menghitung batas SLA."
        icon={KanbanSquare}
        size="lg"
      >
        <RepairForm
          technicians={people}
          initialStatus={initialStatus("REPAIR")}
          onCancel={() => setCreateOpen(false)}
          onSubmit={async (values, onProgress) => {
            try {
              const created = await board.create(values, { userId, initialStatusId: initialStatus("REPAIR")?.id ?? null, onProgress });
              setCreateOpen(false);
              toast.success(`Tiket ${created.ticket_number} masuk ke papan kerja.`, { title: "Tiket Terbuat" });
            } catch (err) {
              toast.error(err.message ?? "Gagal membuat tiket.", { title: "Pembuatan Gagal" });
              throw err;
            }
          }}
        />
      </Modal>

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.title ?? ""} subtitle={detail?.ticket_number} icon={Wrench} size="lg">
        {detail ? (
          <RepairDetail
            order={detail}
            statuses={statuses}
            statusOf={statusOf}
            people={people}
            canUpdate={canUpdate}
            canAssign={canUpdate}
            canMoveTo={canMoveTo}
            canDelete={can("repair", "delete") || isAdmin}
            onDelete={async () => {
              if (!(await confirmAction({ title: "Hapus tiket gangguan", message: `Tiket ${detail.ticket_number} dan riwayatnya akan dihapus permanen.`, confirmLabel: "Hapus tiket" }))) return;
              try {
                await board.remove(detail, { userId });
                setDetail(null);
                await table.reload();
                toast.success("Tiket gangguan berhasil dihapus.");
              } catch (error) {
                toast.error(error.message || "Tiket belum dapat dihapus.");
              }
            }}
            onClose={() => setDetail(null)}
            onDone={async () => {
              setDetail(null);
              await board.reload();
              await table.reload();
            }}
            board={board}
            userId={userId}
            toast={toast}
          />
        ) : null}
      </Modal>
    </div>
  );
}

function RepairTable({ rows, loading, sort, setSort, total, page, setPage, statuses, statusOf, people, onOpen }) {
  const personName = (id) => people.find((p) => String(p.id) === String(id))?.full_name ?? "Belum ditugaskan";
  const columns = [
    { key: "ticket_number", header: "No. Tiket", sortable: true, render: (r) => <span className="font-mono text-[12.5px] font-semibold text-brand-700">{r.ticket_number}</span> },
    {
      key: "title",
      header: "Masalah",
      sortable: true,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-slate-800">{r.title}</p>
          <p className="truncate text-[11.5px] text-slate-400">
            {r.service_category} · {r.location_address}
          </p>
        </div>
      ),
    },
    { key: "priority", header: "Prioritas", sortable: true, render: (r) => <PriorityBadge size="sm" priority={r.priority} /> },
    { key: "current_status_id", header: "Tahapan", render: (r) => <StatusBadge size="sm" status={statusOf(r.current_status_id)} /> },
    { key: "assigned_to", header: "Teknisi", render: (r) => <span className="text-[12.5px] text-slate-600">{personName(r.assigned_to)}</span> },
    { key: "due_at", header: "SLA", sortable: true, render: (r) => <SlaBadge order={r} /> },
    { key: "updated_at", header: "Diperbarui", sortable: true, align: "right", render: (r) => <span className="whitespace-nowrap text-[12px] text-slate-500">{timeAgo(r.updated_at)}</span> },
  ];
  return (
    <>
      <Table
        columns={columns}
        rows={rows.filter((r) => r)}
        loading={loading}
        sort={sort}
        onSortChange={setSort}
        onRowClick={onOpen}
        emptyState={<EmptyState icon={KanbanSquare} title="Tidak ada tiket pada filter ini" description="Ubah tingkat prioritas atau kata kunci pencarian Anda." />}
        rowCard={(r) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="font-mono text-[11.5px] font-semibold text-brand-700">{r.ticket_number}</p>
              <PriorityBadge size="sm" priority={r.priority} />
            </div>
            <p className="text-[13.5px] font-semibold text-slate-900">{r.title}</p>
            <p className="text-[12px] text-slate-500">{r.location_address}</p>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <StatusBadge size="sm" status={statuses.find((s) => String(s.id) === String(r.current_status_id))} />
              <SlaBadge order={r} />
            </div>
            <p className="text-[11.5px] text-slate-400">{personName(r.assigned_to)}</p>
          </div>
        )}
      />
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} total={total} perPage={PER_PAGE} onPageChange={setPage} />
    </>
  );
}

/** Isi modal detail tiket: ringkasan, penugasan, penutupan tiket. */
function RepairDetail({ order, statuses, statusOf, people, canUpdate, canAssign, canMoveTo, canDelete, onDelete, onClose, onDone, board, userId, toast }) {
  const [tab, setTab] = useState("ringkasan");
  const current = statusOf(order.current_status_id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-50 p-1">
        {[
          { key: "ringkasan", label: "Ringkasan Tiket" },
          { key: "penugasan", label: "Penugasan" },
          { key: "penyelesaian", label: "Penyelesaian" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "h-8 flex-1 rounded-md px-2 text-[12.5px] font-semibold transition-all",
              tab === t.key ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {canDelete && tab === "ringkasan" && <div className="flex justify-end"><Button type="button" size="xs" variant="ghost" icon={Trash2} className="text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={onDelete}>Hapus tiket</Button></div>}
      {tab === "ringkasan" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={current} />
            <PriorityBadge priority={order.priority} />
            <SlaBadge order={order} />
            <span className="ml-auto text-[11.5px] text-slate-400">Dibuat {formatDateTime(order.created_at)}</span>
          </div>
          <p className="text-[13px] leading-relaxed text-slate-600">{order.description || "Tidak ada uraian kerusakan."}</p>
          <dl className="grid gap-x-6 gap-y-3 border-t border-slate-100 pt-4 text-[13px] sm:grid-cols-2">
            <Row label="Lokasi" value={order.location_address} />
            <Row label="Nomor pelanggan" value={order.customer_number || "Gangguan jaringan umum"} />
            <Row label="Kategori" value={order.service_category} />
            <Row label="Teknisi" value={people.find((p) => String(p.id) === String(order.assigned_to))?.full_name ?? "Belum ditugaskan"} />
            <Row label="Divisi" value={order.assigned_division ?? "—"} />
            <Row label="Jatuh Tempo SLA" value={formatDateTime(order.due_at)} mono />
            <Row label="Selesai Pada" value={order.resolved_at ? formatDateTime(order.resolved_at) : "Belum diselesaikan"} mono />
          </dl>
          {order.proof_image_url ? (
            <figure className="overflow-hidden rounded-xl border border-slate-200">
              <img src={order.proof_image_url} alt="Bukti perbaikan" className="max-h-64 w-full object-cover" />
              <figcaption className="px-3 py-2 text-[11.5px] font-semibold text-slate-500">Bukti foto perbaikan selesai</figcaption>
            </figure>
          ) : null}
          {order.technician_notes ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Catatan Teknisi</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-slate-700">{order.technician_notes}</p>
            </div>
          ) : null}
          {Array.isArray(order.materials_used) && order.materials_used.length ? (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-[12.5px]">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Material</th>
                    <th className="px-3 py-2 text-right font-semibold">Qty</th>
                    <th className="px-3 py-2 text-left font-semibold">Satuan</th>
                  </tr>
                </thead>
                <tbody>
                  {order.materials_used.map((m, i) => (
                    <tr key={`${m.name}-${i}`} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 text-slate-700">{m.name}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-slate-700">{m.qty}</td>
                      <td className="px-3 py-1.5 text-slate-500">{m.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "penugasan" ? (
        <AssignTab order={order} people={people} canAssign={canAssign} board={board} userId={userId} toast={toast} onClose={onClose} onDone={onDone} />
      ) : null}

      {tab === "penyelesaian" ? (
        canUpdate ? (
          <RepairCompletionForm
            order={order}
            statuses={statuses.filter((status) => canMoveTo(status))}
            currentStatusId={order.current_status_id}
            onCancel={onClose}
            onSubmit={async (payload) => {
              const target = statuses.find((s) => String(s.id) === String(payload.statusId));
              if (!target || !canMoveTo(target)) throw new Error("Peran Anda tidak boleh memindahkan tiket ke status tersebut.");
              await board.changeStatus(order, target, payload.note, {
                userId,
                proofFile: payload.proofFile,
                materials: payload.materials,
                technicianNotes: payload.technicianNotes,
              });
              toast.success(`Tiket ${order.ticket_number} diperbarui ke "${target.status_name}".`, { title: "Tiket Diperbarui" });
              await onDone();
            }}
          />
        ) : (
          <CardBody>
            <EmptyState icon={UserCog} title="Tidak Ada Izin Penyelesaian" description="Peran Anda belum memiliki izin can_update pada modul perbaikan air." />
          </CardBody>
        )
      ) : null}
    </div>
  );
}

function AssignTab({ order, people, canAssign, board, userId, toast, onClose, onDone }) {
  const [picked, setPicked] = useState(order.assigned_to ?? "");
  const [busy, setBusy] = useState(false);
  const save = useCallback(async () => {
    setBusy(true);
    try {
      const person = people.find((p) => String(p.id) === String(picked)) ?? null;
      await board.assign(order, person, { userId });
      toast.success(person ? `Tiket ditugaskan kepada ${person.full_name}.` : "Penugasan teknisi dilepas.", { title: "Penugasan Tersimpan" });
      await onDone();
      onClose();
    } catch (err) {
      toast.error(err.message ?? "Gagal menugaskan teknisi.", { title: "Penugasan Gagal" });
    } finally {
      setBusy(false);
    }
  }, [board, onClose, onDone, order, people, picked, toast, userId]);

  return (
    <div className="space-y-4">
      <p className="text-[12.5px] leading-relaxed text-slate-500">
        Penugasan menentukan pemilik pekerjaan di papan kerja sekaligus penerima notifikasi. Catatan penugasan otomatis tercatat
        pada log audit.
      </p>
      <Field label="Teknisi / Pelaksana">
        <Select value={picked} onChange={(e) => setPicked(e.target.value)}>
          <option value="">— Belum ditugaskan —</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name} {p.department ? `· ${p.department}` : ""}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        {people.slice(0, 4).map((p) => {
          const active = String(picked) === String(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPicked(p.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all",
                active ? "border-brand-400 bg-brand-50/60 shadow-sm" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-800 text-[11px] font-bold text-white">
                {p.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-semibold text-slate-800">{p.full_name}</span>
                <span className="block truncate text-[11px] text-slate-500">{p.department ?? "Unit operasional"}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="secondary" onClick={onClose}>
          Batal
        </Button>
        <Button loading={busy} disabled={!canAssign} onClick={save}>
          Simpan Penugasan
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</dt>
      <dd className={cn("mt-0.5 font-semibold text-slate-800", mono && "font-mono text-[12.5px]")}>{value || "—"}</dd>
    </div>
  );
}

export default RepairBoardPage;
