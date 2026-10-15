import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, ClipboardList, Eye, FileText, PlusCircle, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card, PageHeader } from "@/components/common/Card";
import { StatusBadge } from "@/components/common/Badge";
import { Field, Input, SearchInput, Select } from "@/components/common/Field";
import { EmptyState, ErrorState } from "@/components/common/LoadingSpinner";
import { Modal } from "@/components/common/Modal";
import { Reveal } from "@/components/common/Reveal";
import { Pagination, Table } from "@/components/common/Table";
import { RegistrationForm } from "@/components/forms/RegistrationForm";
import { useAuth } from "@/context/AuthContext";
import { useConfirm, useToast } from "@/context/ToastContext";
import { useWorkflow } from "@/context/WorkflowContext";
import { useRegistrations } from "@/hooks/useRegistrations";
import { buildTicketNumber, formatDate, toInputDate } from "@/lib/utils";
import { cn } from "@/utils/cn";
import { useRoute } from "@/lib/router";

const PER_PAGE = 8;

/**
 * MODUL A - Registrasi Pelanggan Baru: daftar, filter, penelusuran,
 * dan entri berkas multi-langkah.
 */
export function RegistrationsPage() {
  const { can, isAdmin, userId, profile, profiles } = useAuth();
  const toast = useToast();
  const confirmAction = useConfirm();
  const { statusesFor, initialStatus } = useWorkflow();
  const canRead = can("pendaftaran", "read") || isAdmin;
  const canCreate = can("pendaftaran", "create") || isAdmin;
  const canDelete = can("pendaftaran", "delete") || isAdmin;
  const { query } = useRoute();

  const [filters, setFilters] = useState({ search: query.search ?? "", statusId: "", dateFrom: query.dateFrom ?? "", dateTo: query.dateTo ?? "" });
  const [debounced, setDebounced] = useState(filters);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    setFilters((previous) => ({ ...previous, search: query.search ?? "", dateFrom: query.dateFrom ?? "", dateTo: query.dateTo ?? "" }));
  }, [query.search, query.dateFrom, query.dateTo]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebounced(filters);
      setPage(1);
    }, 280);
    return () => window.clearTimeout(id);
  }, [filters]);

  const statuses = statusesFor("REGISTRATION");
  const statusIds = query.stage ? statuses.filter((status) => query.stage === "active" ? /aktif|disetujui/i.test(status.status_name) : /terima|verifikasi/i.test(status.status_name)).map((status) => status.id) : [];
  const { rows, total, loading, error, reload, create, remove } = useRegistrations({ ...debounced, statusIds, page, perPage: PER_PAGE });
  const peopleMap = useMemo(() => new Map((profiles ?? []).map((p) => [String(p.id), p.full_name])), [profiles]);

  const activeFilters = Boolean(filters.search || filters.statusId || filters.dateFrom || filters.dateTo);

  const openCreateFromQuery = useCallback(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
    if (params.get("new") === "1" && canCreate) {
      setCreateOpen(true);
      window.location.hash = "/registrations";
    }
  }, [canCreate]);

  useEffect(() => {
    openCreateFromQuery();
    const onHash = () => openCreateFromQuery();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [openCreateFromQuery]);

  const handleSubmit = useCallback(
    async (values, onProgress) => {
      const start = initialStatus("REGISTRATION");
      try {
        const created = await create(values, { userId, initialStatusId: start?.id ?? null, onProgress });
        setCreateOpen(false);
        toast.success(`Pendaftaran tersimpan dengan nomor tiket ${created.ticket_number}.`, { title: "Berkas Terkirim" });
      } catch (err) {
        toast.error(err.message ?? "Gagal menyimpan pendaftaran.", { title: "Penyimpanan Gagal" });
        throw err;
      }
    },
    [create, initialStatus, toast, userId]
  );

  const handleDelete = useCallback(
    async (row) => {
      const ok = await confirmAction({
        title: "Hapus Berkas Pendaftaran",
        message: `Tindakan ini menghapus permanen pendaftaran ${row.customer_name} (${row.ticket_number}) beserta riwayat statusnya.`,
        confirmLabel: "Ya, Hapus",
      });
      if (!ok) return;
      try {
        await remove(row, { userId });
        toast.success(`Pendaftaran ${row.ticket_number} berhasil dihapus.`, { title: "Terhapus" });
      } catch (err) {
        toast.error(err.message ?? "Gagal menghapus berkas pendaftaran.", { title: "Gagal Menghapus" });
      }
    },
    [confirmAction, remove, toast, userId]
  );

  const columns = useMemo(
    () => [
      {
        key: "ticket_number",
        header: "No. Tiket",
        sortable: false,
        render: (row) => <span className="font-mono text-[12.5px] font-semibold text-brand-700">{row.ticket_number}</span>,
      },
      {
        key: "customer_name",
        header: "Pemohon",
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-slate-800">{row.customer_name}</p>
            <p className="truncate text-[11.5px] text-slate-400">
              {row.service_type ?? "Pasang Baru"} · NIK {row.identity_number}
            </p>
          </div>
        ),
      },
      {
        key: "city",
        header: "Wilayah Pasang",
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate text-[13px] text-slate-700">{row.city || "—"}</p>
            <p className="truncate text-[11.5px] text-slate-400">{row.province}</p>
          </div>
        ),
      },
      {
        key: "current_status_id",
        header: "Status",
        render: (row) => <StatusBadge status={statuses.find((s) => String(s.id) === String(row.current_status_id))} />,
      },
      {
        key: "created_by",
        header: "Petugas",
        render: (row) => <span className="text-[12.5px] text-slate-600">{peopleMap.get(String(row.created_by)) ?? "—"}</span>,
      },
      {
        key: "created_at",
        header: "Tanggal",
        align: "right",
        render: (row) => <span className="whitespace-nowrap text-[12.5px] text-slate-500">{formatDate(row.created_at)}</span>,
      },
      {
        key: "actions",
        header: "Aksi",
        align: "right",
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button size="xs" variant="ghost" icon={Eye} onClick={(e) => { e.stopPropagation(); window.location.hash = `/registrations/${row.id}`; }}>
              Detail
            </Button>
            <Button size="xs" variant="ghost" icon={FileText} onClick={(e) => { e.stopPropagation(); setPreview(row); }}>
              Bukti
            </Button>
            {canDelete ? (
              <Button
                size="xs"
                variant="ghost"
                icon={Trash2}
                className="text-rose-600 hover:bg-rose-50"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(row);
                }}
              >
                <span className="sr-only">Hapus</span>
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canDelete, handleDelete, peopleMap, statuses]
  );

  if (!canRead) {
    return (
      <Card className="p-0">
        <EmptyState
          icon={ClipboardList}
          title="Akses Modul Pendaftaran Dibatasi"
          description="Peran Anda tidak memiliki izin baca pada modul pendaftaran pelanggan. Hubungi Admin Pusat untuk penyesuaian matriks izin."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Modul A"
        title="Pendaftaran Sambungan Air"
        description="Kelola permohonan sambungan air Aetra Tangerang, dari verifikasi dokumen hingga pemasangan meter dan aktivasi."
        actions={
          canCreate ? (
            <Button icon={PlusCircle} onClick={() => setCreateOpen(true)}>
              Pendaftaran baru
            </Button>
          ) : (
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-500">
              Peran Anda hanya dapat membaca data
            </span>
          )
        }
      />

      <Reveal>
        <Card>
          {query.stage && <div className="flex items-center justify-between border-b border-slate-100 bg-brand-50/50 px-4 py-2 text-xs text-brand-600"><span>{query.stage === "active" ? "Menampilkan sambungan aktif" : "Menampilkan permohonan yang memerlukan verifikasi"}</span><button type="button" onClick={() => { window.location.hash = "/registrations"; }} className="font-medium underline">Tampilkan semua</button></div>}
          <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SearchInput value={filters.search} onChange={(v) => setFilters((p) => ({ ...p, search: v }))} placeholder="Cari nama atau nomor tiket…" />
              <Field label="Status Alur Kerja" className="[&>label]:sr-only">
                <Select value={filters.statusId} onChange={(e) => setFilters((p) => ({ ...p, statusId: e.target.value }))}>
                  <option value="">Seluruh status</option>
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.step_order}. {s.status_name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Dari Tanggal" className="[&>label]:sr-only">
                <div className="relative">
                  <CalendarRange className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))} className="pl-9" />
                </div>
              </Field>
              <Field label="Sampai Tanggal" className="[&>label]:sr-only">
                <Input type="date" value={filters.dateTo} onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))} />
              </Field>
            </div>
            <div className="flex items-center gap-2">
              {activeFilters ? (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={RotateCcw}
                  onClick={() => {
                    setFilters({ search: "", statusId: "", dateFrom: "", dateTo: "" });
                    setPage(1);
                  }}
                >
                  Bersihkan
                </Button>
              ) : null}
              <Button variant="secondary" size="sm" icon={Save} onClick={() => exportCsv(rows, peopleMap)}>
                Ekspor
              </Button>
            </div>
          </div>

          <Table
            columns={columns}
            rows={rows}
            loading={loading}
            sort={null}
            onRowClick={(row) => {
              window.location.hash = `/registrations/${row.id}`;
            }}
            emptyState={
              <EmptyState
                icon={ClipboardList}
                title="Tidak ada berkas yang cocok"
                description="Coba longgarkan filter tanggal, status, atau kata kunci pencarian Anda."
                action={
                  activeFilters ? (
                    <Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => setFilters({ search: "", statusId: "", dateFrom: "", dateTo: "" })}>
                      Bersihkan Filter
                    </Button>
                  ) : canCreate ? (
                    <Button size="sm" icon={PlusCircle} onClick={() => setCreateOpen(true)}>
                      Buat Pendaftaran Pertama
                    </Button>
                  ) : null
                }
              />
            }
            rowCard={(row) => {
              const status = statuses.find((s) => String(s.id) === String(row.current_status_id));
              return (
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-[11.5px] font-semibold text-brand-700">{row.ticket_number}</p>
                      <p className="mt-0.5 truncate text-[13.5px] font-semibold text-slate-900">{row.customer_name}</p>
                    </div>
                    <StatusBadge size="sm" status={status} />
                  </div>
                  <p className="text-[12px] text-slate-500">
                    {row.city} · {formatDate(row.created_at)}
                  </p>
                  <div className="flex gap-2 pt-0.5">
                    <Button size="xs" variant="secondary" icon={Eye} onClick={() => { window.location.hash = `/registrations/${row.id}`; }}>
                      Detail
                    </Button>
                    <Button size="xs" variant="ghost" icon={FileText} onClick={() => setPreview(row)}>
                      Bukti
                    </Button>
                  </div>
                </div>
              );
            }}
          />
          <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} total={total} perPage={PER_PAGE} onPageChange={setPage} />
        </Card>
      </Reveal>

      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Permohonan Sambungan Air Baru"
        subtitle="PT Aetra Air Tangerang. Siapkan KTP, KK, PBB terakhir, dan foto lokasi pemasangan."
        icon={PlusCircle}
        size="lg"
      >
        <RegistrationForm
          ticketPreview={buildTicketNumber("REG", rows.map((r) => r.ticket_number))}
          onCancel={() => setCreateOpen(false)}
          onSubmit={handleSubmit}
        />
      </Modal>

      <ProofPreviewModal record={preview} onClose={() => setPreview(null)} officerName={profile?.full_name} />
    </div>
  );
}

