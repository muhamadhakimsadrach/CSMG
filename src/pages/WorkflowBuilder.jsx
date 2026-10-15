import { useCallback, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, GitBranch, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card, CardBody, PageHeader } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { Checkbox, Field, Input } from "@/components/common/Field";
import { EmptyState } from "@/components/common/LoadingSpinner";
import { Modal } from "@/components/common/Modal";
import { Reveal } from "@/components/common/Reveal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ToastContext";
import { useWorkflow, WORKFLOW_TYPES } from "@/context/WorkflowContext";
import { cn } from "@/utils/cn";

const PRESETS = [
  { name: "Menunggu Verifikasi", color: "#F59E0B" },
  { name: "Dokumen Diverifikasi", color: "#0EA5E9" },
  { name: "Penjadwalan Survei", color: "#6366F1" },
  { name: "Survei Lokasi", color: "#14B8A6" },
  { name: "Disetujui - Aktivasi", color: "#16A34A" },
  { name: "Ditolak", color: "#E11D48" },
  { name: "Tiket Diajukan", color: "#F59E0B" },
  { name: "Dalam Pengerjaan", color: "#0EA5E9" },
  { name: "Verifikasi Hasil", color: "#14B8A6" },
  { name: "Selesai", color: "#16A34A" },
];

/**
 * MODUL C.c - Visual Workflow Builder.
 * Menambah, mengurutkan, mewarnai, dan membatasi status alur kerja
 * untuk modul Pendaftaran maupun Perbaikan Air.
 */
