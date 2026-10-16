import { useCallback, useEffect, useMemo, useState } from "react";
import { ImageIcon, RotateCcw, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Field, Input, Textarea, FileInput } from "@/components/common/Field";
import { BrandWordmark } from "@/components/common/BrandMark";
import { useBranding } from "@/context/BrandingContext";
import { readFileAsDataUrl } from "@/lib/storage";
import { cn } from "@/utils/cn";

const SWATCHES = ["#0077BD", "#00A6AF", "#1D4ED8", "#0F766E", "#B45309", "#BE123C", "#0284C7", "#0F172A"];

/**
 * SettingsForm - Dinamic Branding & Logo Uploader.
 * Pratinjau logo real-time (belum disimpan) dan penerapan global seketika
 * melalui BrandingContext (Navbar, Sidebar, halaman login, favicon).
 */
export function SettingsForm() {
  const { settings, saveSettings, saving, previewFile } = useBranding();
  const [form, setForm] = useState(() => ({ ...settings, logoFile: undefined, faviconFile: undefined }));
  const [logoPreview, setLogoPreview] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm((prev) => ({ ...settings, logoFile: prev.logoFile, faviconFile: prev.faviconFile }));
  }, [settings]);

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const pickLogo = useCallback(
    async (file, error) => {
      if (error) {
        setErrors((prev) => ({ ...prev, logo: error }));
        return;
      }
      set("logoFile", file ?? null);
      setLogoPreview(file ? await previewFile(file) : null);
    },
    [previewFile, set]
  );

  const pickFavicon = useCallback(
    async (file, error) => {
      if (error) {
        setErrors((prev) => ({ ...prev, favicon: error }));
        return;
      }
      set("faviconFile", file ?? null);
      setFaviconPreview(file ? await previewFile(file) : null);
    },
    [previewFile, set]
  );

  const dirty = useMemo(
    () =>
      form.app_name !== settings.app_name ||
      form.tagline !== settings.tagline ||
      form.login_title !== settings.login_title ||
      form.login_subtitle !== settings.login_subtitle ||
      form.login_badge !== settings.login_badge ||
      form.login_hero_image !== settings.login_hero_image ||
      form.accent_color !== settings.accent_color ||
      form.support_email !== settings.support_email ||
      form.support_phone !== settings.support_phone ||
      form.logoFile instanceof File ||
      form.faviconFile instanceof File || form.logoFile === null || form.faviconFile === null,
    [form, settings]
  );

  const submit = useCallback(
    async (event) => {
      event.preventDefault();
      const found = {};
      if (!form.app_name.trim()) found.app_name = "Nama aplikasi wajib diisi.";
      if (!/^#[0-9a-fA-F]{6}$/.test(form.accent_color ?? "")) found.accent_color = "Warna aksen harus berupa kode heksa (contoh #4F46E5).";
      if (form.support_email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.support_email)) found.support_email = "Format email tidak valid.";
      setErrors(found);
      if (Object.keys(found).length) return;
      try {
        await saveSettings(form);
        setForm((prev) => ({ ...prev, logoFile: undefined, faviconFile: undefined }));
        setLogoPreview(null);
        setFaviconPreview(null);
      } catch (error) {
        setErrors((previous) => ({ ...previous, form: error.message }));
      }
    },
    [form, saveSettings]
  );

  return (
    <form onSubmit={submit} className="space-y-5">
      {errors.form && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-600">{errors.form}</p>}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama Aplikasi" required error={errors.app_name} className="sm:col-span-2">
              <Input value={form.app_name ?? ""} onChange={(e) => set("app_name", e.target.value)} placeholder="Aetra Tangerang" error={errors.app_name} />
            </Field>
            <Field label="Tagline Aplikasi" className="sm:col-span-2" hint="Muncul di bawah judul pada layar masuk dan kartu ringkas.">
              <Textarea rows={2} value={form.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} placeholder="Portal Layanan Pelanggan" />
            </Field>

            <div className="sm:col-span-2 rounded-xl border border-brand-200 bg-brand-50/40 p-4 space-y-3">
              <p className="text-xs font-bold text-brand-900 uppercase tracking-wide">Kustomisasi Tulisan Laman Depan / Login</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Badge / Label Atas Login" className="sm:col-span-2" hint="Tulisan kecil di atas judul utama login">
                  <Input value={form.login_badge ?? ""} onChange={(e) => set("login_badge", e.target.value)} placeholder="Layanan Air Terpadu PT Aetra" />
                </Field>
                <Field label="Judul Utama Laman Login" className="sm:col-span-2" hint="Teks judul besar yang menyambut pengguna">
                  <Input value={form.login_title ?? ""} onChange={(e) => set("login_title", e.target.value)} placeholder="Portal Layanan Terpadu" />
                </Field>
                <Field label="Deskripsi / Paragraf Laman Login" className="sm:col-span-2" hint="Penjelasan fungsi portal di bawah judul">
                  <Textarea rows={2} value={form.login_subtitle ?? ""} onChange={(e) => set("login_subtitle", e.target.value)} placeholder="Akses staf internal, pendaftaran mandiri sambungan baru, pelacakan tagihan & pembayaran, atau komplain pelanggan." />
                </Field>
                <FileInput
                  label="Foto / Gambar Hero Kanan Laman Login"
                  file={form.heroImageFile}
                  previewUrl={form.login_hero_image}
                  onFile={async (file, error) => {
                    if (error) {
                      setErrors((prev) => ({ ...prev, hero: error }));
                      return;
                    }
                    set("heroImageFile", file);
                    set("login_hero_image", await previewFile(file));
                  }}
                  onClear={() => {
                    set("heroImageFile", null);
                    set("login_hero_image", "");
                  }}
                  error={errors.hero}
                  hint="Gambar latar belakang panel biru kanan login. Bebas royalti dan dapat diganti kapan saja."
                />

                {/* Preset cepat tetap dipertahankan */}
                <div className="flex flex-wrap items-center gap-1.5 -mt-2">
                  <span className="text-[10px] text-slate-500 font-semibold">Preset Cepat:</span>
                  <button
                    type="button"
                    onClick={() => set("login_hero_image", "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=80")}
                    className="rounded bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-brand-700 hover:bg-brand-50"
                  >
                    Air Jernih Tenang
                  </button>
                  <button
                    type="button"
                    onClick={() => set("login_hero_image", "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80")}
                    className="rounded bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-brand-700 hover:bg-brand-50"
                  >
                    Cahaya Air & Langit
                  </button>
                  <button
                    type="button"
                    onClick={() => set("login_hero_image", "https://images.unsplash.com/photo-1527334134460-f21a05ef62f3?auto=format&fit=crop&w=1200&q=80")}
                    className="rounded bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-brand-700 hover:bg-brand-50"
                  >
                    Aliran Air Riak
                  </button>
                </div>
              </div>
            </div>

            <Field label="Email Layanan">
              <Input type="email" value={form.support_email ?? ""} onChange={(e) => set("support_email", e.target.value)} placeholder="Email layanan perusahaan (opsional)" error={errors.support_email} />
            </Field>
            <Field label="Nomor Call Center">
              <Input value={form.support_phone ?? ""} onChange={(e) => set("support_phone", e.target.value)} placeholder="021 598 5474" />
            </Field>
          </div>

          <Field label="Warna Aksen Merek" required error={errors.accent_color} hint="Menerapkan langsung ke tombol, tautan aktif, grafik, dan indikator navigasi.">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(form.accent_color ?? "") ? form.accent_color : "#4F46E5"}
                  onChange={(e) => set("accent_color", e.target.value.toUpperCase())}
                  className="h-6 w-9 cursor-pointer rounded"
                  aria-label="Pemilih warna aksen"
                />
                <span className="font-mono text-[12.5px] font-semibold text-slate-700">{form.accent_color}</span>
              </div>
              {SWATCHES.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => set("accent_color", color)}
                  className={cn(
                    "h-7 w-7 rounded-lg border transition-transform hover:scale-110",
                    String(form.accent_color).toUpperCase() === color ? "border-slate-900 ring-2 ring-offset-1 ring-slate-300" : "border-slate-200"
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Pakai warna ${color}`}
                />
              ))}
            </div>
          </Field>
        </div>

        {/* Pratinjau real-time */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-brand-600" aria-hidden /> Pratinjau Langsung
            </p>
            <div className="flex items-center gap-3 rounded-xl border border-white bg-ink-900 p-3">
              {logoPreview ? <img src={logoPreview} alt="Pratinjau logo baru" className="h-12 w-20 rounded bg-white object-contain p-1" /> : <BrandWordmark className="h-12 w-20 rounded bg-white" />}
              <div className="min-w-0">
                <p className="truncate font-display text-[13.5px] font-semibold text-white">{form.app_name || "Nama Aplikasi"}</p>
                <p className="truncate text-[11px] text-slate-400">{form.tagline || "Tagline aplikasi"}</p>
              </div>
            </div>
            <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
              <button type="button" className="h-9 w-full rounded-lg text-[13px] font-semibold text-white" style={{ backgroundColor: form.accent_color }}>
                Tombol Utama
              </button>
              <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: form.accent_color, opacity: 0.35 }} />
              <p className="text-[11.5px] text-slate-400">Aksen ini dipakai ulang oleh seluruh komponen sistem.</p>
            </div>
          </div>

          <LogoUploader
            title="Logo Aplikasi"
            icon={ImageIcon}
            currentUrl={settings.logo_url}
            previewUrl={logoPreview}
            error={errors.logo}
            onFile={pickLogo}
            onRemove={() => pickLogo(null, null)}
            removeLabel="Pakai logo Aetra"
          />
          <LogoUploader
            title="Ikon Favicon"
            icon={ImageIcon}
            currentUrl={settings.favicon_url}
            previewUrl={faviconPreview}
            error={errors.favicon}
            onFile={pickFavicon}
            onRemove={() => pickFavicon(null, null)}
            removeLabel="Hapus favicon kustom"
            small
          />
        </aside>
      </div>

      <div className="flex flex-col-reverse items-stretch gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] text-slate-500">
          {dirty ? "Terdapat perubahan yang belum disimpan." : "Semua konfigurasi tersimpan dan aktif."}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" icon={RotateCcw} onClick={() => { setForm({ ...settings, logoFile: undefined, faviconFile: undefined }); setLogoPreview(null); setFaviconPreview(null); setErrors({}); }}>
            Reset Isian
          </Button>
          <Button type="submit" icon={Save} loading={saving} disabled={!dirty}>
            Simpan Konfigurasi
          </Button>
        </div>
      </div>
    </form>
  );
}

function LogoUploader({ title, icon: Icon, currentUrl, previewUrl, error, onFile, onRemove, removeLabel, small }) {
  const url = previewUrl ?? currentUrl;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-700">
          <Icon className="h-4 w-4 text-slate-400" aria-hidden />
          {title}
        </p>
        {url ? (
          <button type="button" onClick={onRemove} className="text-[11.5px] font-semibold text-rose-600 hover:underline">
            {removeLabel}
          </button>
        ) : null}
      </div>
      <div className={cn("mt-3 grid place-items-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50/80 p-3", small ? "h-16" : "h-24")}>
        {url ? (
          <img src={url} alt={`Pratinjau ${title}`} className={cn("object-contain", small ? "h-10 w-10" : "max-h-full max-w-full")} />
        ) : (
          <p className="text-center text-[11.5px] text-slate-400">Belum ada berkas diunggah</p>
        )}
      </div>
      <label className="mt-3 flex h-9 w-full cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-[12.5px] font-semibold text-slate-600 transition-colors hover:bg-slate-50">
        {url ? "Ganti Berkas" : "Unggah Berkas"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
              onFile(null, `Ukuran berkas ${(file.size / 1024 / 1024).toFixed(2)} MB melebihi batas 2 MB.`);
              return;
            }
            onFile(file, null);
          }}
        />
      </label>
      {error ? <p className="mt-2 text-[11.5px] font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

export default SettingsForm;