/** Ekspor cepat baris yang sedang tampil ke berkas CSV. */
function exportCsv(rows, peopleMap) {
  if (!rows.length) return;
  const header = ["No Tiket", "Nama Pemohon", "NIK", "Telepon", "Email", "Jenis Layanan", "Wilayah", "Alamat", "Status Petugas", "Tanggal"];
  const lines = rows.map((r) =>
    [r.ticket_number, r.customer_name, r.identity_number, r.phone_number, r.email ?? "", r.service_type ?? "", [r.city, r.province].filter(Boolean).join(" "), r.address, peopleMap.get(String(r.created_by)) ?? "", formatDate(r.created_at)]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",")
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pendaftaran-${toInputDate(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Pratinjau cepat bukti pendaftaran (dapat dicetak dari halaman detail). */
export function ProofPreviewModal({ record, onClose, officerName }) {
  return (
    <Modal open={Boolean(record)} onClose={onClose} title="Bukti Pendaftaran" subtitle={record?.ticket_number} icon={FileText} size="md">
      {record ? (
        <div className="space-y-4">
          <dl className="grid gap-y-2.5 text-[13px] sm:grid-cols-2 sm:gap-x-6">
            {[
              ["Nama Pemohon", record.customer_name],
              ["NIK / NPWP", record.identity_number],
              ["Kontak", record.phone_number],
              ["Email", record.email ?? "—"],
              ["Jenis Layanan", record.service_type ?? "—"],
              ["Titik Koordinat", record.latitude && record.longitude ? `${record.latitude}, ${record.longitude}` : "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3 border-b border-dashed border-slate-100 pb-1.5">
                <dt className="text-slate-400">{label}</dt>
                <dd className="text-right font-semibold text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[12px] leading-relaxed text-slate-500">
            Berkas akan diproses melalui tahapan verifikasi dokumen, penjadwalan survei, hingga keputusan kelayakan pasang. Simpan
            nomor tiket di atas untuk keperluan pelacakan.
          </p>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={onClose}>
              Tutup
            </Button>
            <Button onClick={() => { window.location.hash = `/registrations/${record.id}`; onClose(); }}> Buka Detail Lengkap</Button>
          </div>
          <p className={cn("text-right text-[11px] text-slate-400")}>Diverifikasi oleh {officerName ?? "Petugas Portal"}</p>
        </div>
      ) : null}
    </Modal>
  );
}

export default RegistrationsPage;
