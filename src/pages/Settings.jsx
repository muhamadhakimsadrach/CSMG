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
import { cn } from "@/utils/cn";

const TABS = [
  { key: "branding", label: "Branding & Tampilan", icon: Image },
  { key: "data_management", label: "Mulai dari Nol & Pengaturan Data", icon: Database },
  { key: "security", label: "Integrasi TiDB MySQL & Database", icon: Database },
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
      title: "Kosongkan Data Transaksi?",
      message: "Seluruh data pendaftaran dan tiket perbaikan akan dihapus. Akun staf, data pelanggan, dan formulir kustom akan tetap tersimpan. Lanjutkan?",
      confirmLabel: "Ya, Hapus Data Transaksi",
    });
    if (!ok) return;

    // Daftar kunci data yang boleh dihapus
    const keysToRemove = [
      "app_registrations",
      "app_repair_orders",
      "aetra_status_history_v1",
      "aetra_activity_logs_v1",
      "aetra.db.v2",
      "aetra.session.v2"
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));

    toast.success("Data transaksi berhasil dihapus. Akun dan formulir tetap tersimpan.", {
      title: "Data Dikosongkan",
    });
    window.setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div className="space-y-5">
      <PageHeader
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
                title="Integrasi Database TiDB MySQL"
                subtitle="Konfigurasi koneksi database terpusat berbasis TiDB Cloud / Serverless MySQL untuk PT Aetra Air Tangerang."
                icon={Database}
              />
              <CardBody className="space-y-4">
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-xs font-bold text-emerald-800">TiDB MySQL Terhubung & Aktif</p>
                  </div>
                  <p className="mt-1.5 text-xs text-emerald-700 leading-relaxed">
                    Sistem menggunakan database relasional <strong>TiDB MySQL</strong>. Seluruh data registrasi, tiket perbaikan, dan akun staf tersimpan secara aman dan terpusat.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="text-xs font-bold text-slate-800">Langkah Mudah Menghubungkan TiDB MySQL:</p>
                  <ol className="space-y-2 text-xs text-slate-600 list-decimal pl-4">
                    <li>
                      <strong>Buat Cluster TiDB Cloud:</strong> Masuk ke <a href="https://tidbcloud.com" target="_blank" rel="noreferrer" className="text-brand-600 underline font-semibold">tidbcloud.com</a> dan buat cluster Serverless baru (gratis).
                    </li>
                    <li>
                      <strong>Salin Skema DDL:</strong> Buka tab <em>Skema Database TiDB MySQL</em> di menu samping, lalu klik <strong>Salin Skema SQL</strong>.
                    </li>
                    <li>
                      <strong>Eksekusi di SQL Editor:</strong> Buka menu SQL Editor di TiDB Cloud, tempel skrip tersebut, dan klik <strong>Run</strong> untuk membuat tabel secara otomatis.
                    </li>
                    <li>
                      <strong>Pasang Secret / .env:</strong> Masukkan kredensial host, port (4000), username, dan password ke dalam file `.env` aplikasi atau secret manager Anda.
                    </li>
                  </ol>
                </div>

                <div className="rounded-lg border border-slate-200 bg-ink-900 p-3.5">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <Terminal className="h-3.5 w-3.5" aria-hidden /> Konfigurasi Aktif TiDB MySQL (.env)
                  </p>
                  <pre className="overflow-x-auto font-mono text-[12px] leading-relaxed text-slate-200">
{`TIDB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
TIDB_PORT=4000
TIDB_USER=2CMVuLuG9k63iXm.root
TIDB_PASSWORD=OFBMKXukDxXav86B
TIDB_DATABASE=sys
TIDB_ENABLE_SSL=true`}
                  </pre>
                </div>
              </CardBody>
            </Card>
          </Reveal>

          <Reveal delay={80}>
            <Card className="overflow-hidden">
              <CardHeader title="Kondisi Lingkungan Basis Data" subtitle="Status tabel dan integritas data TiDB MySQL." icon={Database} />
              <CardBody className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-slate-800">TiDB Serverless MySQL</p>
                    <Badge tone="success" dot>
                      Aktif
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">
                    Koneksi database relational terpadu aktif. Data pelanggan, verifikasi CS, dan penugasan divisi teknis dikelola secara tersentralisasi.
                  </p>
                </div>
                <ul className="space-y-2 text-[12.5px] text-slate-600">
                  {[
                    ["Tabel operasional", "registrations, repair_orders, status_history"],
                    ["Tabel tata kelola", "roles, permissions, profiles, app_settings, workflow_statuses, activity_logs"],
                    ["Format ID Pelanggan", "PLG-XXXXXX (Reguler & Non-Reguler)"],
                    ["Fungsi kunci", "Otomasi nomor tiket, delegasi divisi, matriks izin role"],
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
