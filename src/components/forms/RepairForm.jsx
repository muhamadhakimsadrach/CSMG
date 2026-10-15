import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, Save, Timer } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Field, Input, Select, Textarea } from "@/components/common/Field";
import { validateRepairForm } from "@/lib/api/repairs";
import { PRIORITY_META, SLA_HOURS, formatDuration } from "@/lib/utils";
import { REPAIR_CATEGORIES } from "@/lib/waterDomain";

const CATEGORIES = REPAIR_CATEGORIES;
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

/**
 * RepairForm - pengajuan tiket perbaikan air lengkap dengan penugasan
 * teknisi/divisi dan perhitungan batas SLA otomatis.
 */
export function RepairForm({ technicians = [], initialStatus, onCancel, onSubmit }) {
  const [values, setValues] = useState({
    title: "",
    customer_number: "",
    description: "",
    location_address: "",
    priority: "Medium",
    service_category: CATEGORIES[0],
    assigned_to: "",
    assigned_division: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [progressText, setProgressText] = useState("");

  const set = useCallback((key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }, []);

  const slaHours = SLA_HOURS[values.priority] ?? 48;
  const deadline = useMemo(() => new Date(Date.now() + slaHours * 3_600_000), [slaHours]);

  const submit = useCallback(async () => {
    const found = validateRepairForm(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSubmitting(true);
    try {
      await onSubmit({ ...values, sla_hours: slaHours }, setProgressText);
    } catch (error) {
      setErrors((previous) => ({ ...previous, form: error.message || "Laporan gangguan belum dapat disimpan." }));
    } finally {
      setSubmitting(false);
      setProgressText("");
    }
  }, [onSubmit, slaHours, values]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4"
    >
      {errors.form && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-600">{errors.form}</p>}
      <Field label="Nomor pelanggan Aetra" hint="Opsional untuk gangguan jaringan umum. Isi bila laporan terkait sambungan pelanggan."><Input value={values.customer_number} onChange={(event) => set("customer_number", event.target.value)} placeholder="Masukkan nomor pelanggan" /></Field>
      <Field label="Judul Masalah" required error={errors.title}>
        <Input value={values.title} onChange={(e) => set("title", e.target.value)} placeholder="Contoh: Pipa distribusi bocor di zona 3" error={errors.title} autoFocus />
      </Field>

      <Field label="Deskripsi Kerusakan" required error={errors.description} hint="Jelaskan gejala, lokasi terdampak, dan tindakan awal yang sudah dilakukan.">
        <Textarea
          rows={4}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Kebocoran pada sambungan pipa HDPE menyebabkan genangan di area gudang…"
          error={errors.description}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Lokasi Kerusakan" required error={errors.location_address}>
          <Input
            value={values.location_address}
            onChange={(e) => set("location_address", e.target.value)}
            placeholder="Perumahan Puri Jaya, Blok C2, Pasar Kemis"
            error={errors.location_address}
          />
        </Field>
        <Field label="Kategori Layanan" required error={errors.service_category}>
          <Select value={values.service_category} onChange={(e) => set("service_category", e.target.value)} error={errors.service_category}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div>
        <p className="mb-1.5 text-[12.5px] font-semibold text-slate-700">
          Tingkat Prioritas <span className="text-rose-500">*</span>
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRIORITIES.map((p) => {
            const meta = PRIORITY_META[p];
            const active = values.priority === p;
            return (
              <button
                type="button"
                key={p}
                onClick={() => set("priority", p)}
                className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-all duration-150 ${
                  active ? "border-brand-500 bg-brand-50/70 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                  <span className="text-[13px] font-semibold text-slate-800">{meta.label}</span>
                </span>
                <span className="font-mono text-[11px] text-slate-400">{SLA_HOURS[p]}j</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Penugasan Teknisi" hint="Kosongkan bila penugasan dilakukan oleh koordinator.">
          <Select
            value={values.assigned_to}
            onChange={(e) => {
              const picked = technicians.find((t) => String(t.id) === e.target.value);
              setValues((prev) => ({ ...prev, assigned_to: e.target.value, assigned_division: picked?.department ?? "" }));
            }}
          >
            <option value="">— Belum ditugaskan —</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name} {t.department ? `· ${t.department}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Divisi Pelaksana">
          <Input value={values.assigned_division} onChange={(e) => set("assigned_division", e.target.value)} placeholder="Divisi Teknik" />
        </Field>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid h-8 w-8 place-items-center rounded-lg bg-white text-brand-600 ring-1 ring-slate-200">
            <Timer className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-[12.5px] font-semibold text-slate-800">Target Penyelesaian SLA</p>
            <p className="text-[11.5px] text-slate-500">
              {formatDuration(slaHours, { long: true })} · jatuh tempo{" "}
              {deadline.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
        {initialStatus ? (
          <span className="rounded-md bg-white px-2 py-1 text-[11.5px] font-semibold text-slate-600 ring-1 ring-slate-200">
            Status awal: {initialStatus.status_name}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Alur kerja belum tersedia
          </span>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-slate-400">Batas waktu SLA merupakan target internal perbaikan yang dapat disesuaikan administrator, bukan ketentuan resmi layanan pelanggan.</p>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
        {progressText ? <span className="mr-auto text-[12px] font-medium text-brand-600">{progressText}</span> : null}
        <Button type="button" variant="secondary" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" icon={Save} loading={submitting}>
          Simpan Tiket
        </Button>
      </div>
    </form>
  );
}

export default RepairForm;
