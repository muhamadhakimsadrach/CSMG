import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RepairOrder, RepairLog } from '../types';
import {
  Kanban,
  Table as TableIcon,
  Plus,
  Search,
  User,
  X,
  Send,
  ClipboardList,
  ExternalLink,
} from 'lucide-react';

export const RepairBoard: React.FC = () => {
  const {
    repairOrders,
    repairStages,
    registrations,
    updateRepairStatus,
    assignTechnician,
    addRepairLog,
    updateRepairDetails,
    addRepairOrder,
    users,
    can,
    currentUser,
    setActiveView,
  } = useApp();

  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<RepairOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form input log baru di modal detail
  const [newLogNote, setNewLogNote] = useState('');
  const [newLogSummary, setNewLogSummary] = useState('');
  const [selectedTech, setSelectedTech] = useState('');
  const [newPartInput, setNewPartInput] = useState('');
  const [newEstimatedCost, setNewEstimatedCost] = useState<number>(0);

  // Form create order
  const [createForm, setCreateForm] = useState({
    customer_name: '',
    contact_phone: '',
    unit_name: '',
    serial_number: '',
    category: 'Hardware' as RepairOrder['category'],
    issue_description: '',
    priority: 'Sedang' as RepairOrder['priority'],
    assigned_technician: '',
    estimated_cost: 0,
  });

  // Filtered orders
  const filteredOrders = repairOrders.filter((order) => {
    const matchesSearch =
      order.ticket_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.unit_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.serial_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'ALL' || order.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  // Technicians list for assignment
  const technicians = users.filter(
    (u) => u.division === 'Divisi Teknik' || u.role_id === 'admin_pusat' || u.role_id === 'divisi_teknik'
  );

  const handleOpenDetail = (order: RepairOrder) => {
    setSelectedOrder(order);
    setSelectedTech(order.assigned_technician || '');
    setNewEstimatedCost(order.estimated_cost || 0);
    setIsDetailModalOpen(true);
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !newLogNote.trim()) return;

    addRepairLog(
      selectedOrder.id,
      newLogSummary.trim() || 'Catatan Perkembangan Pengerjaan',
      newLogNote.trim()
    );

    // Refresh selectedOrder from updated state
    setSelectedOrder((prev) => {
      if (!prev) return null;
      const updatedLog: RepairLog = {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        author_name: currentUser.name,
        author_role: currentUser.role_name,
        action_summary: newLogSummary.trim() || 'Catatan Perkembangan Pengerjaan',
        note: newLogNote.trim(),
      };
      return {
        ...prev,
        logs: [...prev.logs, updatedLog],
      };
    });

    setNewLogNote('');
    setNewLogSummary('');
  };

  const handleAssignTechnician = (techName: string) => {
    if (!selectedOrder) return;
    assignTechnician(selectedOrder.id, techName);
    setSelectedOrder((prev) => (prev ? { ...prev, assigned_technician: techName } : null));
    setSelectedTech(techName);
  };

  const handleAddPart = () => {
    if (!selectedOrder || !newPartInput.trim()) return;
    const currentParts = selectedOrder.parts_used || [];
    const updated = [...currentParts, newPartInput.trim()];
    updateRepairDetails(selectedOrder.id, { parts_used: updated });
    setSelectedOrder((prev) => (prev ? { ...prev, parts_used: updated } : null));
    setNewPartInput('');
  };

  const handleUpdateCost = () => {
    if (!selectedOrder) return;
    updateRepairDetails(selectedOrder.id, { estimated_cost: newEstimatedCost });
    setSelectedOrder((prev) => (prev ? { ...prev, estimated_cost: newEstimatedCost } : null));
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.customer_name || !createForm.unit_name || !createForm.issue_description) {
      alert('Mohon lengkapi nama pelanggan, nama unit, dan keluhan kerusakan.');
      return;
    }

    addRepairOrder({
      customer_name: createForm.customer_name,
      contact_phone: createForm.contact_phone || '+62 812-0000-0000',
      unit_name: createForm.unit_name,
      serial_number: createForm.serial_number || `SN-${Date.now().toString().slice(-6)}`,
      category: createForm.category,
      issue_description: createForm.issue_description,
      priority: createForm.priority,
      status: 'Tiket Masuk',
      assigned_technician: createForm.assigned_technician || '',
      estimated_cost: Number(createForm.estimated_cost) || 0,
      parts_used: [],
      repair_notes: '',
    });

    setCreateForm({
      customer_name: '',
      contact_phone: '',
      unit_name: '',
      serial_number: '',
      category: 'Hardware',
      issue_description: '',
      priority: 'Sedang',
      assigned_technician: '',
      estimated_cost: 0,
    });
    setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 md:p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-500">Operasional Teknik</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-semibold text-indigo-600">Minor Repair & Troubleshooting</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Papan Kerja Minor Repair
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pelacakan status pengerjaan unit, penugasan teknisi, suku cadang, dan pencatatan riwayat kronologis perbaikan.
          </p>
        </div>

        {/* View Mode & Create Action */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Toggle Kanban vs Table */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 md:px-3 md:py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilan Papan Kanban"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 md:px-3 md:py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilan Tabel Detail"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Tabel</span>
            </button>
          </div>

          {can('papan_repair', 'create') && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tiket Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari tiket, perangkat, serial no, atau pelanggan..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
            Prioritas:
          </span>
          {['ALL', 'Darurat', 'Tinggi', 'Sedang', 'Rendah'].map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                priorityFilter === p
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p === 'ALL' ? 'Semua' : p}
            </button>
          ))}
        </div>
      </div>

      {/* 1. KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-[1100px] items-start">
            {repairStages.map((stage) => {
              const ordersInStage = filteredOrders.filter((o) => o.status === stage.name);
              return (
                <div
                  key={stage.id}
                  className="w-80 shrink-0 bg-slate-100/70 rounded-xl border border-slate-200/80 p-3 flex flex-col max-h-[calc(100vh-16rem)]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: stage.color_badge || '#3b82f6' }}
                      />
                      <span className="text-xs font-bold text-slate-900">{stage.name}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white text-[10px] font-mono font-bold text-slate-700 border border-slate-200 tabular-nums">
                      {ordersInStage.length}
                    </span>
                  </div>

                  {/* Card Items Container */}
                  <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
                    {ordersInStage.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => handleOpenDetail(order)}
                        className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer space-y-2 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-slate-900 tabular-nums">
                              {order.ticket_no}
                            </span>
                            {order.registration_no && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                <ClipboardList className="w-2.5 h-2.5" />
                                {order.registration_no}
                              </span>
                            )}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              order.priority === 'Darurat'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : order.priority === 'Tinggi'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {order.priority}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                            {order.unit_name}
                          </h4>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {order.customer_name}
                          </p>
                        </div>

                        <p className="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded border border-slate-100">
                          {order.issue_description}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1 truncate max-w-[140px]">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            {order.assigned_technician || <span className="italic">Belum ditugaskan</span>}
                          </span>
                          <span className="font-mono tabular-nums">
                            {order.logs.length} catatan
                          </span>
                        </div>
                      </div>
                    ))}

                    {ordersInStage.length === 0 && (
                      <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                        Tidak ada tiket di tahap ini
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">No. Tiket</th>
                  <th className="py-3 px-4 font-semibold">Perangkat / Serial</th>
                  <th className="py-3 px-4 font-semibold">Pelanggan & Kontak</th>
                  <th className="py-3 px-4 font-semibold">Prioritas</th>
                  <th className="py-3 px-4 font-semibold">Status Tahapan</th>
                  <th className="py-3 px-4 font-semibold">Teknisi Bertugas</th>
                  <th className="py-3 px-4 font-semibold text-right">Estimasi Biaya</th>
                  <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => handleOpenDetail(order)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 tabular-nums">
                      {order.ticket_no}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{order.unit_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{order.serial_number}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800">{order.customer_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{order.contact_phone}</p>
                    </td>
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4">
                      <span className="text-slate-800 font-medium">{order.status}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {order.assigned_technician || <span className="text-slate-400 italic">Belum ditugaskan</span>}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 tabular-nums text-right">
                      Rp {(order.estimated_cost || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(order);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                      >
                        Buka Tiket
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Tidak ada tiket perbaikan yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL & LOG PENANGANAN TEKNISI MODAL */}
      {isDetailModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                    {selectedOrder.ticket_no}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {selectedOrder.status}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                      selectedOrder.priority === 'Darurat'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Prioritas {selectedOrder.priority}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedOrder.unit_name}
                </h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Status Update Quick Buttons */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Perbarui Status Penanganan Teknisi
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {repairStages.map((stg) => (
                    <button
                      key={stg.id}
                      disabled={selectedOrder.status === stg.name}
                      onClick={() => {
                        updateRepairStatus(selectedOrder.id, stg.name);
                        setSelectedOrder((prev) =>
                          prev
                            ? {
                                ...prev,
                                status: stg.name,
                                logs: [
                                  ...prev.logs,
                                  {
                                    id: `log_${Date.now()}`,
                                    timestamp: new Date().toISOString(),
                                    author_name: currentUser.name,
                                    author_role: currentUser.role_name,
                                    action_summary: `Status diubah ke ${stg.name}`,
                                    note: `Perubahan alur ke tahap ${stg.name}`,
                                    status_transition: `${prev.status} → ${stg.name}`,
                                  },
                                ],
                              }
                            : null
                        );
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        selectedOrder.status === stg.name
                          ? 'bg-slate-900 text-white cursor-default'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {stg.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Banner Integrasi Pendaftaran Pelanggan */}
              {selectedOrder.registration_no && (() => {
                const linkedReg = registrations.find((r) => r.registration_no === selectedOrder.registration_no);
                return (
                  <div className="p-3.5 bg-indigo-50/80 rounded-xl border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <ClipboardList className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-indigo-950">
                          Tiket Terintegrasi dengan Pendaftaran: {selectedOrder.registration_no}
                          {linkedReg && ` (${linkedReg.service_type} - ${linkedReg.package_plan})`}
                        </p>
                        <p className="text-[11px] text-indigo-700">
                          Alamat Pasang: {selectedOrder.installation_address || linkedReg?.installation_address || 'Tercantum di berkas permohonan pelanggan'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        setActiveView('portal_pendaftaran');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer"
                    >
                      <span>Lihat Berkas & Verifikasi</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                );
              })()}

              {/* Grid Info Perangkat & Pelanggan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Nama Pelanggan:</span>
                  <span className="font-semibold text-slate-900">{selectedOrder.customer_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Kontak Telepon:</span>
                  <span className="font-mono font-semibold text-slate-900">{selectedOrder.contact_phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Nomor Serial Unit:</span>
                  <span className="font-mono font-semibold text-slate-900">{selectedOrder.serial_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Kategori Gangguan:</span>
                  <span className="font-semibold text-slate-900">{selectedOrder.category}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="text-slate-400 block text-[11px]">Deskripsi Keluhan / Kerusakan:</span>
                  <p className="text-slate-800 mt-0.5 leading-relaxed bg-white p-2.5 rounded border border-slate-200">
                    {selectedOrder.issue_description}
                  </p>
                </div>
              </div>

              {/* Penugasan Teknisi & Estimasi Biaya */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-xl border border-slate-200 text-xs">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Penugasan Teknisi Penanggung Jawab
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedTech}
                      onChange={(e) => setSelectedTech(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="">Pilih teknisi...</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name} ({t.division})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleAssignTechnician(selectedTech)}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Tugaskan
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Estimasi Biaya Perbaikan (Rp)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={newEstimatedCost}
                      onChange={(e) => setNewEstimatedCost(Number(e.target.value))}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleUpdateCost}
                      className="px-3 py-1.5 bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-lg font-semibold transition-colors cursor-pointer border border-slate-300"
                    >
                      Update
                    </button>
                  </div>
                </div>

                {/* Suku Cadang Terpakai */}
                <div className="md:col-span-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Suku Cadang & Komponen Pengganti
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newPartInput}
                      onChange={(e) => setNewPartInput(e.target.value)}
                      placeholder="Contoh: Modul SFP+ 10G atau Kapasitor 400V"
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300"
                    />
                    <button
                      type="button"
                      onClick={handleAddPart}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold border border-slate-300 cursor-pointer"
                    >
                      Tambah Part
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {selectedOrder.parts_used?.map((part, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200"
                      >
                        {part}
                      </span>
                    ))}
                    {(!selectedOrder.parts_used || selectedOrder.parts_used.length === 0) && (
                      <span className="text-[11px] text-slate-400 italic">Belum ada suku cadang yang dicatat</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Riwayat Log Penanganan Kronologis */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Riwayat & Kronologi Penanganan ({selectedOrder.logs.length})
                </h4>

                <div className="space-y-3 pl-2 border-l-2 border-slate-200">
                  {selectedOrder.logs.map((log) => (
                    <div key={log.id} className="relative pl-4 space-y-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-400 absolute -left-[21px] top-1" />
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800">{log.action_summary}</span>
                        <span className="font-mono text-slate-400 tabular-nums">
                          {new Date(log.timestamp).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        {log.note}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Oleh: {log.author_name} ({log.author_role})
                        {log.status_transition && ` · Alur: ${log.status_transition}`}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Form Tambah Catatan Log Baru */}
                <form
                  onSubmit={handleAddLog}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 mt-4"
                >
                  <p className="text-xs font-bold text-slate-800">Tambah Catatan Teknisi Baru</p>
                  <input
                    type="text"
                    value={newLogSummary}
                    onChange={(e) => setNewLogSummary(e.target.value)}
                    placeholder="Judul / Aksi Singkat (Contoh: Uji Konektivitas Ping)"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                  <textarea
                    rows={2}
                    required
                    value={newLogNote}
                    onChange={(e) => setNewLogNote(e.target.value)}
                    placeholder="Tuliskan catatan teknis hasil penanganan, diagnosa, atau instruksi serah terima..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Kirim Log Catatan
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW REPAIR ORDER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">Buat Tiket Perbaikan Baru</h3>
                <p className="text-xs text-slate-500">Papan kerja penanganan minor repair</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Pelanggan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.customer_name}
                    onChange={(e) => setCreateForm({ ...createForm, customer_name: e.target.value })}
                    placeholder="Contoh: Kantor Notaris Dewi"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kontak Telepon
                  </label>
                  <input
                    type="tel"
                    value={createForm.contact_phone}
                    onChange={(e) => setCreateForm({ ...createForm, contact_phone: e.target.value })}
                    placeholder="+62 812-XXXX-XXXX"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama / Model Perangkat <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.unit_name}
                    onChange={(e) => setCreateForm({ ...createForm, unit_name: e.target.value })}
                    placeholder="Contoh: Router MikroTik CCR2004"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor Serial / Asset Tag
                  </label>
                  <input
                    type="text"
                    value={createForm.serial_number}
                    onChange={(e) => setCreateForm({ ...createForm, serial_number: e.target.value })}
                    placeholder="Contoh: SN-88219"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Kerusakan
                  </label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Hardware">Hardware</option>
                    <option value="Modem / Router">Modem / Router</option>
                    <option value="Kabel & Port">Kabel & Port</option>
                    <option value="Power Supply">Power Supply</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tingkat Prioritas
                  </label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Rendah">Rendah</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Tinggi">Tinggi</option>
                    <option value="Darurat">Darurat</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deskripsi Masalah / Gejala Kerusakan <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={createForm.issue_description}
                    onChange={(e) => setCreateForm({ ...createForm, issue_description: e.target.value })}
                    placeholder="Jelaskan detail indikator lampu, bunyi, atau kegagalan fungsi..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teknisi Ditugaskan
                  </label>
                  <select
                    value={createForm.assigned_technician}
                    onChange={(e) => setCreateForm({ ...createForm, assigned_technician: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">Belum Ditugaskan</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimasi Biaya Awal (Rp)
                  </label>
                  <input
                    type="number"
                    value={createForm.estimated_cost}
                    onChange={(e) => setCreateForm({ ...createForm, estimated_cost: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  Terbitkan Tiket Repair
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
