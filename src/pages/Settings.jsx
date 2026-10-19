import { useState, useEffect } from "react";
import { Database, Image, Layers, ShieldAlert, Trash2, Terminal, AlertTriangle, RotateCcw, CheckCircle2, XCircle, RefreshCw, KeyRound, ExternalLink, Copy, Check, Radio } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { EmptyState } from "@/components/common/LoadingSpinner";
import { Reveal } from "@/components/common/Reveal";
import { SettingsForm } from "@/components/forms/SettingsForm";
import { useAuth } from "@/context/AuthContext";
import { useConfirm, useToast } from "@/context/ToastContext";
import { resetDemoData, supabase } from "@/lib/supabaseClient";
import { cn } from "@/utils/cn";

const TABS = [
  { key: "branding", label: "Branding & Tampilan", icon: Image },
  { key: "data_management", label: "Mulai dari Nol & Pengaturan Data", icon: Database },
];

/**
 * MODUL C - Pusat Pengaturan & Administrator: branding dinamis dan utilitas data.
 * Integrasi Supabase Realtime telah dikunci dan berjalan otomatis di tingkat sistem.
 */
export function SettingsPage() {
  const { can, isAdmin } = useAuth();
  const toast = useToast();
  const confirmAction = useConfirm();
  const [tab, setTab] = useState("branding");

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

    toast.success("Data transaksi berhasil dihapus. Akun dan formulir tetap tersimpan.");
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
