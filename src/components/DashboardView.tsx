import React from 'react';
import { useApp } from '../context/AppContext';
import {
  ClipboardCheck,
  Clock,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  GitFork,
  ClipboardList,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    currentUser,
    currentRole,
    registrations,
    repairOrders,
    setActiveView,
    can,
  } = useApp();

  // Metrics
  const totalRegistrations = registrations.length;
  const pendingVerification = registrations.filter(
    (r) => r.status === 'Menunggu Verifikasi' || r.status === 'Verifikasi Berkas'
  ).length;
  const activeRepairs = repairOrders.filter(
    (o) => o.status !== 'Selesai' && o.status !== 'Dibatalkan'
  ).length;
  const completedRepairs = repairOrders.filter((o) => o.status === 'Selesai').length;
  const completionRate =
    repairOrders.length > 0
      ? Math.round((completedRepairs / repairOrders.length) * 100)
      : 100;

  // Recent combined activity logs
  const recentRepairs = repairOrders.slice(0, 4);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 md:p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-500">Ringkasan Sistem Terpadu</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
              {currentRole.name}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Selamat Datang, {currentUser.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Pantau arus pendaftaran pelanggan, status penanganan tiket minor repair, dan efisiensi alur kerja divisi Anda secara real-time.
          </p>
        </div>

        {/* Quick action shortcuts */}
        <div className="flex items-center gap-2 shrink-0">
          {can('portal_pendaftaran', 'create') && (
            <button
              onClick={() => setActiveView('portal_pendaftaran')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-slate-600" />
              Pendaftaran Baru
            </button>
          )}

          {can('papan_repair', 'view') && (
            <button
              onClick={() => setActiveView('papan_repair')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              Buka Papan Repair
            </button>
          )}
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="p-4 md:p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Pendaftaran</span>
            <ClipboardCheck className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-slate-900 font-mono tabular-nums">
            {totalRegistrations}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Berkas terdaftar di sistem</p>
        </div>

        {/* Card 2 */}
        <div className="p-4 md:p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Perlu Verifikasi</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-slate-900 font-mono tabular-nums">
            {pendingVerification}
          </p>
          <p className="text-[11px] text-amber-600 font-medium mt-1">Menunggu pemeriksaan berkas</p>
        </div>

        {/* Card 3 */}
        <div className="p-4 md:p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Tiket Repair Aktif</span>
            <Wrench className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-slate-900 font-mono tabular-nums">
            {activeRepairs}
          </p>
          <p className="text-[11px] text-indigo-600 font-medium mt-1">Dalam pengerjaan teknisi</p>
        </div>

        {/* Card 4 */}
        <div className="p-4 md:p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Tingkat Selesai</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-slate-900 font-mono tabular-nums">
            {completionRate}%
          </p>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            {completedRepairs} perbaikan tuntas
          </p>
        </div>
      </div>

      {/* Alur Integrasi Operasional Terpadu (Unified Operational Flow) */}
      <div className="p-5 md:p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-900">
                Alur Integrasi Operasional Terpadu (Satu Pintu)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Menghubungkan secara seamless alur pendaftaran pelanggan baru dengan penugasan teknisi di papan repair dan kontrol workflow admin
            </p>
          </div>
          <button
            onClick={() => setActiveView('workflow_builder')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Kustomisasi Alur Kerja →</span>
          </button>
        </div>

        {/* 4 Connected Flow Nodes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative">
          {/* Node 1: Divisi Sales */}
          <div
            onClick={() => setActiveView('portal_pendaftaran')}
            className="p-4 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-200 hover:border-indigo-200 transition-all cursor-pointer space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Tahap 1 · Sales
              </span>
              <ClipboardList className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 transition-colors" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-900">
                Permohonan Masuk
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Input data pelanggan, pilihan paket & upload berkas identitas
              </p>
            </div>
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-slate-800 tabular-nums">
                {registrations.length} Terdaftar
              </span>
              <span className="text-indigo-600 text-[11px] font-semibold">Buka Portal →</span>
            </div>
          </div>

          {/* Node 2: Divisi Admin / CS */}
          <div
            onClick={() => setActiveView('portal_pendaftaran')}
            className="p-4 bg-slate-50 hover:bg-amber-50/50 rounded-xl border border-slate-200 hover:border-amber-200 transition-all cursor-pointer space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Tahap 2 · Admin & CS
              </span>
              <Clock className="w-4 h-4 text-amber-500 group-hover:text-amber-600 transition-colors" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-900">
                Verifikasi Berkas Legal
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pemeriksaan keabsahan KTP, NPWP, NIB & kelayakan izin lokasi
              </p>
            </div>
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-amber-700 tabular-nums">
                {pendingVerification} Perlu Cek
              </span>
              <span className="text-amber-700 text-[11px] font-semibold">Verifikasi →</span>
            </div>
          </div>

          {/* Node 3: Divisi Teknik */}
          <div
            onClick={() => setActiveView('papan_repair')}
            className="p-4 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-200 hover:border-indigo-200 transition-all cursor-pointer space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Tahap 3 · Teknik
              </span>
              <Wrench className="w-4 h-4 text-indigo-600 transition-colors" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-900">
                Papan Minor Repair / Pasang
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Penugasan teknisi, input suku cadang & tracking pengerjaan
              </p>
            </div>
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-indigo-700 tabular-nums">
                {activeRepairs} Tiket Berjalan
              </span>
              <span className="text-indigo-600 text-[11px] font-semibold">Papan Kerja →</span>
            </div>
          </div>

          {/* Node 4: Selesai & QC */}
          <div
            onClick={() => setActiveView('papan_repair')}
            className="p-4 bg-slate-50 hover:bg-emerald-50/50 rounded-xl border border-slate-200 hover:border-emerald-200 transition-all cursor-pointer space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Tahap 4 · Operasional
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 transition-colors" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                Layanan Aktif & QC Lolos
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Uji coba stabil, penutupan tiket & pencatatan garansi unit
              </p>
            </div>
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-emerald-700 tabular-nums">
                {completedRepairs} Tuntas
              </span>
              <span className="text-emerald-700 text-[11px] font-semibold">Lihat Riwayat →</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Analytics Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Box A: Status Pipeline Pendaftaran Pelanggan */}
        <div className="p-5 md:p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Alur Status Pendaftaran Pelanggan</h3>
              <p className="text-[11px] text-slate-500">Distribusi dokumen per tahapan verifikasi</p>
            </div>
            <button
              onClick={() => setActiveView('portal_pendaftaran')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              Buka Portal
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {['Menunggu Verifikasi', 'Verifikasi Berkas', 'Disetujui', 'Instalasi Lapangan'].map(
              (status) => {
                const count = registrations.filter((r) => r.status === status).length;
                const percentage =
                  totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0;
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{status}</span>
                      <span className="font-mono text-slate-500 tabular-nums">
                        {count} pelanggan ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-slate-800 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Box B: Prioritas & Kategori Minor Repair */}
        <div className="p-5 md:p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Beban Kerja Minor Repair</h3>
              <p className="text-[11px] text-slate-500">Pekerjaan teknisi menurut tingkat urgensi</p>
            </div>
            <button
              onClick={() => setActiveView('papan_repair')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              Lihat Kanban
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {[
              { label: 'Darurat', count: repairOrders.filter((r) => r.priority === 'Darurat').length, color: 'text-rose-700 bg-rose-50 border-rose-200' },
              { label: 'Tinggi', count: repairOrders.filter((r) => r.priority === 'Tinggi').length, color: 'text-amber-700 bg-amber-50 border-amber-200' },
              { label: 'Sedang', count: repairOrders.filter((r) => r.priority === 'Sedang').length, color: 'text-sky-700 bg-sky-50 border-sky-200' },
              { label: 'Rendah', count: repairOrders.filter((r) => r.priority === 'Rendah').length, color: 'text-slate-700 bg-slate-50 border-slate-200' },
            ].map((p) => (
              <div
                key={p.label}
                className={`p-3 rounded-lg border flex items-center justify-between ${p.color}`}
              >
                <div>
                  <span className="text-[11px] font-semibold block">{p.label}</span>
                  <span className="text-xl font-bold font-mono tabular-nums">{p.count}</span>
                </div>
                <AlertTriangle className="w-4 h-4 opacity-70" />
              </div>
            ))}
          </div>

          <div className="pt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100">
            <span>Teknisi Utama Aktif: Budi Santoso, S.T.</span>
            <span className="font-semibold text-slate-700">SLA Rata-rata: 14 Jam</span>
          </div>
        </div>
      </div>

      {/* Recent Repair Work & History Table */}
      <div className="p-5 md:p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Tiket Minor Repair Terkini</h3>
            <p className="text-[11px] text-slate-500">Perbaikan terbaru yang memerlukan perhatian teknisi</p>
          </div>
          <button
            onClick={() => setActiveView('papan_repair')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            Semua Tiket
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Responsive: Desktop Table, Mobile Cards */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold">No. Tiket</th>
                <th className="py-2.5 px-3 font-semibold">Pelanggan</th>
                <th className="py-2.5 px-3 font-semibold">Perangkat</th>
                <th className="py-2.5 px-3 font-semibold">Prioritas</th>
                <th className="py-2.5 px-3 font-semibold">Status Pengerjaan</th>
                <th className="py-2.5 px-3 font-semibold">Teknisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentRepairs.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => setActiveView('papan_repair')}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <td className="py-2.5 px-3 font-mono font-medium text-slate-900 tabular-nums">
                    {order.ticket_no}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">
                    {order.customer_name}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {order.unit_name}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        order.priority === 'Darurat'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : order.priority === 'Tinggi'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {order.priority}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-slate-800 font-medium">{order.status}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {order.assigned_technician || <span className="text-slate-400 italic">Belum ditugaskan</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden space-y-3">
          {recentRepairs.map((order) => (
            <div
              key={order.id}
              onClick={() => setActiveView('papan_repair')}
              className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 active:scale-[0.99] transition-transform cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs font-bold text-slate-900">{order.ticket_no}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    order.priority === 'Darurat'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {order.priority}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-800">{order.unit_name}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{order.customer_name}</p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 text-[11px]">
                <span className="text-slate-600 font-medium">{order.status}</span>
                <span className="text-indigo-600 font-medium">{order.assigned_technician || 'Belum ditugaskan'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
