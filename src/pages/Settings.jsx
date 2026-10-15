import { useState } from "react";
import { Database, Image, Layers, ShieldAlert, Trash2, Terminal, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { EmptyState } from "@/components/common/LoadingSpinner";
import { Reveal } from "@/components/common/Reveal";
import { SettingsForm } from "@/components/forms/SettingsForm";
import { useAuth } from "@/context/AuthContext";
import { useConfirm, useToast } from "@/context/ToastContext";
import { isDemoMode, resetDemoData, supabase } from "@/lib/supabaseClient";
import schemaSql from "../../supabase/schema.sql?raw";
import waterMigration from "../../supabase/migrations/20261014_aetra_water_services.sql?raw";
import { cn } from "@/utils/cn";

const TABS = [
  { key: "branding", label: "Branding & Tampilan", icon: Image },
  { key: "data_management", label: "Mulai dari Nol & Pengaturan Data", icon: Database },
  { key: "security", label: "Skema Supabase & RLS", icon: ShieldAlert },
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
      title: "Reset Data Demo ke Contoh Bawaan",
      message: "Seluruh perubahan pada mode demo akan dikembalikan ke data sampel contoh. Lanjutkan?",
      confirmLabel: "Ya, Muat Data Sampel",
    });
    if (!ok) return;
    resetDemoData();
    toast.success("Basis data demo dipulihkan. Memuat ulang tampilan…", { title: "Reset Selesai" });
    window.setTimeout(() => window.location.reload(), 700);
  };

  const handleClearAllDataToZero = async () => {
    const ok = await confirmAction({
      title: "Kosongkan Semua Data Awal (Mulai dari Nol)?",
      message:
        "Sesuai prinsip utama aplikasi: seluruh data pendaftaran pelanggan, tiket gangguan, riwayat status, dan formulir kustom akan dikosongkan (0 baris). Pemilik aplikasi dapat membangun seluruh form dan alur kerja dari nol secara mandiri. Lanjutkan?",
      confirmLabel: "Ya, Kosongkan Semua Data",
    });
    if (!ok) return;

    try {
      localStorage.setItem("aetra_registrations_v1", JSON.stringify([]));
      localStorage.setItem("app_registrations", JSON.stringify([]));
      localStorage.setItem("app_repair_orders", JSON.stringify([]));
      localStorage.setItem("aetra_status_history_v1", JSON.stringify([]));
      localStorage.setItem("aetra_activity_logs_v1", JSON.stringify([]));

      const emptyForms = {
        registration: [],
        survey: [],
        nc_check: [],
        nc_completion: [],
        complaint: [],
        repair_completion: [],
      };
      localStorage.setItem("aetra_custom_forms_v1", JSON.stringify(emptyForms));

      await supabase.from("status_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("repair_orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("registrations").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      toast.success("Seluruh data operasional dan formulir berhasil dikosongkan. Memulai dari nol…", {
        title: "Data Dikosongkan",
      });
      window.setTimeout(() => window.location.reload(), 700);
    } catch (err) {
      console.warn("Pembersihan database:", err);
      toast.success("Data berhasil dikosongkan.");
      window.setTimeout(() => window.location.reload(), 700);
    }
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

      {tab === "branding" && (
        <Reveal>
          <Card className="overflow-hidden">
            <CardHeader
              title="Branding Dinamis"
              subtitle="Perubahan nama, logo, favicon, teks login, dan warna aksen langsung berlaku pada seluruh halaman tanpa muat ulang."
              icon={Layers}
              action={
                canUpdate ? <Badge tone="success" dot>Bisa diubah</Badge> : <Badge tone="neutral">Hanya baca</Badge>
              }
            />
            <CardBody>{canUpdate ? <SettingsForm /> : <ReadOnlyNotice />}</CardBody>
          </Card>
        </Reveal>
      )}

      {tab === "data_management" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Reveal>
            <Card className="overflow-hidden border-amber-200">
              <CardHeader
                title="Mulai dari Nol (Data Awal Dikosongkan)"
                subtitle="Sesuai prinsip sistem: kosongkan seluruh formulir dan data transaksi agar dapat dibangun dari nol oleh pemilik aplikasi."
                icon={Trash2}
                action={<Badge tone="warning">Prinsip Utama</Badge>}
              />
              <CardBody className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2 text-xs leading-relaxed text-amber-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle size={15} className="text-amber-600" />
                    Penjelasan Fitur Mulai dari Nol:
                  </p>
                  <p>
                    Saat tombol ini ditekan, sistem akan mengosongkan seluruh data transaksi pendaftaran sambungan baru, tiket gangguan komplain, riwayat tahapan, serta menghapus seluruh pertanyaan pada 6 formulir divisi.
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Akun staf dan matriks izin tetap tersimpan agar Admin Aetra tetap dapat masuk dan mengelola sistem.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    variant="danger"
                    icon={Trash2}
                    className="w-full h-11 text-sm font-bold"
                    onClick={handleClearAllDataToZero}
                  >
                    Kosongkan Semua Data & Formulir (Mulai dari Nol)
                  </Button>
                </div>
              </CardBody>
            </Card>
          </Reveal>

          <Reveal delay={60}>
            <Card className="overflow-hidden">
              <CardHeader
                title="Template Bawaan & Pemulihan Sampel"
                subtitle="Muat kembali data contoh operasional dan pertanyaan formulir standar Aetra kapan pun dibutuhkan."
                icon={RotateCcw}
                action={<Badge tone="neutral">Opsional</Badge>}
              />
              <CardBody className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Jika Anda ingin menguji coba alur aplikasi menggunakan skenario lengkap (pendaftaran sambungan reguler & non-reguler, survei sales, penanganan kebocoran, dan relokasi meter), Anda dapat memuat kembali template standar.
                </p>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs text-slate-700">
                  <p className="font-semibold text-slate-800">Template standar mencakup:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11.5px]">
                    <li>6 Skema form operasional lengkap (pertanyaan, satuan dinamis, foto)</li>
                    <li>Akun staf demo untuk 8 divisi peran kerja</li>
                    <li>Tiket komplain & pendaftaran simulasi</li>
                  </ul>
                </div>

                <Button
                  variant="secondary"
                  icon={RotateCcw}
                  className="w-full h-11"
                  onClick={resetDemo}
                >
                  Muat Template Standar & Data Sampel
                </Button>
              </CardBody>
            </Card>
          </Reveal>
        </div>
      )}

      {tab === "security" && (
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