export function WorkflowBuilderPage() {
  const { roles, profile, can, isAdmin } = useAuth();
  const { statusesFor, loading, saving, saveStatus, moveStatus, deleteStatus } = useWorkflow();
  const toast = useToast();
  const confirmAction = useConfirm();
  const [type, setType] = useState("REGISTRATION");
  const [form, setForm] = useState(null);

  const canEdit = can("workflow", "update") || isAdmin;
  const statuses = statusesFor(type);
  const roleName = useCallback((id) => roles.find((r) => String(r.id) === String(id))?.role_name ?? null, [roles]);

  const stats = useMemo(() => {
    const total = statuses.length;
    const locked = statuses.filter((s) => (s.allowed_role_ids ?? []).length > 0).length;
    return { total, locked };
  }, [statuses]);

  const openForm = (status) => {
    const nextOrder = status?.step_order ?? statuses.length + 1;
    setForm({
      id: status?.id ?? null,
      workflow_type: type,
      status_name: status?.status_name ?? "",
      color_code: status?.color_code ?? "#4F46E5",
      step_order: nextOrder,
      allowed_role_ids: status?.allowed_role_ids ?? [],
      is_initial: Boolean(status?.is_initial),
      is_final: Boolean(status?.is_final),
    });
  };

  const submit = async () => {
    if (!form.status_name.trim()) {
      toast.warning("Nama status wajib diisi.");
      return;
    }
    const saved = await saveStatus(form);
    if (saved) setForm(null);
  };

  const remove = async (status) => {
    const ok = await confirmAction({
      title: "Hapus Status Alur",
      message: `Status "${status.status_name}" akan dihapus. Berkas lama yang masih memakai status ini akan kehilangan penanda tahapannya.`,
      confirmLabel: "Ya, Hapus Status",
    });
    if (!ok) return;
    await deleteStatus(status.id);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Modul C · Editor Alur Kerja"
        title="Visual Workflow Builder"
        description="Definisikan tahapan, warna penanda, dan divisi yang berhak memindahkan tiket pada tiap alur layanan."
        actions={
          canEdit ? (
            <Button icon={Plus} onClick={() => openForm(null)}>
              Tambah Status
            </Button>
          ) : (
            <Badge tone="neutral">Hanya Admin Pusat / peran editor yang dapat mengubah</Badge>
          )
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {Object.values(WORKFLOW_TYPES).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setType(t.key)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-lg px-4 text-[13px] font-semibold transition-all",
                type === t.key ? "bg-ink-800 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              )}
            >
              <GitBranch className="h-4 w-4" aria-hidden />
              {t.shortLabel}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500">
          <span className="rounded-md bg-slate-100 px-2 py-1">{stats.total} tahapan</span>
          <span className="rounded-md bg-slate-100 px-2 py-1">{stats.locked} terbatas peran</span>
          {loading ? <span className="animate-pulse text-brand-600">memuat…</span> : null}
        </div>
      </div>

      {statuses.length === 0 && !loading ? (
        <Card>
          <EmptyState
            icon={GitBranch}
            title="Alur kerja belum memiliki tahap"
            description="Mulai dengan menambahkan status pertama, misalnya “Menunggu Verifikasi”."
            action={canEdit ? <Button size="sm" icon={Plus} onClick={() => openForm(null)}>Tambah Status Pertama</Button> : null}
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {statuses.map((status, index) => {
            const allowed = (status.allowed_role_ids ?? []).map(roleName).filter(Boolean);
            return (
              <Reveal key={status.id} delay={index * 45}>
                <Card className="group relative overflow-hidden" hover>
                  <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: status.color_code }} aria-hidden />
                  <div className="flex flex-col gap-3 p-4 pl-6 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3.5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white font-display text-[15px] font-bold text-slate-700">
                        {status.step_order}
                      </span>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-1.5 font-display text-[15px] font-semibold tracking-tight text-slate-900">
                          {status.status_name}
                          {status.is_initial ? (
                            <Badge tone="info" size="sm">
                              Awal
                            </Badge>
                          ) : null}
                          {status.is_final ? (
                            <Badge tone="success" size="sm">
                              Final
                            </Badge>
                          ) : null}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-slate-500">
                          <span className="font-mono">{status.color_code}</span>
                          <span aria-hidden>·</span>
                          {allowed.length ? (
                            <span className="flex flex-wrap items-center gap-1">
                              {allowed.map((name) => (
                                <span key={name} className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">
                                  {name}
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span>Seluruh peran internal boleh memindahkan ke tahap ini</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:opacity-70 sm:transition-opacity sm:group-hover:opacity-100">
                      {canEdit ? (
                        <>
                          <Button size="sm" variant="secondary" icon={ArrowUp} disabled={index === 0 || saving} onClick={() => moveStatus(type, status.id, "up")}>
                            <span className="sr-only">Naikkan</span>
                          </Button>
                          <Button size="sm" variant="secondary" icon={ArrowDown} disabled={index === statuses.length - 1 || saving} onClick={() => moveStatus(type, status.id, "down")}>
                            <span className="sr-only">Turunkan</span>
                          </Button>
                          <Button size="sm" variant="ghost" icon={Pencil} onClick={() => openForm(status)}>
                            Ubah
                          </Button>
                          <Button size="sm" variant="ghost" icon={Trash2} className="text-rose-600 hover:bg-rose-50" onClick={() => remove(status)}>
                            <span className="sr-only">Hapus</span>
                          </Button>
                        </>
                      ) : (
                        <Badge tone="neutral">hanya baca</Badge>
                      )}
                    </div>
                  </div>

                  {/* Alur panah antar tahap */}
                  {index < statuses.length - 1 ? (
                    <span className="pointer-events-none absolute -bottom-[13px] left-10 z-10 hidden h-6 w-6 -translate-x-1/2 items-center justify-center text-slate-300 sm:flex" aria-hidden>
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                        <path d="M12 5v14m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  ) : null}
                </Card>
              </Reveal>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(form)}
        onClose={() => setForm(null)}
        title={form?.id ? "Ubah Status Alur Kerja" : "Tambah Status Alur Kerja"}
        subtitle={`${WORKFLOW_TYPES[type]?.shortLabel} · urutan menentukan posisi kolom pada papan kerja`}
        icon={GitBranch}
        size="md"
      >
        {form ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <Field label="Nama Status" required>
                <Input value={form.status_name} onChange={(e) => setForm({ ...form, status_name: e.target.value })} placeholder="Contoh: Pemeriksaan Lapangan" list="status-presets" autoFocus />
                <datalist id="status-presets">
                  {PRESETS.map((p) => (
                    <option key={p.name} value={p.name} />
                  ))}
                </datalist>
              </Field>
              <Field label="Langkah Ke">
                <Input type="number" min="1" value={form.step_order} onChange={(e) => setForm({ ...form, step_order: Number(e.target.value) })} />
              </Field>
            </div>

            <Field label="Warna Penanda" hint="Dipakai pada badge status, kolom papan kerja, grafik, dan timeline.">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5">
                  <input type="color" value={form.color_code} onChange={(e) => setForm({ ...form, color_code: e.target.value.toUpperCase() })} className="h-6 w-9 cursor-pointer rounded" aria-label="Pemilih warna" />
                  <span className="font-mono text-[12.5px] font-semibold text-slate-700">{form.color_code}</span>
                </div>
                {["#F59E0B", "#0EA5E9", "#6366F1", "#14B8A6", "#16A34A", "#E11D48", "#64748B"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color_code: c })}
                    className={cn("h-7 w-7 rounded-lg border transition-transform hover:scale-110", form.color_code === c ? "border-slate-900" : "border-slate-200")}
                    style={{ backgroundColor: c }}
                    aria-label={`Warna ${c}`}
                  />
                ))}
              </div>
            </Field>

            <div>
              <p className="mb-1.5 text-[12.5px] font-semibold text-slate-700">Peran yang Boleh Memindahkan ke Status Ini</p>
              <div className="grid gap-1 rounded-xl border border-slate-200 p-2 sm:grid-cols-2">
                {roles.map((r) => {
                  const checked = (form.allowed_role_ids ?? []).some((x) => String(x) === String(r.id));
                  return (
                    <Checkbox
                      key={r.id}
                      label={r.role_name}
                      description={r.description ?? undefined}
                      checked={checked}
                      onChange={(v) =>
                        setForm({
                          ...form,
                          allowed_role_ids: v ? [...(form.allowed_role_ids ?? []), r.id] : (form.allowed_role_ids ?? []).filter((x) => String(x) !== String(r.id)),
                        })
                      }
                    />
                  );
                })}
              </div>
              <p className="mt-1.5 text-[11.5px] text-slate-400">
                Bila tidak ada yang dicentang, seluruh pengguna internal yang masuk sistem boleh memindahkan tiket ke status ini.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Checkbox label="Jadikan status awal" description="Dipakai otomatis saat berkas/tiket baru dibuat." checked={form.is_initial} onChange={(v) => setForm({ ...form, is_initial: v })} />
              <Checkbox label="Jadikan status final" description="Menutup berkas dan menghentikan perhitungan SLA." checked={form.is_final} onChange={(v) => setForm({ ...form, is_final: v })} />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="secondary" onClick={() => setForm(null)}>
                Batal
              </Button>
              <Button icon={Save} loading={saving} onClick={submit}>
                {form.id ? "Simpan Perubahan" : "Tambah Status"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export default WorkflowBuilderPage;
