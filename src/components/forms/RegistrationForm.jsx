import { useCallback, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Crosshair, FileCheck2, Info, MapPin, Send, UserRound } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Checkbox, Field, FileInput, Input, Select, Textarea } from "@/components/common/Field";
import { validateRegistrationForm } from "@/lib/api/registrations";
import { readFileAsDataUrl } from "@/lib/storage";
import { COMPANY, DOCUMENT_FIELDS, isCommercial, SERVICE_DISTRICTS, SERVICE_TYPES } from "@/lib/waterDomain";
import { cn } from "@/utils/cn";

const STEPS = [{ label: "Data pemohon", icon: UserRound }, { label: "Lokasi sambungan", icon: MapPin }, { label: "Dokumen & persetujuan", icon: FileCheck2 }];
const EMPTY = { customer_name: "", identity_number: "", phone_number: "", email: "", sales_code: "", service_type: SERVICE_TYPES[0], province: "Banten", city: "Kabupaten Tangerang", district: "", village: "", address: "", latitude: "", longitude: "", property_ownership: "Milik sendiri", building_area: "", occupants: "", ktpFile: null, kkFile: null, pbbFile: null, sitePhotoFile: null, businessFile: null, consent_accepted: false };

export function RegistrationForm({ onCancel, onSubmit }) {
  const [values, setValues] = useState(EMPTY);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [previews, setPreviews] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState("");
  const [locating, setLocating] = useState(false);
  const set = (key, value) => { setValues((previous) => ({ ...previous, [key]: value })); setErrors((previous) => ({ ...previous, [key]: undefined, form: undefined })); };
  const handleFile = async (key, file, error) => {
    if (error) { setErrors((previous) => ({ ...previous, [key]: error })); return; }
    set(key, file || null);
    try { setPreviews((previous) => ({ ...previous, [key]: null })); if (file) { const preview = await readFileAsDataUrl(file); setPreviews((previous) => ({ ...previous, [key]: preview })); } }
    catch { setErrors((previous) => ({ ...previous, [key]: "Pratinjau berkas tidak dapat dibaca. Pilih kembali berkas." })); }
  };
  const detectLocation = () => {
    if (!navigator.geolocation) { setErrors((previous) => ({ ...previous, latitude: "Perangkat tidak mendukung lokasi. Isi koordinat secara manual." })); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => { set("latitude", position.coords.latitude.toFixed(6)); set("longitude", position.coords.longitude.toFixed(6)); setLocating(false); }, () => { setErrors((previous) => ({ ...previous, latitude: "Lokasi tidak dapat diakses. Izinkan akses atau isi koordinat manual." })); setLocating(false); }, { enableHighAccuracy: true, timeout: 10000 });
  };
  const next = () => { const found = validateRegistrationForm(values, step); setErrors(found); if (!Object.keys(found).length) setStep((previous) => previous + 1); };
  const submit = useCallback(async () => {
    for (let currentStep = 1; currentStep <= 3; currentStep += 1) { const found = validateRegistrationForm(values, currentStep); if (Object.keys(found).length) { setStep(currentStep); setErrors(found); return; } }
    setSubmitting(true);
    try { await onSubmit(values, setProgress); }
    catch (error) { setErrors((previous) => ({ ...previous, form: error.message || "Permohonan tidak dapat disimpan. Silakan coba kembali." })); }
    finally { setSubmitting(false); setProgress(""); }
  }, [values, onSubmit]);

  return <div>
    <ol className="mb-7 flex items-start">{STEPS.map((item, index) => { const Icon = item.icon; return <li key={item.label} className="relative flex flex-1 flex-col items-center gap-2 text-center">{index < 2 && <span className={cn("absolute left-[calc(50%+20px)] top-4 h-px w-[calc(100%-40px)]", index + 1 < step ? "bg-brand-300" : "bg-slate-200")} />}<button type="button" disabled={index + 1 >= step} onClick={() => setStep(index + 1)} className={cn("grid h-8 w-8 place-items-center rounded-full border transition-colors", index + 1 === step ? "border-brand-600 bg-brand-600 text-white ring-4 ring-brand-50" : index + 1 < step ? "border-brand-200 bg-brand-50 text-brand-600" : "border-slate-200 bg-white text-slate-300")}>{index + 1 < step ? <Check size={15} /> : <Icon size={14} />}</button><span className={cn("text-[10px] sm:text-[11px]", index + 1 === step ? "font-semibold text-slate-700" : "text-slate-400")}>{item.label}</span></li>; })}</ol>
    {errors.form && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-600">{errors.form}</p>}
    {step === 1 && <div className="grid animate-fade-in gap-4 sm:grid-cols-2">
      <Field label="Nama lengkap pemohon / badan usaha" required error={errors.customer_name} className="sm:col-span-2"><Input value={values.customer_name} onChange={(event) => set("customer_name", event.target.value)} placeholder="Nama sesuai identitas pemohon" error={errors.customer_name} autoFocus /></Field>
      <Field label="NIK penanggung jawab" required error={errors.identity_number} hint="16 digit sesuai KTP, termasuk untuk penanggung jawab badan usaha."><Input value={values.identity_number} onChange={(event) => set("identity_number", event.target.value.replace(/\D/g, "").slice(0, 16))} placeholder="3603xxxxxxxxxxxx" inputMode="numeric" error={errors.identity_number} className="font-mono" /></Field>
      <Field label="Nomor HP / WhatsApp" required error={errors.phone_number} hint="Nomor aktif untuk konfirmasi dan penjadwalan survei."><Input value={values.phone_number} onChange={(event) => set("phone_number", event.target.value)} placeholder="0812 3456 7890" inputMode="tel" error={errors.phone_number} /></Field>
      <Field label="Kode Akun / Referral Sales (Opsional)" hint="Jika diisi, berkas langsung direct ke Sales tersebut."><Input value={values.sales_code} onChange={(event) => set("sales_code", event.target.value.toUpperCase())} placeholder="Contoh: SLS-SARAH atau SLS-001" className="font-mono uppercase font-bold text-brand-700" /></Field>
      <Field label="Email" error={errors.email} hint="Opsional."><Input type="email" value={values.email} onChange={(event) => set("email", event.target.value)} placeholder="nama@contoh.id" error={errors.email} /></Field>
      <Field label="Peruntukan sambungan air" required error={errors.service_type} className="sm:col-span-2"><Select value={values.service_type} onChange={(event) => set("service_type", event.target.value)}>{SERVICE_TYPES.map((service) => <option key={service}>{service}</option>)}</Select></Field>
      <div className="flex items-start gap-2 rounded-lg bg-brand-50/70 p-3 sm:col-span-2"><Info size={15} className="mt-0.5 shrink-0 text-brand-500" /><p className="text-[11px] leading-relaxed text-slate-500">Permohonan ini untuk sambungan air perpipaan baru. Golongan tarif, ukuran meter, dan biaya pemasangan ditetapkan setelah verifikasi serta survei jaringan oleh Aetra.</p></div>
    </div>}
    {step === 2 && <div className="grid animate-fade-in gap-4 sm:grid-cols-2">
      <Field label="Provinsi"><Input value={values.province} readOnly /></Field><Field label="Kabupaten"><Input value={values.city} readOnly /></Field>
      <Field label="Kecamatan" required error={errors.district}><Select value={values.district} onChange={(event) => { set("district", event.target.value); set("village", ""); }} error={errors.district}><option value="">Pilih kecamatan pemasangan</option>{SERVICE_DISTRICTS.map((district) => <option key={district}>{district}</option>)}</Select></Field>
      <Field label="Kelurahan / desa" required error={errors.village}><Input value={values.village} onChange={(event) => set("village", event.target.value)} placeholder="Contoh: Sukamantri" error={errors.village} /></Field>
      <Field label="Alamat lengkap lokasi pemasangan" required error={errors.address} className="sm:col-span-2"><Textarea rows={3} value={values.address} onChange={(event) => set("address", event.target.value)} placeholder="Nama jalan / perumahan, blok, nomor, RT/RW, dan kode pos" error={errors.address} /></Field>
      <Field label="Status kepemilikan bangunan"><Select value={values.property_ownership} onChange={(event) => set("property_ownership", event.target.value)}><option>Milik sendiri</option><option>Sewa / kontrak</option><option>Milik keluarga</option><option>Badan usaha</option></Select></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Luas bangunan (m2)" error={errors.building_area}><Input type="number" min="1" value={values.building_area} onChange={(event) => set("building_area", event.target.value)} placeholder="90" error={errors.building_area} /></Field><Field label="Jumlah penghuni" error={errors.occupants}><Input type="number" min="1" value={values.occupants} onChange={(event) => set("occupants", event.target.value)} placeholder="4" error={errors.occupants} /></Field></div>
      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 sm:col-span-2"><div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-slate-700">Titik lokasi sambungan</p><p className="mt-1 text-[10px] text-slate-400">Opsional. Pastikan GPS berada di lokasi pemasangan.</p></div><Button type="button" size="xs" variant="secondary" icon={Crosshair} loading={locating} onClick={detectLocation}>Gunakan GPS</Button></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Latitude" error={errors.latitude}><Input value={values.latitude} onChange={(event) => set("latitude", event.target.value)} placeholder="-6.111234" inputMode="decimal" error={errors.latitude} /></Field><Field label="Longitude" error={errors.longitude}><Input value={values.longitude} onChange={(event) => set("longitude", event.target.value)} placeholder="106.561234" inputMode="decimal" error={errors.longitude} /></Field></div></div>
      <p className="text-[11px] leading-relaxed text-slate-400 sm:col-span-2">Kecamatan yang tercantum tidak menjamin cakupan di setiap alamat. Tim Aetra akan memeriksa ketersediaan dan kelayakan jaringan di lokasi Anda.</p>
    </div>}
    {step === 3 && <div className="animate-fade-in space-y-4"><div className="grid gap-4 sm:grid-cols-2">{DOCUMENT_FIELDS.filter((field) => field.key !== "businessFile" || isCommercial(values.service_type)).map((field) => <FileInput key={field.key} label={field.label} accept={field.key === "sitePhotoFile" ? "image/png,image/jpeg,image/webp" : "image/png,image/jpeg,image/webp,application/pdf"} required={field.required || (field.key === "businessFile" && isCommercial(values.service_type))} file={values[field.key]} previewUrl={previews[field.key]} error={errors[field.key]} hint={field.hint} onFile={(file, error) => handleFile(field.key, file, error)} onClear={() => handleFile(field.key, null, null)} />)}</div><div className="rounded-lg border border-slate-200 p-4"><p className="text-xs font-semibold text-slate-700">Ringkasan permohonan sambungan air</p><dl className="mt-3 grid gap-x-5 gap-y-2 text-[11px] sm:grid-cols-2">{[["Pemohon", values.customer_name], ["Peruntukan", values.service_type], ["Wilayah", values.district], ["Lokasi", values.village]].map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt className="text-slate-400">{label}</dt><dd className="font-medium text-slate-700">{value}</dd></div>)}</dl></div><Checkbox label="Persetujuan pemrosesan data pelanggan" description="Saya menyatakan data yang disampaikan benar dan menyetujui penggunaan dokumen untuk verifikasi, survei, dan pemasangan sambungan air Aetra Tangerang." checked={values.consent_accepted} onChange={(accepted) => set("consent_accepted", accepted)} />{errors.consent_accepted && <p role="alert" className="text-xs text-rose-600">{errors.consent_accepted}</p>}<a href={COMPANY.termsUrl} target="_blank" rel="noreferrer" className="inline-flex text-[11px] text-brand-600 underline underline-offset-4">Baca syarat dan ketentuan berlangganan Aetra</a></div>}
    <div className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center"><Button type="button" variant="ghost" size="sm" icon={step > 1 ? ArrowLeft : undefined} onClick={step > 1 ? () => setStep((previous) => previous - 1) : onCancel}>{step > 1 ? "Kembali" : "Batalkan"}</Button>{progress && <span aria-live="polite" className="text-xs text-brand-600">{progress}</span>}<Button type="button" size="sm" iconRight={step < 3 ? ArrowRight : undefined} icon={step === 3 ? Send : undefined} loading={submitting} onClick={step < 3 ? next : submit}>{step < 3 ? "Lanjutkan" : "Kirim permohonan"}</Button></div>
  </div>;
}
export default RegistrationForm;
