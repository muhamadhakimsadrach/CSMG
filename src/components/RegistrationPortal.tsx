import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Registration, DocumentAttachment } from '../types';
import { uploadFileToStorage } from '../lib/supabaseClient';
import {
  Plus,
  Search,
  CheckCircle2,
  FileText,
  Upload,
  Check,
  X,
  Clock,
  ArrowRight,
  Wrench,
} from 'lucide-react';

export const RegistrationPortal: React.FC = () => {
  const {
    registrations,
    repairOrders,
    registrationStages,
    addRegistration,
    updateRegistrationStatus,
    dispatchRepairTicketFromRegistration,
    verifyDocument,
    can,
    currentUser,
    setActiveView,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [isVerifyingModalOpen, setIsVerifyingModalOpen] = useState(false);

  // Form State for new registration
  const [formData, setFormData] = useState({
    customer_name: '',
    identity_no: '',
    email: '',
    phone: '',
    service_type: 'Internet Broadband' as Registration['service_type'],
    package_plan: 'Corporate Ultra 300 Mbps',
    installation_address: '',
    notes: '',
  });

  const [uploadingDocs, setUploadingDocs] = useState<DocumentAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Filtered registrations
  const filteredRegistrations = registrations.filter((reg) => {
    const matchesSearch =
      reg.registration_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.phone.includes(searchQuery);
    const matchesStatus = statusFilter === 'ALL' || reg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle document upload in form
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docNameType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await uploadFileToStorage(file, 'documents');
      const newDoc: DocumentAttachment = {
        id: `doc_${Date.now()}`,
        name: `${docNameType}_${file.name}`,
        type: file.type,
        url: res.url,
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        verified: false,
        notes: res.isCloud ? 'Tersimpan di Supabase Storage' : 'Tersimpan secara lokal',
      };
      setUploadingDocs((prev) => [...prev, newDoc]);
    } finally {
      setIsUploading(false);
    }
  };

  // Submit new registration
  const handleSubmitRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name || !formData.identity_no || !formData.phone) {
      alert('Mohon lengkapi nama pelanggan, nomor identitas, dan nomor telepon.');
      return;
    }

    addRegistration({
      customer_name: formData.customer_name,
      identity_no: formData.identity_no,
      email: formData.email,
      phone: formData.phone,
      service_type: formData.service_type,
      package_plan: formData.package_plan,
      installation_address: formData.installation_address,
      status: 'Menunggu Verifikasi',
      notes: formData.notes,
      created_by: currentUser.name,
      documents: uploadingDocs.length > 0 ? uploadingDocs : [
        {
          id: `doc_${Date.now()}`,
          name: 'KTP_Identitas_Pemohon.pdf',
          type: 'application/pdf',
          url: '',
          size: '1.2 MB',
          verified: false,
          notes: 'Menunggu verifikasi admin',
        },
      ],
    });

    // Reset Form
    setFormData({
      customer_name: '',
      identity_no: '',
      email: '',
      phone: '',
      service_type: 'Internet Broadband',
      package_plan: 'Corporate Ultra 300 Mbps',
      installation_address: '',
      notes: '',
    });
    setUploadingDocs([]);
    setActiveTab('list');
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 md:p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-500">Portal Bisnis</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-semibold text-indigo-600">Layanan Pendaftaran Pelanggan</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Pendaftaran & Verifikasi Berkas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manajemen permohonan pasang baru, validasi identitas dan berkas legal, serta pelacakan alur aktivasi layanan.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Permohonan ({registrations.length})
            </button>
            {can('portal_pendaftaran', 'create') && (
              <button
                onClick={() => setActiveTab('create')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'create'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Input Baru
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab: Create New Registration */}
      {activeTab === 'create' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-4xl mx-auto">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-base font-bold text-slate-900">Formulir Pendaftaran Pelanggan Baru</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Isi data identitas pemohon dan unggah dokumen pendukung untuk diverifikasi oleh divisi admin.
            </p>
          </div>

          <form onSubmit={handleSubmitRegistration} className="space-y-6">
            {/* Grid 1: Identitas Pelanggan */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Data Pemohon / Pelanggan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Pelanggan / Perusahaan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="Contoh: PT Harapan Jaya atau Bpk. Hendra"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Identitas (NIK KTP / NPWP) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.identity_no}
                    onChange={(e) => setFormData({ ...formData, identity_no: e.target.value })}
                    placeholder="16 digit NIK atau NPWP Perusahaan"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp / Telepon <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+62 812-XXXX-XXXX"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alamat Email Aktif
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="kontak@domain.com"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Grid 2: Layanan & Lokasi */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                2. Spesifikasi Layanan & Lokasi Pasang
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Layanan
                  </label>
                  <select
                    value={formData.service_type}
                    onChange={(e) =>
                      setFormData({ ...formData, service_type: e.target.value as any })
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                  >
                    <option value="Internet Broadband">Internet Broadband</option>
                    <option value="Instalasi Jaringan">Instalasi Jaringan</option>
                    <option value="Pemeliharaan IT">Pemeliharaan IT</option>
                    <option value="Lisensi Sistem">Lisensi Sistem</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Paket Langganan
                  </label>
                  <input
                    type="text"
                    value={formData.package_plan}
                    onChange={(e) => setFormData({ ...formData, package_plan: e.target.value })}
                    placeholder="Contoh: Corporate Ultra 300 Mbps atau LAN Office 24-Port"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alamat Lengkap Lokasi Instalasi <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={formData.installation_address}
                    onChange={(e) =>
                      setFormData({ ...formData, installation_address: e.target.value })
                    }
                    placeholder="Nama gedung, jalan, nomor kantor/rumah, kelurahan, dan kota..."
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all resize-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catatan Khusus / Permintaan Teknis
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Contoh: Memerlukan penarikan kabel ducting atau izin gedung..."
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Grid 3: Unggah Berkas Persyaratan */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    3. Berkas Persyaratan (KTP / Legalitas)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    File diunggah ke Supabase Storage (atau demo storage).
                  </p>
                </div>
                {isUploading && (
                  <span className="text-xs text-indigo-600 font-medium animate-pulse">
                    Mengunggah file...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="p-4 border border-dashed border-slate-300 hover:border-slate-400 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-800">Unggah KTP / Paspor</span>
                  <span className="text-[10px] text-slate-400">PDF, JPG, PNG maks 5MB</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,image/*"
                    onChange={(e) => handleFileUpload(e, 'KTP')}
                  />
                </label>

                <label className="p-4 border border-dashed border-slate-300 hover:border-slate-400 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-800">Unggah NIB / Izin Usaha</span>
                  <span className="text-[10px] text-slate-400">PDF, JPG, PNG maks 5MB</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,image/*"
                    onChange={(e) => handleFileUpload(e, 'NIB')}
                  />
                </label>
              </div>

              {uploadingDocs.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <p className="text-[11px] font-semibold text-slate-700">Berkas Terlampir:</p>
                  <div className="space-y-1.5">
                    {uploadingDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200"
                      >
                        <div className="flex items-center gap-2 text-slate-800">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          <span className="font-medium truncate max-w-xs">{doc.name}</span>
                          <span className="text-[10px] text-slate-400">({doc.size})</span>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                          Siap Diverifikasi
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                Simpan & Daftarkan Pelanggan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: List of Registrations */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari no. pendaftaran, nama, atau telepon..."
                className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                Status:
              </span>
              {['ALL', 'Menunggu Verifikasi', 'Verifikasi Berkas', 'Disetujui', 'Instalasi Lapangan'].map(
                (st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'Semua' : st}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">No. Registrasi</th>
                  <th className="py-3 px-4 font-semibold">Pelanggan</th>
                  <th className="py-3 px-4 font-semibold">Layanan & Paket</th>
                  <th className="py-3 px-4 font-semibold">Status Alur</th>
                  <th className="py-3 px-4 font-semibold">Berkas Legal</th>
                  <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRegistrations.map((reg) => {
                  const verifiedDocs = reg.documents.filter((d) => d.verified).length;
                  const totalDocs = reg.documents.length;
                  return (
                    <tr
                      key={reg.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 tabular-nums">
                        {reg.registration_no}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{reg.customer_name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{reg.phone}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800">{reg.service_type}</p>
                        <p className="text-[11px] text-slate-500">{reg.package_plan}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                            reg.status === 'Disetujui' || reg.status === 'Layanan Aktif'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : reg.status === 'Menunggu Verifikasi'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {reg.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] tabular-nums text-slate-600">
                            {verifiedDocs}/{totalDocs} Sah
                          </span>
                          {verifiedDocs === totalDocs && totalDocs > 0 ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedReg(reg);
                            setIsVerifyingModalOpen(true);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          Detail & Verifikasi
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredRegistrations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Tidak ada permohonan pendaftaran yang sesuai dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card-Based Layout */}
          <div className="md:hidden space-y-3">
            {filteredRegistrations.map((reg) => {
              const verifiedDocs = reg.documents.filter((d) => d.verified).length;
              return (
                <div
                  key={reg.id}
                  onClick={() => {
                    setSelectedReg(reg);
                    setIsVerifyingModalOpen(true);
                  }}
                  className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs active:scale-[0.99] transition-transform cursor-pointer space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {reg.registration_no}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        reg.status === 'Disetujui'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {reg.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{reg.customer_name}</h3>
                    <p className="text-xs text-slate-500">{reg.service_type} · {reg.package_plan}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      {verifiedDocs}/{reg.documents.length} Berkas Valid
                    </span>
                    <span className="text-indigo-600 font-semibold flex items-center gap-1">
                      Lihat Detail <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail & Verifikasi Modal */}
      {isVerifyingModalOpen && selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-900">
                    {selectedReg.registration_no}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {selectedReg.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedReg.customer_name}
                </h3>
              </div>
              <button
                onClick={() => setIsVerifyingModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Timeline Status Progress */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Tahapan Alur Pendaftaran
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {registrationStages.map((stage) => {
                    const isCurrent = selectedReg.status === stage.name;
                    return (
                      <div
                        key={stage.id}
                        className={`p-2.5 rounded-lg border text-center transition-all ${
                          isCurrent
                            ? 'bg-slate-900 text-white border-slate-900 font-bold'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span className="text-[10px] block opacity-75">Tahap {stage.order}</span>
                        <span className="text-xs font-semibold block truncate">{stage.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Data Detail Ringkas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">No. KTP / NIK:</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedReg.identity_no}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Kontak WhatsApp:</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedReg.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Paket Layanan:</span>
                  <span className="font-semibold text-slate-800">{selectedReg.service_type} - {selectedReg.package_plan}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Tanggal Permohonan:</span>
                  <span className="font-mono text-slate-800">{new Date(selectedReg.created_at).toLocaleDateString('id-ID')}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block text-[11px]">Alamat Instalasi:</span>
                  <span className="font-medium text-slate-800">{selectedReg.installation_address}</span>
                </div>
              </div>

              {/* Verifikasi Dokumen & Berkas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Pemeriksaan & Verifikasi Dokumen
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    {can('portal_pendaftaran', 'manage') || can('portal_pendaftaran', 'edit')
                      ? 'Klik centang untuk verifikasi berkas'
                      : 'Hanya dibaca (Read-Only)'}
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedReg.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{doc.name}</p>
                          <p className="text-[11px] text-slate-500">{doc.notes || 'Dokumen lampiran pemohon'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {doc.verified ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                            <Check className="w-3.5 h-3.5" />
                            Berkas Terverifikasi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-[11px] bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                            <Clock className="w-3.5 h-3.5" />
                            Belum Diverifikasi
                          </span>
                        )}

                        {(can('portal_pendaftaran', 'manage') || can('portal_pendaftaran', 'edit')) && (
                          <button
                            onClick={() => {
                              verifyDocument(selectedReg.id, doc.id, !doc.verified);
                              setSelectedReg({
                                ...selectedReg,
                                documents: selectedReg.documents.map((d) =>
                                  d.id === doc.id ? { ...d, verified: !d.verified } : d
                                ),
                              });
                            }}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                              doc.verified
                                ? 'text-rose-700 hover:bg-rose-50 border border-rose-200'
                                : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                            }`}
                          >
                            {doc.verified ? 'Batalkan' : 'Verifikasi Sah'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Transition Control (Admin / Permitted Role) */}
              {(can('portal_pendaftaran', 'manage') || can('portal_pendaftaran', 'edit')) && (
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                  <p className="text-xs font-bold text-slate-900">Perbarui Status Pendaftaran</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {registrationStages.map((stage) => (
                      <button
                        key={stage.id}
                        disabled={selectedReg.status === stage.name}
                        onClick={() => {
                          updateRegistrationStatus(selectedReg.id, stage.name);
                          setSelectedReg({ ...selectedReg, status: stage.name });
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                          selectedReg.status === stage.name
                            ? 'bg-slate-900 text-white cursor-default'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {stage.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* INTEGRASI LINTAS MODUL: TIKET KERJA TEKNIK TERKAIT */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-slate-900">
                      Integrasi Tiket Kerja Lapangan & Minor Repair
                    </h4>
                  </div>
                  {can('papan_repair', 'create') && (
                    <button
                      onClick={() => {
                        dispatchRepairTicketFromRegistration(selectedReg);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Terbitkan Tiket Teknisi
                    </button>
                  )}
                </div>

                {/* Show linked tickets if any */}
                {(() => {
                  const linkedTickets = repairOrders.filter(
                    (r) => r.registration_no === selectedReg.registration_no
                  );
                  if (linkedTickets.length === 0) {
                    return (
                      <p className="text-[11px] text-slate-500">
                        Belum ada tiket kerja teknisi yang diterbitkan untuk pendaftaran ini. Klik tombol di atas untuk menugaskan Divisi Teknik melakukan instalasi perangkat atau minor repair.
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-2 pt-1">
                      {linkedTickets.map((t) => (
                        <div
                          key={t.id}
                          className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">{t.ticket_no}</span>
                              <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                {t.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {t.unit_name} · Teknisi: {t.assigned_technician || 'Belum ditugaskan'}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setIsVerifyingModalOpen(false);
                              setActiveView('papan_repair');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded border border-indigo-200 transition-colors cursor-pointer"
                          >
                            Buka di Papan Repair →
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
              <button
                onClick={() => setIsVerifyingModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
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
