import { useId } from "react";
import { AlertCircle, Check, Eye, EyeOff, UploadCloud, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { useState } from "react";

const CONTROL =
  "w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-600/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

export function Field({ label, htmlFor, error, hint, required, className, children, addon }) {
  return (
    <div className={cn("min-w-0", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-1 text-[12.5px] font-semibold text-slate-700">
          {label}
          {required ? <span className="text-rose-500">*</span> : null}
          {addon ? <span className="ml-auto font-normal text-[11.5px] text-slate-400">{addon}</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1.5 flex items-start gap-1 text-[12px] font-medium text-rose-600">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] leading-relaxed text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, error, icon: Icon, type = "text", ...props }) {
  if (type === "password") return <PasswordInput className={className} error={error} icon={Icon} {...props} />;
  return (
    <div className="relative">
      {Icon ? <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden /> : null}
      <input
        type={type}
        className={cn(CONTROL, "h-10", Icon && "pl-9", error && "border-rose-300 focus:border-rose-400 focus:ring-rose-500/20", className)}
        {...props}
      />
    </div>
  );
}

export function PasswordInput({ className, error, icon: Icon, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      {Icon ? <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden /> : null}
      <input
        type={visible ? "text" : "password"}
        className={cn(CONTROL, "h-10 pr-10", Icon && "pl-9", error && "border-rose-300 focus:ring-rose-500/20", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function Textarea({ className, error, rows = 4, ...props }) {
  return (
    <textarea
      rows={rows}
      className={cn(CONTROL, "resize-y py-2.5 leading-relaxed", error && "border-rose-300 focus:ring-rose-500/20", className)}
      {...props}
    />
  );
}

export function Select({ className, error, children, ...props }) {
  return (
    <div className="relative">
      <select
        className={cn(CONTROL, "h-10 cursor-pointer appearance-none pr-9", error && "border-rose-300 focus:ring-rose-500/20", className)}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden
      >
        <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Checkbox({ label, description, checked, onChange, disabled, className, name }) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "group flex cursor-pointer items-start gap-2.5 rounded-lg border border-transparent p-1 transition-colors",
        disabled ? "cursor-not-allowed opacity-55" : "hover:bg-slate-50",
        className
      )}
    >
      <span className="relative mt-px grid h-[18px] w-[18px] shrink-0 place-items-center">
        <input
          id={id}
          type="checkbox"
          name={name}
          checked={Boolean(checked)}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          className="peer h-[18px] w-[18px] cursor-pointer appearance-none rounded-[5px] border border-slate-300 bg-white transition-colors checked:border-brand-600 checked:bg-brand-600 disabled:cursor-not-allowed"
        />
        <Check className="pointer-events-none absolute h-3 w-3 scale-75 text-white opacity-0 transition-all peer-checked:scale-100 peer-checked:opacity-100" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold leading-tight text-slate-700">{label}</span>
        {description ? <span className="mt-0.5 block text-[11.5px] leading-snug text-slate-400">{description}</span> : null}
      </span>
    </label>
  );
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-lg text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "text-emerald-700" : "text-slate-500"
      )}
    >
      <span
        className={cn(
          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
          checked ? "bg-emerald-500" : "bg-slate-300"
        )}
      >
        <span
          className={cn(
            "absolute h-4 w-4 rounded-full bg-white shadow transition-all",
            checked ? "left-[18px]" : "left-0.5"
          )}
        />
      </span>
      {label}
    </button>
  );
}

/** Area unggah berkas dengan drag & drop, pratinjau gambar, dan validasi ukuran. */
export function FileInput({ label, hint, error, accept = "image/*", file, previewUrl, onFile, onClear, required }) {
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const maxMb = 2;

  const handleFiles = (fileList) => {
    const picked = fileList?.[0];
    if (!picked) return;
    if (picked.size > maxMb * 1024 * 1024) {
      onFile?.(null, `Ukuran "${picked.name}" melebihi ${maxMb} MB.`);
      return;
    }
    onFile?.(picked, null);
  };

  return (
    <Field label={label} htmlFor={id} error={error} required={required} hint={hint}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-xl border border-dashed p-3 transition-colors",
          dragging ? "border-brand-500 bg-brand-50/60" : error ? "border-rose-300 bg-rose-50/30" : "border-slate-300 bg-slate-50/70 hover:border-slate-400"
        )}
      >
        <input id={id} type="file" accept={accept} className="sr-only" onChange={(e) => handleFiles(e.target.files)} />
        {file || previewUrl ? (
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
              {previewUrl && (file?.type?.startsWith("image/") || previewUrl.startsWith("data:image/") || /\.(png|jpe?g|webp|svg)/i.test(file?.name ?? previewUrl)) ? (
                <img src={previewUrl} alt="Pratinjau berkas" className="h-full w-full object-cover" />
              ) : (
                <Check className="h-5 w-5 text-emerald-600" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor={id} className="block cursor-pointer truncate text-[13px] font-semibold text-slate-800" title="Klik untuk mengganti berkas">{file?.name ?? "Berkas tersimpan"}</label>
              <p className="text-[11.5px] text-slate-500">
                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Berkas sudah tersimpan di penyimpanan"}
              </p>
            </div>
            {onClear ? (
              <button
                type="button"
                onClick={onClear}
                className="grid h-8 w-8 place-items-center rounded-md text-slate-400 transition-colors hover:bg-white hover:text-rose-600"
                aria-label="Hapus berkas"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ) : (
          <label htmlFor={id} className="flex cursor-pointer flex-col items-center gap-1.5 py-2 text-center">
            <UploadCloud className="h-6 w-6 text-slate-400" aria-hidden />
            <span className="text-[13px] font-semibold text-slate-700">
              Tarik berkas ke sini atau <span className="text-brand-600 underline decoration-brand-200 underline-offset-2">pilih dari perangkat</span>
            </span>
            <span className="text-[11.5px] text-slate-400">{accept.includes("pdf") ? "PNG, JPEG, WEBP, atau PDF" : "Berkas gambar"} - maksimal {maxMb} MB</span>
          </label>
        )}
      </div>
    </Field>
  );
}

export function SearchInput({ value, onChange, placeholder = "Cari…", className }) {
  return (
    <div className={cn("relative", className)}>
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={cn(CONTROL, "h-10 pl-9 pr-8")}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange?.("")}
          className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Bersihkan pencarian"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export default Field;
