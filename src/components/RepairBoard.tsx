import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RepairOrder } from '../types';
import { REPAIR_CATEGORIES } from '../lib/waterDomain';
import {
  Wrench,
  Search,
  Filter,
  Plus,
  Eye,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Phone,
  MapPin,
  X,
  User,
  ShieldAlert,
} from 'lucide-react';

export const RepairBoard: React.FC = () => {
  const { repairOrders, addRepairOrder, updateRepairOrder, deleteRepairOrder, can } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<RepairOrder | null>(null);

  const [form, setForm] = useState({
    title: '',
    customer_name: '',
    phone_number: '',
    location_address: '',
    repair_category: REPAIR_CATEGORIES[0],
    issue_description: '',
    priority: 'Medium' as RepairOrder['priority'],
    assigned_division: 'Minor Repair',
  });

  const filteredOrders = repairOrders.filter((o) => {
    const matchSearch =
      o.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.ticket_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.location_address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchPriority = priorityFilter === 'ALL' || o.priority === priorityFilter;
    return matchSearch && matchPriority;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name || !form.phone_number || !form.location_address) return;

    const random4 = Math.floor(1000 + Math.random() * 9000);
    const ticketNo = `REP-2026-${random4}`;
    const custNo = `PLG-2026-${random4}`;

    await addRepairOrder({
      ticket_number: ticketNo,
      customer_number: custNo,
      customer_name: form.customer_name,
      phone_number: form.phone_number,
      location_address: form.location_address,
      repair_category: form.repair_category,
      title: form.title || form.repair_category,
      issue_description: form.issue_description,
      priority: form.priority,
      status: 'Tiket Dibuat',
      assigned_division: form.assigned_division,
      sla_hours: form.priority === 'Emergency' ? 4 : form.priority === 'High' ? 12 : 24,
    });

    setForm({
      title: '',
      customer_name: '',
      phone_number: '',
      location_address: '',
      repair_category: REPAIR_CATEGORIES[0],
      issue_description: '',
      priority: 'Medium',
      assigned_division: 'Minor Repair',
    });
    setIsModalOpen(false);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    await updateRepairOrder(id, { status: newStatus });
    if (selectedOrder && selectedOrder.id === id) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-amber-600" />
            <span>Manajemen Gangguan & Perbaikan Pipa (TiDB)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Lacak keluhan kebocoran pipa, kualitas air, dan disposisi ke tim teknisi lapangan.
          </p>
        </div>

        {can('repair', 'create') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Laporkan Gangguan Air</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari tiket, judul, alamat gangguan..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          >
            <option value="ALL">Semua Prioritas</option>
            <option value="Emergency">Emergency</option>
            <option value="High">Tinggi (High)</option>
            <option value="Medium">Sedang (Medium)</option>
            <option value="Low">Rendah (Low)</option>
          </select>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            Belum ada tiket gangguan air yang sesuai filter.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isEmergency = order.priority === 'Emergency';
            const isHigh = order.priority === 'High';
            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {order.ticket_number}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        isEmergency
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : isHigh
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {order.priority}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-3 line-clamp-1">
                    {order.title || order.repair_category}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {order.issue_description || 'Pengaduan keluhan pelanggan terkait instalasi perpipaan.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{order.customer_name} ({order.phone_number})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{order.location_address}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                      order.status === 'Selesai'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {order.status}
                  </span>

                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Detail</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: New Repair Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Laporkan Gangguan & Perbaikan Air</h3>
                  <p className="text-[11px] text-slate-500">Tersimpan langsung di TiDB MySQL</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kategori Gangguan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.repair_category}
                  onChange={(e) => setForm({ ...form, repair_category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  {REPAIR_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Pelapor <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    placeholder="Nama warga / pelanggan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    No. Handphone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.phone_number}
                    onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Lokasi / Alamat Kejadian <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.location_address}
                  onChange={(e) => setForm({ ...form, location_address: e.target.value })}
                  placeholder="Jl. Raya Curug KM 3 No. 45"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tingkat Prioritas</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="Emergency">Emergency (Pipa Utama Bocor)</option>
                    <option value="High">Tinggi (Air Mati Total)</option>
                    <option value="Medium">Sedang (Meter Rusak / Rembes)</option>
                    <option value="Low">Rendah (Pemeriksaan Segel)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Disposisi Tim</label>
                  <select
                    value={form.assigned_division}
                    onChange={(e) => setForm({ ...form, assigned_division: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="Minor Repair">Minor Repair</option>
                    <option value="New Connection">New Connection</option>
                    <option value="Transmisi & Distribusi">Transmisi & Distribusi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi Masalah</label>
                <textarea
                  rows={2}
                  value={form.issue_description}
                  onChange={(e) => setForm({ ...form, issue_description: e.target.value })}
                  placeholder="Air menyembur ke aspal sejak pagi..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md shadow-amber-600/20 transition-all"
                >
                  Kirim ke TiDB Cloud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detail Repair Order & Update Status */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                  {selectedOrder.ticket_number}
                </span>
                <h3 className="font-bold text-slate-900 text-base mt-1">
                  {selectedOrder.title || selectedOrder.repair_category}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-slate-400 text-[10px]">Pelapor</p>
                  <p className="font-bold text-slate-800">{selectedOrder.customer_name}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">No. Telepon</p>
                  <p className="font-bold text-slate-800">{selectedOrder.phone_number}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Prioritas</p>
                  <p className="font-bold text-slate-800">{selectedOrder.priority}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Divisi Teknisi</p>
                  <p className="font-bold text-slate-800">{selectedOrder.assigned_division}</p>
                </div>
              </div>

              <div>
                <p className="text-slate-400 text-[10px]">Lokasi Kerusakan</p>
                <p className="font-medium text-slate-800 mt-0.5">{selectedOrder.location_address}</p>
              </div>

              <div>
                <p className="text-slate-400 text-[10px]">Deskripsi Keluhan</p>
                <p className="text-slate-700 mt-0.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {selectedOrder.issue_description || 'Tidak ada catatan tambahan.'}
                </p>
              </div>

              {/* Status Stepper */}
              <div>
                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-2">
                  Ubah Status Perbaikan (Sinkronisasi TiDB MySQL):
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {['Tiket Dibuat', 'Penugasan Teknisi', 'Perbaikan Lapangan', 'Selesai'].map((st) => {
                    const isCurrent = selectedOrder.status === st;
                    return (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(selectedOrder.id, st)}
                        className={`p-2 rounded-xl text-left border text-xs font-semibold transition-all ${
                          isCurrent
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-amber-400'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={async () => {
                  await deleteRepairOrder(selectedOrder.id);
                  setSelectedOrder(null);
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
              >
                Hapus Tiket
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 text-slate-800 text-xs font-semibold hover:bg-slate-300"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
