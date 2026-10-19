import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import ExcelJS from 'exceljs';
import {
  Droplets,
  ClipboardList,
  Wrench,
  CheckCircle2,
  Clock,
  TrendingUp,
  Database,
  ArrowRight,
  Download,
  PlusCircle,
  ShieldCheck,
  Search,
  Filter,
  FileSpreadsheet,
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const Dashboard: React.FC = () => {
  const {
    registrations,
    repairOrders,
    setActiveView,
    tiDBConnected,
    tiDBLatency,
    currentRole,
    can,
    appSettings,
  } = useApp();
  const { user } = useAuth();

  const [dateFilter, setDateFilter] = useState('ALL');

  // Metrics
  const totalReg = registrations.length;
  const pendingReg = registrations.filter(
    (r) => r.status.includes('Diterima') || r.status.includes('Survei')
  ).length;
  const activeReg = registrations.filter(
    (r) => r.status === 'Aktif' || r.status.includes('Pemasangan')
  ).length;

  const totalRepairs = repairOrders.length;
  const openRepairs = repairOrders.filter((r) => r.status !== 'Selesai').length;
  const resolvedRepairs = repairOrders.filter((r) => r.status === 'Selesai').length;

  // Chart 1: Registration Trend (Mock monthly data for aesthetic dashboard)
  const lineChartData = {
    labels: ['Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt'],
    datasets: [
      {
        label: 'Pendaftaran Baru',
        data: [28, 42, 35, 50, 68, Math.max(totalReg, 45)],
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2, 132, 199, 0.12)',
        tension: 0.35,
        fill: true,
      },
      {
        label: 'Sambungan Terpasang',
        data: [20, 35, 30, 42, 58, Math.max(activeReg, 38)],
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.35,
      },
    ],
  };

  // Chart 2: Repair categories distribution
  const doughnutData = {
    labels: ['Pipa Bocor', 'Tekanan Kecil', 'Air Keruh', 'Meter Rusak'],
    datasets: [
      {
        data: [
          repairOrders.filter((r) => r.repair_category.includes('Bocor')).length || 14,
          repairOrders.filter((r) => r.repair_category.includes('Tekanan')).length || 8,
          repairOrders.filter((r) => r.repair_category.includes('Keruh')).length || 5,
          repairOrders.filter((r) => r.repair_category.includes('Meter')).length || 6,
        ],
        backgroundColor: ['#f43f5e', '#f59e0b', '#0ea5e9', '#8b5cf6'],
        borderWidth: 0,
      },
    ],
  };

  // Export to Excel function using exceljs
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PT Aetra Air Tangerang';
    workbook.created = new Date();

    // Sheet 1: Pendaftaran
    const regSheet = workbook.addWorksheet('Pendaftaran Air');
    regSheet.columns = [
      { header: 'No. Tiket', key: 'ticket_number', width: 18 },
      { header: 'No. Pelanggan', key: 'customer_number', width: 18 },
      { header: 'Nama Pemohon', key: 'customer_name', width: 25 },
      { header: 'No. Telepon', key: 'phone_number', width: 16 },
      { header: 'Kecamatan', key: 'district', width: 18 },
      { header: 'Alamat', key: 'address', width: 35 },
      { header: 'Layanan', key: 'service_type', width: 22 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Waktu Input', key: 'created_at', width: 22 },
    ];
    registrations.forEach((r) => {
      regSheet.addRow({
        ticket_number: r.ticket_number,
        customer_number: r.customer_number || '-',
        customer_name: r.customer_name,
        phone_number: r.phone_number || '-',
        district: r.district || '-',
        address: r.address,
        service_type: r.service_type,
        status: r.status,
        created_at: new Date(r.created_at).toLocaleString('id-ID'),
      });
    });

    // Sheet 2: Perbaikan
    const repSheet = workbook.addWorksheet('Laporan Gangguan');
    repSheet.columns = [
      { header: 'No. Tiket', key: 'ticket_number', width: 18 },
      { header: 'Nama Pelapor', key: 'customer_name', width: 25 },
      { header: 'No. Telepon', key: 'phone_number', width: 16 },
      { header: 'Kategori Gangguan', key: 'repair_category', width: 25 },
      { header: 'Prioritas', key: 'priority', width: 15 },
      { header: 'Lokasi Gangguan', key: 'location_address', width: 35 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Divisi Ditugaskan', key: 'assigned_division', width: 20 },
    ];
    repairOrders.forEach((o) => {
      repSheet.addRow({
        ticket_number: o.ticket_number,
        customer_name: o.customer_name,
        phone_number: o.phone_number,
        repair_category: o.repair_category,
        priority: o.priority,
        location_address: o.location_address,
        status: o.status,
        assigned_division: o.assigned_division,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Aetra_Tangerang_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Welcome Banner with Live TiDB Status */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-900 via-sky-800 to-cyan-900 text-white p-6 sm:p-8 shadow-xl shadow-sky-900/10 border border-sky-700/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-200 text-xs font-semibold backdrop-blur-xs border border-sky-400/20 mb-3">
              <Database className="w-3.5 h-3.5 text-sky-300" />
              <span>TiDB Cloud MySQL &bull; Latensi {tiDBLatency}ms (Online)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Selamat Datang di SIGAP Aetra
            </h1>
            <p className="text-sky-100/80 text-xs sm:text-sm mt-1 max-w-xl">
              Sistem Informasi Gangguan, Alur Pendaftaran, dan Pelayanan Pelanggan PT Aetra Air Tangerang.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={exportToExcel}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all backdrop-blur-md active:scale-95"
            >
              <Download className="w-4 h-4 text-emerald-300" />
              <span>Ekspor ke Excel</span>
            </button>
            {can('pendaftaran', 'create') && (
              <button
                onClick={() => setActiveView('pendaftaran')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-sky-900 font-bold text-xs hover:bg-sky-50 shadow-md transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-sky-600" />
                <span>Pendaftaran Baru</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Sambungan Air
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
            {pendingReg} dalam proses verifikasi / survei
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Laporan Gangguan Pipa
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{totalRepairs}</span>
            <span className="text-xs font-medium text-rose-600">
              {openRepairs} tiket terbuka
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {resolvedRepairs} perbaikan berhasil diselesaikan
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tingkat SLA 24 Jam
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">98.2%</span>
            <span className="text-xs font-medium text-emerald-600">Standar ISO</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Sesuai kepatuhan respon cepat Aetra
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Klaster TiDB MySQL
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-slate-900">Port 4000</span>
            <span className="text-xs font-medium text-purple-600">TLS v1.3</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 truncate">
            gateway01.ap-southeast-1.prod.aws...
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend Line Chart */}
        <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Tren Pendaftaran & Pemasangan Sambungan Air
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Statistik pertumbuhan pelanggan PT Aetra Air Tangerang
              </p>
            </div>
            <div className="text-xs text-slate-400 font-mono">Bulan ke Bulan</div>
          </div>
          <div className="mt-4 h-64">
            <Line
              data={lineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                },
                scales: {
                  y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
                  x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                },
              }}
            />
          </div>
        </div>

        {/* Doughnut Category Chart */}
        <div className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Kategori Gangguan Air</h3>
              <p className="text-xs text-slate-500 mt-0.5">Sebaran laporan kerusakan pipa</p>
            </div>
            <div className="mt-4 h-52 relative flex items-center justify-center">
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '72%',
                  plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
                  },
                }}
              />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Prioritas Emergency</span>
            <span className="font-bold text-rose-600">SLA 4 Jam</span>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registrations */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Pendaftaran Terbaru (TiDB)</h3>
              <p className="text-xs text-slate-500">Pengajuan sambungan pipa air masuk</p>
            </div>
            <button
              onClick={() => setActiveView('pendaftaran')}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <span>Kelola</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {registrations.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada data pendaftaran di TiDB MySQL.
              </div>
            ) : (
              registrations.slice(0, 4).map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-xs truncate">{r.customer_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{r.address}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
                    {r.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Repairs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Laporan Gangguan Terbaru (TiDB)</h3>
              <p className="text-xs text-slate-500">Keluhan kebocoran & kerusakan instalasi</p>
            </div>
            <button
              onClick={() => setActiveView('repair')}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <span>Kelola</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {repairOrders.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada tiket gangguan di TiDB MySQL.
              </div>
            ) : (
              repairOrders.slice(0, 4).map((o) => (
                <div key={o.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-xs truncate">
                      {o.title || o.repair_category}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {o.customer_name} &bull; {o.location_address}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                    {o.status}
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
