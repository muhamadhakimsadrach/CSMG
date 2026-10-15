import { useCallback, useState } from "react";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Field, FileInput, Select, Textarea } from "@/components/common/Field";
import { readFileAsDataUrl } from "@/lib/storage";
import { uuid } from "@/lib/utils";

/**
 * RepairCompletionForm - formulir penyelesaian tiket: bukti foto perbaikan,
 * catatan teknikal, dan daftar material/sparepart yang digunakan.
 */
export function RepairCompletionForm({ order, statuses = [], currentStatusId, onCancel, onSubmit }) {
  const [statusId, setStatusId] = useState(() => {
    const preferred = statuses.find((s) => s.is_final && String(s.id) !== String(currentStatusId));
    return preferred?.id ?? statuses.find((s) => String(s.id) !== String(currentStatusId))?.id ?? "";
  });
  const [note, setNote] = useState("");
  const [technicianNotes, setTechnicianNotes] = useState(order?.technician_notes ?? "");
  const [materials, setMaterials] = useState(Array.isArray(order?.materials_used) ? order.materials_used : []);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(order?.proof_image_url ?? null);
  const [error, setError] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const target = statuses.find((s) => String(s.id) === String(statusId)) ?? null;
  const isFinal = Boolean(target?.is_final);

  const handleFile = useCallback(async (file, err) => {
    setFileError(err ?? null);
    if (err) return;
    setProofFile(file ?? null);
    if (!file) {
      setProofPreview(null);
      return;
    }
    try {
      setProofPreview(await readFileAsDataUrl(file));
    } catch (e) {
      setProofPreview(null);
    }
  }, []);

  const addMaterial = useCallback(() => {
    setMaterials((prev) => [...prev, { id: uuid(), name: "", qty: 1, unit: "buah" }]);
  }, []);

  const patchMaterial = useCallback((id, key, value) => {
    setMaterials((prev) => prev.map((m) => (String(m.id) === String(id) ? { ...m, [key]: value } : m)));
  }, []);

  const submit = useCallback(async () => {
    setError(null);
    if (!statusId) {
      setError("Pilih status tujuan tiket.");
      return;
    }
    if (isFinal && !proofFile && !order?.proof_image_url) {
      setError("Foto bukti perbaikan wajib diunggah sebelum tiket dinyatakan selesai.");
      return;
    }
    if (isFinal && !technicianNotes.trim()) {
      setError("Catatan teknikal wajib diisi sebagai dokumentasi penyelesaian.");
      return;
    }
    const cleanMaterials = materials.filter((m) => String(m.name).trim());
    setSubmitting(true);
    try {
      await onSubmit({ statusId, note, technicianNotes, materials: cleanMaterials, proofFile });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [isFinal, materials, note, onSubmit, order, proofFile, statusId, technicianNotes]);

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12.5px] font-medium text-rose-700">{error}</div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ubah Status Ke" required hint={isFinal ? "Status final akan menutup tiket & menghitung durasi penanganan." : undefined}>
          <Select value={statusId} onChange={(e) => setStatusId(e.target.value)}>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.status_name}
                {s.is_final ? " · final" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <FileInput
          label="Foto Bukti Perbaikan"
          accept="image/*"
          file={proofFile}
          previewUrl={proofPreview}
          error={fileError}
          hint="Dokumentasi kondisi sesudah perbaikan."
          onFile={handleFile}
          onClear={() => handleFile(null, null)}
        />
      </div>

      <Field label="Catatan Teknis Teknisi" required={isFinal} hint="Temuan akar masalah, tindakan perbaikan, dan hasil uji fungsi.">
        <Textarea
          rows={4}
          value={technicianNotes}
          onChange={(e) => setTechnicianNotes(e.target.value)}
          placeholder="Diganti segmen pipa 4 m, dilakukan pressure test 8 bar selama 30 menit, tidak ditemukan rembesan."
        />
      </Field>

      <div className="rounded-xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <p className="text-[12.5px] font-semibold text-slate-700">Daftar Material / Sparepart</p>
          <Button type="button" size="xs" variant="secondary" icon={Plus} onClick={addMaterial}>
            Tambah
          </Button>
        </div>
        {materials.length === 0 ? (
          <p className="px-4 py-5 text-center text-[12.5px] text-slate-400">Belum ada material yang dicatat untuk tiket ini.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {materials.map((m, i) => (
              <li key={m.id ?? i} className="grid grid-cols-[1fr_70px_86px_32px] items-center gap-2 px-3 py-2.5">
                <input
                  value={m.name}
                  onChange={(e) => patchMaterial(m.id, "name", e.target.value)}
                  placeholder="Nama material"
                  className="h-9 rounded-lg border border-slate-200 px-2.5 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
                />
                <input
                  type="number"
                  min="0"
                  value={m.qty}
                  onChange={(e) => patchMaterial(m.id, "qty", Number(e.target.value))}
                  className="h-9 rounded-lg border border-slate-200 px-2 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
                />
                <select
                  value={m.unit}
                  onChange={(e) => patchMaterial(m.id, "unit", e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[13px] focus:border-brand-500 focus:outline-none"
                >
                  {["buah", "batang", "meter", "set", "liter", "kotak"].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setMaterials((prev) => prev.filter((x) => x.id !== m.id))}
                  className="grid h-8 w-8 place-items-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  aria-label={`Hapus material ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Field label="Catatan Perpindahan Status" hint="Tercatat pada timeline tiket dan dapat dilihat pelanggan saat pelacakan.">
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: perbaikan selesai, menunggu verifikasi pengawas lapangan." />
      </Field>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-[12px] text-slate-500">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
          {isFinal ? "Tiket akan ditandai selesai dan durasi penanganan dikunci." : "Tiket tetap terbuka pada kolom tujuan."}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Batal
          </Button>
          <Button type="button" variant={isFinal ? "success" : "primary"} loading={submitting} onClick={submit}>
            Simpan Perubahan
          </Button>
        </div>
      </div>
    </div>
  );
}

export default RepairCompletionForm;
