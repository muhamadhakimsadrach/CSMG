import { useState } from "react";
import { Database, Image, Layers, ShieldAlert, Trash2, Terminal } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { EmptyState } from "@/components/common/LoadingSpinner";
import { Reveal } from "@/components/common/Reveal";
import { SettingsForm } from "@/components/forms/SettingsForm";
import { useAuth } from "@/context/AuthContext";
import { useConfirm, useToast } from "@/context/ToastContext";
import { isDemoMode, resetDemoData } from "@/lib/supabaseClient";
import schemaSql from "../../supabase/schema.sql?raw";
import waterMigration from "../../supabase/migrations/20261014_aetra_water_services.sql?raw";
import { cn } from "@/utils/cn";

const TABS = [
  { key: "branding", label: "Branding & Tampilan", icon: Image },
  { key: "security", label: "Skema & Keamanan Data", icon: ShieldAlert },
];

/**
 * MODUL C - Pusat Pengaturan & Administrator: branding dinamis, panduan
 * pemasangan skema RLS, dan utilitas data demo.
 */
export function SettingsPage() {
  const { can, isAdmin } = useAuth();
  const toast = useToast();
  const confirmAction = useConfirm();
  const [tab, setTab] = useState("branding");
  const [showSql, setShowSql] = useState(false);

  const allowed = can("pengaturan", "read") || isAdmin;
  const canUpdate = can("pengaturan", "update") || isAdmin;

  if (!allowed) {
    return (
      <Card>
        <EmptyState
          icon={ShieldAlert}
          title="Khusus Admin Pusat"
          description="Pusat pengaturan hanya dapat diakses oleh peran dengan izin modul 'pengaturan'."
        />
      </Card>
    );
  }

  const resetDemo = async () => {
    const ok = await confirmAction({
      title: "Reset Data Demo",
      message: "Seluruh perubahan pada mode demo (pendaftaran, tiket, pengguna, branding) akan dikembalikan ke data awal contoh. Lanjutkan?",
      confirmLabel: "Ya, Reset Sekarang",
    });
    if (!ok) return;
    resetDemoData();
    toast.success("Basis data demo dipulihkan. Memuat ulang tampilan…", { title: "Reset Selesai" });
    window.setTimeout(() => window.location.reload(), 700);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Modul C"
        title="Pusat Pengaturan & Administrator"
        description="Ubah identitas merek aplikasi, pasang skema keamanan, dan kendalikan lingkungan data."
      />

      <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold transition-all",
              tab === t.key ? "bg-ink-800 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            )}
          >
            <t.icon className="h-4 w-4" aria-hidden />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "branding" ? (
        <Reveal>
          <Card className="overflow-hidden">
            <CardHeader
              title="Branding Dinamis"
              subtitle="Perubahan nama, logo, favicon, dan warna aksen langsung berlaku pada seluruh halaman tanpa muat ulang."
              icon={Layers}
              action={
                canUpdate ? <Badge tone="success" dot>Bisa diubah</Badge> : <Badge tone="neutral">Hanya baca</Badge>
              }
            />
            <CardBody>{canUpdate ? <SettingsForm /> : <ReadOnlyNotice />}</CardBody>
          </Card>
        </Reveal>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <Reveal>
            <Card className="overflow-hidden">
              <CardHeader
                title="Skema Database Supabase"
                subtitle="Jalankan berkas supabase/schema.sql pada SQL Editor untuk mengaktifkan tabel, fungsi, pemicu, dan kebijakan RLS."
                icon={Database}
                action={
                  <Button size="xs" variant="secondary" onClick={() => navigator.clipboard?.writeText(schemaSql).then(() => toast.success("Skema SQL disalin ke papan klip."), () => toast.warning("Peramban menolak akses papan klip."))}>
                    Salin SQL
                  </Button>
                }
              />
              <CardBody className="space-y-3">
                <ol className="space-y-2.5 text-[13px] leading-relaxed text-slate-600">
                  {[
                    "Buat proyek Supabase lalu buka SQL Editor → New query.",
                    "Tempel isi supabase/schema.sql (16 bagian) dan klik RUN.",
                    "Buat akun petugas melalui Authentication → Users.",
                    "Naikkan akun pertama menjadi Admin Pusat memakai UPDATE pada baris terakhir skema.",
                    "Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY, lalu jalankan ulang aplikasi.",
                  ].map((step, i) => (
                    <li key={step} className="flex gap-2.5">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-brand-50 font-mono text-[11px] font-bold text-brand-700">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
                <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-3"><p className="text-xs font-semibold text-slate-700">Memperbarui instalasi yang sudah ada?</p><p className="mt-1 text-[11px] leading-relaxed text-slate-500">Jalankan hanya migrasi layanan air agar data pelanggan tetap tersimpan. Untuk administrasi akun cloud, terapkan Edge Function manage-users sesuai README.md.</p><Button type="button" variant="secondary" size="xs" className="mt-3" onClick={() => navigator.clipboard.writeText(waterMigration).then(() => toast.success("Migrasi layanan air disalin."), () => toast.error("Migrasi tidak dapat disalin. Buka berkas pada folder supabase/migrations."))}>Salin migrasi layanan air</Button></div>
                <div className="rounded-lg border border-slate-200 bg-ink-900 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <Terminal className="h-3.5 w-3.5" aria-hidden /> .env
                  </p>
                  <pre className="overflow-x-auto font-mono text-[12px] leading-relaxed text-slate-200">
{`VITE_SUPABASE_URL=https://<projek-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>`}
                  </pre>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSql((v) => !v)}
                  className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-[12.5px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  {showSql ? "Sembunyikan" : "Lihat"} seluruh berkas schema.sql ({schemaSql.split("\n").length} baris)
                </button>
                {showSql ? (
                  <pre className="no-scrollbar max-h-[420px] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[11.5px] leading-relaxed text-slate-600">
                    {schemaSql}
                  </pre>
                ) : null}
              </CardBody>
            </Card>
          </Reveal>

          <Reveal delay={80}>
            <Card className="overflow-hidden">
              <CardHeader title="Kondisi Lingkungan" subtitle="Status koneksi basis data yang sedang dipakai aplikasi." icon={ShieldAlert} />
              <CardBody className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-slate-800">{isDemoMode ? "Mode Demo Lokal" : "Terhubung Supabase Cloud"}</p>
                    <Badge tone={isDemoMode ? "warning" : "success"} dot>
                      {isDemoMode ? "localStorage" : "Supabase Cloud"}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">
                    {isDemoMode
                      ? "Data simulasi disimpan di perangkat ini. Pembatasan antarmuka dapat dicoba, tetapi keamanan database dan kebijakan RLS harus diuji pada proyek Supabase tersendiri sebelum produksi."
                      : "Klien memakai proyek Supabase Anda. Kebijakan Row Level Security menentukan baris yang dapat dibaca dan ditulis setiap peran."}
                  </p>
                </div>
                <ul className="space-y-2 text-[12.5px] text-slate-600">
                  {[
                    ["Tabel operasional", "registrations, repair_orders, status_history"],
                    ["Tabel tata kelola", "roles, permissions, profiles, app_settings, workflow_statuses, activity_logs"],
                    ["Storage buckets", "app-assets (publik) & attachments (privat)"],
                    ["Fungsi kunci", "is_admin_pusat(), has_module_permission(), next_ticket_number()"],
                  ].map(([label, value]) => (
                    <li key={label} className="flex flex-col gap-0.5 border-b border-dashed border-slate-100 pb-2 last:border-0">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
                      <span className="font-mono text-[11.5px] text-slate-700">{value}</span>
                    </li>
                  ))}
                </ul>
                {isDemoMode ? (
                  <Button variant="danger" size="sm" icon={Trash2} className="w-full" onClick={resetDemo}>
                    Reset Seluruh Data Demo
                  </Button>
                ) : (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-500">
                    Reset data dinonaktifkan pada lingkungan cloud. Gunakan SQL Editor untuk pembersihan data uji.
                  </p>
                )}
              </CardBody>
            </Card>
          </Reveal>
        </div>
      )}
    </div>
  );
}

function ReadOnlyNotice() {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px] leading-relaxed text-slate-600">
      Peran Anda hanya memiliki izin <span className="font-semibold">baca</span> pada modul pengaturan. Formulir diubah dan
      disimpan hanya oleh Admin Pusat atau peran dengan <span className="font-mono text-[12px]">can_update</span> pada modul
      “pengaturan”.
    </div>
  );
}

export default SettingsPage;
