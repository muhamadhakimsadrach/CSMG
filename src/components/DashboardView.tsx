import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Droplets,
  ClipboardList,
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Database,
  Building,
  ShieldCheck,
  PlusCircle,
  FileText,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    registrations,
    repairOrders,
    setActiveView,
    tiDBConnected,
    tiDBLatency,
    currentUser,
    currentRole,
    can,
  } = useApp();

  const totalReg = registrations.length;
  const pendingReg = registrations.filter((r) => r.status.includes('Diterima') || r.status.includes('Survei')).length;
  const installedReg = registrations.filter((r) => r.status.includes('Pemasangan') || r.status.includes('Aktif')).length;

  const totalRepairs = repairOrders.length;
  const openRepairs = repairOrders.filter((r) => r.status !== 'Selesai').length;
  const resolvedRepairs = repairOrders.filter((r) => r.status === 'Selesai').length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Hero Banner with TiDB Cloud Info */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-900 via-sky-800 to-cyan-900 text-white p-6 sm:p-8 shadow-xl shadow-sky-900/10 border border-sky-700/40">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-200 text-xs font-semibold backdrop-blur-xs border border-sky-400/20 mb-3">
              <Database className="w-3.5 h-3.5 text-sky-300" />
              <span>TiDB Cloud MySQL Online &bull; Latensi {tiDBLatency}ms</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Selamat datang, {currentUser.name}
            </h1>
            <p className="text-sky-100/80 text-sm mt-1 max-w-xl">
              Portal operasional resmi PT Aetra Air Tangerang. Semua transaksi tersimpan langsung secara realtime pada basis data cloud TiDB MySQL.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {can('pendaftaran', 'create') && (
              <button
                onClick={() => setActiveView('pendaftaran')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-sky-900 font-bold text-xs hover:bg-sky-50 shadow-md transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-sky-600" />
                <span>Pendaftaran Baru</span>
              </button>
            )}
            {can('repair', 'create') && (
              <button
                onClick={() => setActiveView('repair')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-700/80 hover:bg-sky-700 text-white font-semibold text-xs border border-sky-500/30 transition-all active:scale-95"
              >
                <Wrench className="w-4 h-4 text-sky-300" />
                <span>Laporkan Gangguan</span>
              </button>
            )}
          </div>
        </div>

        {/* Database Connection Specs */}
        <div className="mt-6 pt-5 border-t border-sky-700/40 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <p className="text-sky-300/70 font-medium text-[11px]">Database Engine</p>
            <p className="font-bold text-white mt-0.5">TiDB MySQL 8.0</p>
          </div>
          <div>
            <p className="text-sky-300/70 font-medium text-[11px]">Cluster Endpoint</p>
            <p className="font-bold text-white mt-0.5 truncate" title="gateway01.ap-southeast-1.prod.aws.tidbcloud.com">
              gateway01.aws.tidb...
            </p>
          </div>
          <div>
            <p className="text-sky-300/70 font-medium text-[11px]">Port & Enkripsi</p>
            <p className="font-bold text-white mt-0.5">4000 (TLS/SSL Enforced)</p>
          </div>
          <div>
            <p className="text-sky-300/70 font-medium text-[11px]">Status Sinkronisasi</p>
            <p className="font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Realtime Sync Aktif
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Sambungan
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{totalReg}</span>
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Aktif di TiDB
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {pendingReg} dalam proses survei/verifikasi
          </p>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tiket Perbaikan
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{totalRepairs}</span>
            <span className="text-xs font-medium text-amber-600">
              {openRepairs} tiket terbuka
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {resolvedRepairs} tiket telah selesai ditangani
          </p>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tingkat SLA Layanan
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">98.4%</span>
            <span className="text-xs font-medium text-emerald-600">&plusmn; 24 Jam SLA</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Sesuai standar operasional Aetra Tangerang
          </p>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Peran Anda
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-base font-extrabold text-slate-900 truncate">
              {currentRole.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 truncate">
            {currentRole.division}
          </p>
        </div>
      </div>

      {/* Grid: Registrations & Repairs lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registrations */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Pendaftaran Terbaru (TiDB)</h3>
              <p className="text-xs text-slate-500">Sambungan baru yang terdaftar di basis data</p>
            </div>
            <button
              onClick={() => setActiveView('pendaftaran')}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto divide-y divide-slate-100">
            {registrations.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada pendaftaran di TiDB Cloud.
              </div>
            ) : (
              registrations.slice(0, 5).map((reg) => (
                <div key={reg.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 text-xs truncate">
                        {reg.customer_name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {reg.ticket_number}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{reg.address}</p>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
                    {reg.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Repairs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Gangguan & Perbaikan Air</h3>
              <p className="text-xs text-slate-500">Tiket pengaduan kebocoran & perbaikan pipa</p>
            </div>
            <button
              onClick={() => setActiveView('repair')}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto divide-y divide-slate-100">
            {repairOrders.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada laporan gangguan di TiDB Cloud.
              </div>
            ) : (
              repairOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 text-xs truncate">
                        {order.title || order.repair_category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {order.ticket_number}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {order.customer_name} &bull; {order.location_address}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      order.status === 'Selesai'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : order.priority === 'High' || order.priority === 'Emergency'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
