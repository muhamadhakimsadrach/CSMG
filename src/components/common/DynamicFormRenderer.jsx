import { useState } from "react";
import { Upload, X, Check, Image as ImageIcon, Info } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/common/Field";
import { readFileAsDataUrl } from "@/lib/storage";

/**
 * DynamicFormRenderer
 * Merender field kustom yang telah diatur oleh Admin Aetra via Form Management.
 * Mendukung Teks, Paragraf, Angka dengan Satuan (meter, m3, bar, Rp), Dropdown, Checkbox, dan Upload Gambar.
 */
export function DynamicFormRenderer({ schema = [], values = {}, onChange, errors = {}, readOnly = false }) {
  const [previews, setPreviews] = useState({});

  const handleValueChange = (fieldId, val) => {
    if (readOnly) return;
    onChange({ ...values, [fieldId]: val });
  };

  const handleFileUpload = async (fieldId, e) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPreviews((prev) => ({ ...prev, [fieldId]: dataUrl }));
      onChange({ ...values, [fieldId]: dataUrl });
    } catch (err) {
      console.error("Gagal membaca berkas gambar:", err);
    }
  };

  const handleRemoveFile = (fieldId) => {
    if (readOnly) return;
    setPreviews((prev) => ({ ...prev, [fieldId]: null }));
    onChange({ ...values, [fieldId]: "" });
  };

  if (!schema || schema.length === 0) return null;

  return (
    <div className="space-y-4">
      {schema.map((field) => {
        const val = values[field.id] ?? "";
        const error = errors[field.id];

        // 1. TEXTAREA (PARAGRAF)
        if (field.type === "textarea") {
          return (
            <Field
              key={field.id}
              label={field.label}
              required={field.required}
              error={error}
              hint={field.hint}
            >
              <Textarea
                rows={3}
                value={val}
                onChange={(e) => handleValueChange(field.id, e.target.value)}
                placeholder={field.placeholder || "Tuliskan keterangan..."}
                disabled={readOnly}
              />
            </Field>
          );
        }

        // 2. NUMBER DENGAN SATUAN (meter, m3, bar, Rp, dll)
        if (field.type === "number") {
          return (
            <Field
              key={field.id}
              label={field.label}
              required={field.required}
              error={error}
              hint={field.hint}
            >
              <div className="relative flex rounded-lg shadow-xs">
                {field.unit && field.unit.toLowerCase() === "rp" && (
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-200 bg-slate-100 text-xs font-semibold text-slate-600">
                    Rp
                  </span>
                )}
                <Input
                  type="number"
                  step="any"
                  value={val}
                  onChange={(e) => handleValueChange(field.id, e.target.value)}
                  placeholder={field.placeholder || "0"}
                  disabled={readOnly}
                  className={field.unit && field.unit.toLowerCase() === "rp" ? "rounded-l-none" : field.unit ? "rounded-r-none" : ""}
                />
                {field.unit && field.unit.toLowerCase() !== "rp" && (
                  <span className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-slate-200 bg-slate-100 text-xs font-semibold text-brand-700">
                    {field.unit}
                  </span>
                )}
              </div>
            </Field>
          );
        }

        // 3. SELECT (DROPDOWN)
        if (field.type === "select") {
          return (
            <Field
              key={field.id}
              label={field.label}
              required={field.required}
              error={error}
              hint={field.hint}
            >
              <Select
                value={val}
                onChange={(e) => handleValueChange(field.id, e.target.value)}
                disabled={readOnly}
              >
                <option value="">— Pilih {field.label} —</option>
                {(field.options || []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
            </Field>
          );
        }

        // 4. CHECKBOX (MULTI PILIH)
        if (field.type === "checkbox") {
          const selected = Array.isArray(val) ? val : [];
          return (
            <Field
              key={field.id}
              label={field.label}
              required={field.required}
              error={error}
              hint={field.hint}
            >
              <div className="space-y-2 pt-1">
                {(field.options || []).map((opt) => {
                  const checked = selected.includes(opt);
                  return (
                    <label
                      key={opt}
                      className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={readOnly}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...selected, opt]
                            : selected.filter((item) => item !== opt);
                          handleValueChange(field.id, next);
                        }}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
            </Field>
          );
        }

        // 5. FILE / UNGGAH GAMBAR
        if (field.type === "file") {
          const currentUrl = previews[field.id] || (typeof val === "string" && val.startsWith("data:") ? val : val);
          return (
            <Field
              key={field.id}
              label={field.label}
              required={field.required}
              error={error}
              hint={field.hint || "Format gambar: JPG, PNG, WEBP"}
            >
              {currentUrl ? (
                <div className="relative mt-1 inline-block rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shadow-xs">
                  <img
                    src={currentUrl}
                    alt={field.label}
                    className="h-36 w-full max-w-[280px] object-cover"
                  />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(field.id)}
                      className="absolute top-2 right-2 rounded-full bg-slate-900/70 p-1 text-white hover:bg-rose-600 transition-colors"
                      title="Hapus gambar"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-4 transition-colors hover:border-brand-400 hover:bg-brand-50/30">
                  <Upload size={22} className="text-slate-400" />
                  <span className="mt-1.5 text-xs font-semibold text-slate-700">Pilih berkas / foto</span>
                  <span className="text-[10px] text-slate-400">Klik untuk mengunggah dari perangkat</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={readOnly}
                    onChange={(e) => handleFileUpload(field.id, e)}
                    className="hidden"
                  />
                </label>
              )}
            </Field>
          );
        }

        // 6. DATE (TANGGAL)
        if (field.type === "date") {
          return (
            <Field
              key={field.id}
              label={field.label}
              required={field.required}
              error={error}
              hint={field.hint}
            >
              <Input
                type="date"
                value={val}
                onChange={(e) => handleValueChange(field.id, e.target.value)}
                disabled={readOnly}
              />
            </Field>
          );
        }

        // DEFAULT: TEXT (JAWABAN SINGKAT)
        return (
          <Field
            key={field.id}
            label={field.label}
            required={field.required}
            error={error}
            hint={field.hint}
          >
            <Input
              type="text"
              value={val}
              onChange={(e) => handleValueChange(field.id, e.target.value)}
              placeholder={field.placeholder || "Masukkan jawaban"}
              disabled={readOnly}
            />
          </Field>
        );
      })}
    </div>
  );
}
