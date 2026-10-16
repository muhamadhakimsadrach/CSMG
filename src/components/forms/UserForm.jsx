import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Checkbox, Field, Input, Select, Toggle } from "@/components/common/Field";
import { MODULES } from "@/lib/seedData";
import { cn } from "@/utils/cn";

const ACTIONS = [
  { key: "can_create", label: "Tambah", hint: "Membuat data baru" },
  { key: "can_read", label: "Baca", hint: "Melihat daftar & detail" },
  { key: "can_update", label: "Ubah", hint: "Revisi data & status" },
  { key: "can_delete", label: "Hapus", hint: "Menghapus permanen" },
];

const emptyMatrix = () => MODULES.map((m) => ({ module: m.key, short: m.short, label: m.label, can_create: false, can_read: false, can_update: false, can_delete: false }));

/**
 * UserForm - pembuatan/atribusi pengguna beserta matriks izin granular
 * per modul (can_create / can_read / can_update / can_delete).
 */
export function UserForm({ editingUser = null, roles = [], permissions = [], onCancel, onSubmit }) {
  const [values, setValues] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    department: "",
    role_id: "",
    password: "",
    sales_code: "",
    customer_id: "",
    is_active: true,
  });
  const [matrix, setMatrix] = useState(emptyMatrix);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMatrix(MODULES.map((module) => {
      const row = permissions.find((permission) => permission.role_id === values.role_id && permission.module_name === module.key);
      return { module: module.key, short: module.short, label: module.label,
        can_create: Boolean(row?.can_create), can_read: Boolean(row?.can_read), can_update: Boolean(row?.can_update), can_delete: Boolean(row?.can_delete) };
    }));
  }, [values.role_id, permissions]);

  useEffect(() => {
    if (!editingUser) {
      setValues({ full_name: "", email: "", phone_number: "", department: "", role_id: roles[1]?.id ?? roles[0]?.id ?? "", password: "", sales_code: "", customer_id: "", is_active: true });
      setMatrix(emptyMatrix());
      return;
    }
    setValues({
      full_name: editingUser.full_name ?? "",
      email: editingUser.email ?? "",
      phone_number: editingUser.phone_number ?? "",
      department: editingUser.department ?? "",
      role_id: editingUser.role_id ?? "",
      sales_code: editingUser.sales_code ?? "",
      customer_id: editingUser.customer_id ?? "",
      password: "",
      is_active: editingUser.is_active !== false,
    });
    setMatrix(
      MODULES.map((m) => {
        const row = permissions.find((p) => String(p.role_id) === String(editingUser.role_id) && p.module_name === m.key);
        return {
          module: m.key,
          short: m.short,
          label: m.label,
          can_create: Boolean(row?.can_create),
          can_read: Boolean(row?.can_read),
          can_update: Boolean(row?.can_update),
          can_delete: Boolean(row?.can_delete),
        };
      })
    );
  }, [editingUser, permissions, roles]);

  const set = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const selectedRole = useMemo(() => roles.find((r) => String(r.id) === String(values.role_id)) ?? null, [roles, values.role_id]);
  const isSuperRole = selectedRole?.role_name === "Admin Pusat";

  const toggleAll = useCallback(
    (actionKey, value) => {
      setMatrix((prev) => prev.map((row) => ({ ...row, [actionKey]: value })));
    },
    []
  );

  const submit = useCallback(async () => {
    const found = {};
    if (!values.full_name.trim()) found.full_name = "Nama lengkap wajib diisi.";
    if (!editingUser && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) found.email = "Email valid wajib diisi untuk akun baru.";
    if (!editingUser && values.password.length < 8) found.password = "Kata sandi minimal 8 karakter.";
    if (!values.role_id) found.role_id = "Peran kerja wajib ditentukan.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setSubmitting(true);
    try {
      await onSubmit({ ...values, matrix: isSuperRole ? [] : matrix });
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setSubmitting(false);
    }
  }, [editingUser, isSuperRole, matrix, onSubmit, values]);

  return (
    <div className="space-y-5">
      {errors.form ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12.5px] font-medium text-rose-700">{errors.form}</div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama Lengkap" required error={errors.full_name}>
          <Input value={values.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Nama pegawai" error={errors.full_name} />
        </Field>
        <Field label="Email Login" required={!editingUser} error={errors.email} hint={editingUser ? "Email utama dikelola melalui Supabase Auth." : "Menjadi akun akses pengguna."}>
          <Input type="email" readOnly={Boolean(editingUser)} value={values.email} onChange={(e) => set("email", e.target.value)} placeholder="nama@contoh.id" error={errors.email} />
        </Field>
        <Field label="Nomor Kontak" error={errors.phone_number}>
          <Input value={values.phone_number} onChange={(e) => set("phone_number", e.target.value)} placeholder="0812-3456-7890" />
        </Field>
        <Field label="Unit / Divisi">
          <Input value={values.department} onChange={(e) => set("department", e.target.value)} placeholder="Bidang Teknik" />
        </Field>
        <Field label="Peran Kerja (Role)" required error={errors.role_id}>
          <Select value={values.role_id} onChange={(e) => set("role_id", e.target.value)} error={errors.role_id}>
            <option value="">— Tentukan peran —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.role_name}
              </option>
            ))}
          </Select>
        </Field>
        {/sales/i.test(selectedRole?.role_name || "") && (
          <Field label="Kode Akun / Referral Sales" hint="Kode unik untuk routing berkas langsung dari pendaftaran pelanggan">
            <Input
              value={values.sales_code}
              onChange={(e) => set("sales_code", e.target.value.toUpperCase())}
              placeholder="Contoh: SLS-SARAH atau SLS-002"
              className="font-mono font-bold uppercase text-brand-700"
            />
          </Field>
        )}
        {/pelanggan/i.test(selectedRole?.role_name || "") && (
          <Field label="ID Pelanggan (Monthly / Akun)" hint="Nomor unik untuk login pelanggan tanpa password">
            <Input
              value={values.customer_id}
              onChange={(e) => set("customer_id", e.target.value.toUpperCase())}
              placeholder="Contoh: PLG-1008 atau AETRA-001"
              className="font-mono font-bold uppercase text-brand-700"
            />
          </Field>
        )}
        {!editingUser ? (
          <Field label="Kata Sandi Awal" required error={errors.password}>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input type="password" value={values.password} onChange={(e) => set("password", e.target.value)} placeholder="Minimal 8 karakter" className="pl-9" error={errors.password} />
            </div>
          </Field>
        ) : (
          <Field label="Reset Kata Sandi Baru" hint="Kosongkan jika tidak ingin mengubah password akun">
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input type="password" value={values.password} onChange={(e) => set("password", e.target.value)} placeholder="Isi untuk ganti sandi" className="pl-9" />
            </div>
          </Field>
        )}
        {editingUser && (
          <div className="flex items-end pb-1">
            <Toggle checked={values.is_active} onChange={(v) => set("is_active", v)} label={values.is_active ? "Akun aktif" : "Akun dinonaktifkan"} />
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden />
            <p className="text-[12.5px] font-semibold text-slate-700">
              Matriks Izin Akses per Modul {selectedRole ? `· ${selectedRole.role_name}` : ""}
            </p>
          </div>
          {isSuperRole ? (
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
              Admin Pusat memiliki hak absolut
            </span>
          ) : (
            <div className="flex items-center gap-1.5">
              <Button type="button" size="xs" variant="ghost" onClick={() => toggleAll("can_read", true)}>
                Izinkan baca semua
              </Button>
              <Button type="button" size="xs" variant="ghost" onClick={() => setMatrix(emptyMatrix())}>
                Kosongkan
              </Button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-white">
                <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Modul</th>
                {ACTIONS.map((a) => (
                  <th key={a.key} className="px-2 py-2 text-center">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{a.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.module} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5">
                    <p className="text-[13px] font-semibold text-slate-700">{row.short}</p>
                    <p className="text-[11px] text-slate-400">{row.label}</p>
                  </td>
                  {ACTIONS.map((a) => (
                    <td key={a.key} className="px-2 py-1.5 text-center">
                      <div className={cn("flex justify-center", isSuperRole && "opacity-40")}>
                        <Checkbox
                          label=""
                          checked={isSuperRole ? true : row[a.key]}
                          disabled={isSuperRole}
                          onChange={(v) =>
                            setMatrix((prev) => prev.map((r) => (r.module === row.module ? { ...r, [a.key]: v } : r)))
                          }
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] text-slate-500">
          Matriks ini berlaku bagi seluruh pengguna dengan peran yang sama. Perubahan mengikuti hak akses dan kebijakan RLS.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Batal
          </Button>
          <Button type="button" icon={Save} loading={submitting} onClick={submit}>
            {editingUser ? "Simpan Perubahan" : "Buat Akun Pengguna"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default UserForm;
