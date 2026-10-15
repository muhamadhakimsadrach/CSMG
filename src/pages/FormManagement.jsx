import { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  RotateCcw,
  Eye,
  CheckCircle2,
  Sliders,
  Sparkles,
  HelpCircle,
  Copy,
  Layers,
  Wrench,
  Check,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { Field, Input, Select, Textarea } from "@/components/common/Field";
import { Modal } from "@/components/common/Modal";
import { DynamicFormRenderer } from "@/components/common/DynamicFormRenderer";
import { useAuth } from "@/context/AuthContext";
import { useToast, useConfirm } from "@/context/ToastContext";
import {
  FORM_TARGETS,
  FIELD_TYPES,
  COMMON_UNITS,
  getFormSchema,
  saveFormSchema,
  resetFormSchema,
} from "@/lib/formManagement";
import { cn } from "@/utils/cn";

export function FormManagementPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const confirmAction = useConfirm();

  const [activeFormKey, setActiveFormKey] = useState("registration");
  const [fields, setFields] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewValues, setPreviewValues] = useState({});
  const [dirty, setDirty] = useState(false);

  // Load fields for active form
  useEffect(() => {
    const loaded = getFormSchema(activeFormKey);
    setFields(JSON.parse(JSON.stringify(loaded)));
    setDirty(false);
  }, [activeFormKey]);

  const activeTarget = FORM_TARGETS.find((t) => t.key === activeFormKey) || FORM_TARGETS[0];

  // Update a field attribute
  const updateField = (index, updates) => {
    const next = [...fields];
    next[index] = { ...next[index], ...updates };
    setFields(next);
    setDirty(true);
  };

  // Add a new question card
  const handleAddField = () => {
    const newId = `field_${Date.now()}`;
    const newField = {
      id: newId,
      label: "Pertanyaan Baru Tanpa Judul",
      type: "text",
      required: false,
      placeholder: "",
      hint: "",
    };
    setFields([...fields, newField]);
    setDirty(true);
    toast.info("Pertanyaan baru ditambahkan. Silakan lengkapi pengaturan.");
  };

  // Duplicate a field
  const handleDuplicateField = (index) => {
    const source = fields[index];
    const copy = {
      ...JSON.parse(JSON.stringify(source)),
      id: `field_${Date.now()}`,
      label: `${source.label} (Salinan)`,
    };
    const next = [...fields];
    next.splice(index + 1, 0, copy);
    setFields(next);
    setDirty(true);
    toast.info("Pertanyaan berhasil diduplikasi.");
  };

  // Delete a field
  const handleDeleteField = (index) => {
    const next = fields.filter((_, idx) => idx !== index);
    setFields(next);
    setDirty(true);
  };

  // Move field order
  const handleMove = (index, dir) => {
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= fields.length) return;
    const next = [...fields];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    setFields(next);
    setDirty(true);
  };

  // Options management for select / checkbox
  const handleAddOption = (fieldIndex) => {
    const field = fields[fieldIndex];
    const opts = field.options || [];
    const nextOpts = [...opts, `Pilihan ${opts.length + 1}`];
    updateField(fieldIndex, { options: nextOpts });
  };

  const handleUpdateOption = (fieldIndex, optIndex, val) => {
    const field = fields[fieldIndex];
    const nextOpts = [...(field.options || [])];
    nextOpts[optIndex] = val;
    updateField(fieldIndex, { options: nextOpts });
  };

  const handleDeleteOption = (fieldIndex, optIndex) => {
    const field = fields[fieldIndex];
    const nextOpts = (field.options || []).filter((_, idx) => idx !== optIndex);
    updateField(fieldIndex, { options: nextOpts });
  };

  // Save changes
  const handleSave = () => {
    const ok = saveFormSchema(activeFormKey, fields);
    if (ok) {
      setDirty(false);
      toast.success(
        `Skema ${activeTarget.title} berhasil disimpan & langsung aktif untuk seluruh pengguna!`,
        { title: "Formulir Diperbarui" }
      );
    } else {
      toast.error("Gagal menyimpan skema formulir.");
    }
  };

  // Clear current active form to empty (start from scratch)
  const handleClearCurrentForm = async () => {
    const confirmed = await confirmAction({
      title: "Kosongkan Formulir Ini?",
      message: `Seluruh pertanyaan pada "${activeTarget.title}" akan dihapus sehingga formulir dimulai dari nol. Anda dapat menambahkan pertanyaan baru secara mandiri. Lanjutkan?`,
      confirmLabel: "Ya, Kosongkan Form",
    });
    if (!confirmed) return;
    setFields([]);
    saveFormSchema(activeFormKey, []);
    setDirty(false);
    toast.success(`Formulir "${activeTarget.title}" telah dikosongkan. Siap dibangun dari nol.`);
  };

  // Clear all forms in the system
  const handleClearAllForms = async () => {
    const confirmed = await confirmAction({
      title: "Kosongkan Seluruh Formulir Sistem?",
      message: "Seluruh pertanyaan pada ke-6 formulir operasional (Pendaftaran, Survei Sales, Pengecekan NC, Selesai Pasang, Komplain, dan Minor Repair) akan dikosongkan agar pemilik aplikasi dapat membangun seluruh form dari nol. Lanjutkan?",
      confirmLabel: "Ya, Kosongkan Semua Form",
    });
    if (!confirmed) return;
    const emptyAll = {};
    FORM_TARGETS.forEach((t) => { emptyAll[t.key] = []; });
    saveFormSchema(activeFormKey, []);
    localStorage.setItem("aetra_custom_forms_v1", JSON.stringify(emptyAll));
    setFields([]);
    setDirty(false);
    toast.success("Seluruh formulir telah dikosongkan. Anda dapat membangun setiap pertanyaan dari awal.");
  };

  // Reset to default
  const handleReset = async () => {
    const confirmed = await confirmAction({
      title: "Kembalikan ke Template Standar?",
      message: `Seluruh pertanyaan kustom pada "${activeTarget.title}" akan dikembalikan ke template bawaan Aetra. Lanjutkan?`,
      confirmLabel: "Ya, Kembalikan Standar",
    });
    if (!confirmed) return;
    resetFormSchema(activeFormKey);
    const reloaded = getFormSchema(activeFormKey);
    setFields(JSON.parse(JSON.stringify(reloaded)));
    setDirty(false);
    toast.success(`Formulir dikembalikan ke template standar Aetra.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Form Management Terpusat · Admin Aetra"
        title="Kustomisasi Formulir ala Google Forms"
        description="Atur field, tipe input, satuan dinamis (meter, m3, bar, Rp), upload foto, dan opsi pilihan untuk seluruh alur kerja operasional Aetra tanpa perlu coding."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              icon={Eye}
              onClick={() => {
                setPreviewValues({});
                setPreviewOpen(true);
              }}
            >
              Pratinjau Form
            </Button>
            <Button
              variant="secondary"
              icon={Trash2}
              onClick={handleClearCurrentForm}
              className="text-amber-700 hover:bg-amber-50 border-amber-200"
            >
              Kosongkan Form Ini
            </Button>
            <Button
              variant="secondary"
              icon={Trash2}
              onClick={handleClearAllForms}
              className="text-rose-700 hover:bg-rose-50 border-rose-200"
            >
              Kosongkan Semua Form
            </Button>
            <Button
              variant="secondary"
              icon={RotateCcw}
              onClick={handleReset}
              className="text-slate-600"
            >
              Reset Standar
            </Button>
            <Button
              icon={Save}
              onClick={handleSave}
              disabled={!dirty}
              className={cn(dirty && "animate-pulse ring-2 ring-brand-400")}
            >
              Simpan Perubahan
            </Button>
          </div>
        }
      />

      {/* Form Targets Selector Tabs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 rounded-2xl bg-slate-100 p-1.5 border border-slate-200">
        {FORM_TARGETS.map((t) => {
          const active = t.key === activeFormKey;
          return (
            <button
              key={t.key}
              onClick={() => setActiveFormKey(t.key)}
              className={cn(
                "flex flex-col items-start p-3 rounded-xl text-left transition-all cursor-pointer relative",
                active
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:bg-slate-200/60"
              )}
            >
              <span className="inline-block rounded-md bg-brand-50 px-1.5 py-0.5 text-[9.5px] font-bold text-brand-700 mb-1">
                {t.badge}
              </span>
              <span className="text-[12px] font-bold line-clamp-1 leading-tight">{t.title}</span>
              <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{t.description}</span>
            </button>
          );
        })}
      </div>

      {/* Active Form Header Card */}
      <div className="rounded-2xl border-t-8 border-brand-600 bg-white p-6 shadow-sm border-x border-b border-slate-200 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
              {activeTarget.badge}
            </span>
            <h2 className="text-xl font-bold text-slate-900">{activeTarget.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{activeTarget.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Total {fields.length} Pertanyaan
            </span>
            {dirty && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 animate-pulse">
                Ada Perubahan Belum Disimpan
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Question Cards List */}
      <div className="space-y-4">
        {fields.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Formulir Ini Sedang Kosong (Mulai dari Nol)</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Sesuai prinsip sistem, Anda dapat menyusun seluruh pertanyaan dari nol. Klik tombol &ldquo;Tambah Pertanyaan Baru&rdquo; di bawah untuk menambahkan pertanyaan pertama Anda.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-2">
              <Button size="sm" icon={Plus} onClick={handleAddField}>
                Tambah Pertanyaan Pertama
              </Button>
              <Button size="sm" variant="secondary" icon={RotateCcw} onClick={handleReset}>
                Muat Template Standar
              </Button>
            </div>
          </div>
        ) : null}

        {fields.map((field, index) => {
          const typeMeta = FIELD_TYPES.find((ft) => ft.type === field.type) || FIELD_TYPES[0];

          return (
            <div
              key={field.id}
              className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-brand-300 hover:shadow-md"
            >
              {/* Question Top Row: Label & Input Type */}
              <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(index, { label: e.target.value })}
                      placeholder="Masukkan teks pertanyaan atau label field..."
                      className="flex-1 rounded-lg border border-transparent bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 hover:border-slate-200 focus:border-brand-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <Select
                    value={field.type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      const updates = { type: newType };
                      if ((newType === "select" || newType === "checkbox") && (!field.options || field.options.length === 0)) {
                        updates.options = ["Pilihan 1", "Pilihan 2"];
                      }
                      if (newType === "number" && !field.unit) {
                        updates.unit = "meter";
                      }
                      updateField(index, updates);
                    }}
                  >
                    {FIELD_TYPES.map((ft) => (
                      <option key={ft.type} value={ft.type}>
                        {ft.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Dynamic Field Configuration Details */}
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                {/* 1. NUMBER SATUAN PICKER */}
                {field.type === "number" && (
                  <div className="rounded-xl bg-brand-50/50 p-3.5 border border-brand-100/70">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-bold text-brand-900">Satuan Nilai Input:</span>
                      <input
                        type="text"
                        value={field.unit || ""}
                        onChange={(e) => updateField(index, { unit: e.target.value })}
                        placeholder="Contoh: meter, m3, bar, Rp"
                        className="rounded-lg border border-brand-200 bg-white px-2.5 py-1 text-xs font-bold text-brand-700 w-32 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-slate-500">Preset cepat:</span>
                        {COMMON_UNITS.slice(0, 6).map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => updateField(index, { unit: u })}
                            className={cn(
                              "rounded px-2 py-0.5 text-[10px] font-semibold transition-all cursor-pointer",
                              field.unit === u
                                ? "bg-brand-600 text-white"
                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                            )}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. SELECT & CHECKBOX OPTIONS MANAGER */}
                {(field.type === "select" || field.type === "checkbox") && (
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
                    <p className="text-xs font-bold text-slate-700">Daftar Pilihan / Opsi:</p>
                    <div className="space-y-1.5">
                      {(field.options || []).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400 w-4">
                            {optIdx + 1}.
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleUpdateOption(index, optIdx, e.target.value)}
                            placeholder={`Pilihan ${optIdx + 1}`}
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteOption(index, optIdx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                            title="Hapus opsi"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddOption(index)}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline cursor-pointer"
                    >
                      <Plus size={13} /> Tambah Opsi Pilihan
                    </button>
                  </div>
                )}

                {/* Hint & Placeholder Settings */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    value={field.placeholder || ""}
                    onChange={(e) => updateField(index, { placeholder: e.target.value })}
                    placeholder="Contoh teks placeholder (opsional)..."
                    className="text-xs"
                  />
                  <Input
                    value={field.hint || ""}
                    onChange={(e) => updateField(index, { hint: e.target.value })}
                    placeholder="Teks petunjuk / keterangan bantuan (opsional)..."
                    className="text-xs"
                  />
                </div>

                {/* Question Bottom Controls: Reorder, Duplicate, Delete, Required Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, -1)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                      title="Pindahkan ke atas"
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={index === fields.length - 1}
                      onClick={() => handleMove(index, 1)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                      title="Pindahkan ke bawah"
                    >
                      <ArrowDown size={15} />
                    </button>
                    <span className="mx-1 h-4 w-px bg-slate-200" />
                    <button
                      type="button"
                      onClick={() => handleDuplicateField(index)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                      title="Duplikasi pertanyaan"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteField(index)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Hapus pertanyaan"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(field.required)}
                        onChange={(e) => updateField(index, { required: e.target.checked })}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span>Wajib Diisi (Required)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Question Button Banner */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={handleAddField}
          className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 px-6 py-4 text-sm font-bold text-brand-700 transition-all hover:border-brand-500 hover:bg-brand-100/60 cursor-pointer shadow-xs"
        >
          <Plus size={18} /> Tambah Pertanyaan Baru
        </button>
      </div>

      {/* Floating Save Bar when dirty */}
      {dirty && (
        <div className="fixed bottom-6 right-8 z-40 flex items-center gap-3 rounded-2xl border border-brand-200 bg-white p-3 shadow-xl animate-fade-up">
          <span className="text-xs font-semibold text-slate-700 pl-2">
            Perubahan form belum disimpan!
          </span>
          <Button size="sm" icon={Save} onClick={handleSave}>
            Simpan Sekarang
          </Button>
        </div>
      )}

      {/* Live Preview Modal */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={`Pratinjau Formulir: ${activeTarget.title}`}
        subtitle={`Simulasi tampilan langsung seperti yang dilihat oleh pengguna ${activeTarget.badge}`}
        icon={Eye}
        size="lg"
      >
        <div className="space-y-6">
          <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-4 text-xs text-brand-900 flex items-center gap-2">
            <Sparkles size={16} className="text-brand-600 shrink-0" />
            <span>
              Ini adalah pratinjau interaktif. Anda dapat menguji input teks, angka dengan satuan, dropdown, dan unggah foto untuk memastikan form siap digunakan.
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <DynamicFormRenderer
              schema={fields}
              values={previewValues}
              onChange={setPreviewValues}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setPreviewOpen(false)}>
              Tutup Pratinjau
            </Button>
            <Button
              icon={CheckCircle2}
              onClick={() => {
                toast.success("Pengujian formulir berhasil! Seluruh data input terbaca.");
                setPreviewOpen(false);
              }}
            >
              Uji Coba Valid
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
