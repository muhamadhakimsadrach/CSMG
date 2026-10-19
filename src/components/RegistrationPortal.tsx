import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Registration } from '../types';
import { SERVICE_TYPES, SERVICE_DISTRICTS } from '../lib/waterDomain';
import {
  ClipboardList,
  Search,
  Filter,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  Calendar,
  X,
  CreditCard,
  UserCheck,
  FileText,
} from 'lucide-react';

export const RegistrationPortal: React.FC = () => {
  const { registrations, addRegistration, updateRegistration, deleteRegistration, can } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);

  // New Registration Form state
  const [form, setForm] = useState({
    customer_name: '',
    identity_number: '',
    phone_number: '',
    service_type: SERVICE_TYPES[0],
    district: SERVICE_DISTRICTS[0],
    address: '',
    notes: '',
  });

  const filteredRegistrations = registrations.filter((r) => {
    const matchSearch =
      r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.ticket_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name || !form.phone_number || !form.address) return;

    const random4 = Math.floor(1000 + Math.random() * 9000);
    const ticketNo = `REG-2026-${random4}`;
    const custNo = `PLG-2026-${random4}`;

    await addRegistration({
      ticket_number: ticketNo,
      registration_no: ticketNo,
      customer_number: custNo,
      customer_name: form.customer_name,
      identity_number: form.identity_number || '3671000000000000',
      phone_number: form.phone_number,
      service_type: form.service_type,
      district: form.district,
      address: form.address,
      status: 'Pendaftaran Diterima',
      initial_payment_status: 'pending',
      initial_payment_amount: 1500000,
      non_regular_payment_status: 'pending',
      non_regular_payment_amount: 0,
      notes: form.notes,
    });

    setForm({
      customer_name: '',
      identity_number: '',
      phone_number: '',
      service_type: SERVICE_TYPES[0],
      district: SERVICE_DISTRICTS[0],
      address: '',
      notes: '',
    });
    setIsModalOpen(false);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    await updateRegistration(id, { status: newStatus });
    if (selectedReg && selectedReg.id === id) {
      setSelectedReg({ ...selectedReg, status: newStatus });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-sky-600" />
            <span>Pendaftaran Sambungan Baru (TiDB)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola pendaftaran sambungan air bersih, verifikasi berkas, dan penugasan survei teknis.
          </p>
        </div>

        {can('pendaftaran', 'create') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Form Pendaftaran Baru</span>
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
            placeholder="Cari tiket, nama, alamat..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="Pendaftaran Diterima">Pendaftaran Diterima</option>
            <option value="Survei Lokasi">Survei Lokasi</option>
            <option value="Menunggu Pembayaran">Menunggu Pembayaran</option>
            <option value="Pemasangan Meter">Pemasangan Meter</option>
            <option value="Aktif">Aktif</option>
          </select>
        </div>
      </div>

      {/* Table of Registrations */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">No. Tiket / Pelanggan</th>
                <th className="py-3 px-4">Nama Pemohon</th>
                <th className="py-3 px-4">Alamat & Kecamatan</th>
                <th className="py-3 px-4">Tipe Layanan</th>
                <th className="py-3 px-4">Status Alur</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ada pendaftaran yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-sky-700">{reg.ticket_number}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {reg.customer_number || '-'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <div>{reg.customer_name}</div>
                      <div className="text-[11px] text-slate-500 font-normal">{reg.phone_number}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="line-clamp-1 text-slate-700">{reg.address}</div>
                      <div className="text-[10px] text-slate-400">{reg.district}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700">
                        {reg.service_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          reg.status === 'Aktif'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : reg.status.includes('Pembayaran')
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {reg.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedReg(reg)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Registration Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-sky-50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Pendaftaran Sambungan Baru</h3>
                  <p className="text-[11px] text-slate-500">Data otomatis tersimpan di TiDB MySQL</p>
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
                  Nama Lengkap Pemohon <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. KTP / NIK</label>
                  <input
                    type="text"
                    value={form.identity_number}
                    onChange={(e) => setForm({ ...form, identity_number: e.target.value })}
                    placeholder="3671xxxxxxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    No. Handphone / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.phone_number}
                    onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipe Layanan</label>
                  <select
                    value={form.service_type}
                    onChange={(e) => setForm({ ...form, service_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  >
                    {SERVICE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kecamatan</label>
                  <select
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  >
                    {SERVICE_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alamat Lengkap Pemasangan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Jl. Raya Pasar Kemis No. 12, RT 02 / RW 05"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Patokan lokasi, no meter terdekat..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
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
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md shadow-sky-600/20 transition-all"
                >
                  Simpan ke TiDB Cloud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detail Registration & Status Progression */}
      {selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                  {selectedReg.ticket_number}
                </span>
                <h3 className="font-bold text-slate-900 text-base mt-1">
                  {selectedReg.customer_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReg(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-slate-400 text-[10px]">Nomor Pelanggan</p>
                  <p className="font-bold text-slate-800">{selectedReg.customer_number || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">No. Telepon</p>
                  <p className="font-bold text-slate-800">{selectedReg.phone_number}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Layanan Air</p>
                  <p className="font-bold text-slate-800">{selectedReg.service_type}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Kecamatan</p>
                  <p className="font-bold text-slate-800">{selectedReg.district || '-'}</p>
                </div>
              </div>

              <div>
                <p className="text-slate-400 text-[10px]">Alamat Pemasangan</p>
                <p className="font-medium text-slate-800 mt-0.5">{selectedReg.address}</p>
              </div>

              {/* Status Stepper */}
              <div>
                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-2">
                  Ubah Alur Status (Sinkronisasi TiDB MySQL):
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {['Pendaftaran Diterima', 'Survei Lokasi', 'Menunggu Pembayaran', 'Pemasangan Meter', 'Aktif'].map(
                    (st) => {
                      const isCurrent = selectedReg.status === st;
                      return (
                        <button
                          key={st}
                          onClick={() => handleUpdateStatus(selectedReg.id, st)}
                          className={`p-2 rounded-xl text-left border text-xs font-semibold transition-all ${
                            isCurrent
                              ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-sky-400'
                          }`}
                        >
                          {st}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={async () => {
                  await deleteRegistration(selectedReg.id);
                  setSelectedReg(null);
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
              >
                Hapus Tiket
              </button>
              <button
                onClick={() => setSelectedReg(null)}
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
