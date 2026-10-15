import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ModuleKey } from '../types';
import { uploadFileToStorage } from '../lib/supabaseClient';
import { SUPABASE_SQL_SCHEMA } from '../lib/databaseSchema';
import {
  Shield,
  Users2,
  Palette,
  GitFork,
  Database,
  Plus,
  Trash2,
  Upload,
  ArrowUp,
  ArrowDown,
  Copy,
  CheckCircle2,
  Building,
  Save,
} from 'lucide-react';

interface Props {
  initialTab?: 'rbac' | 'branding' | 'workflow' | 'schema';
}

export const AdminSettings: React.FC<Props> = ({ initialTab = 'rbac' }) => {
  const {
    appSettings,
    updateAppSettings,
    roles,
    users,
    updateRolePermissions,
    addUser,
    deleteUser,
    registrationStages,
    repairStages,
    updateWorkflowStages,
    addWorkflowStage,
    deleteWorkflowStage,
    activeView,
    setActiveView,
    showToast,
  } = useApp();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'rbac' | 'branding' | 'workflow' | 'schema'>(() => {
    if (activeView === 'user_management') return 'rbac';
    if (activeView === 'branding_customization') return 'branding';
    if (activeView === 'workflow_builder') return 'workflow';
    if (activeView === 'database_schema') return 'schema';
    return initialTab;
  });

  // Branding Form State
  const [companyName, setCompanyName] = useState(appSettings.company_name);
  const [companyTagline, setCompanyTagline] = useState(appSettings.company_tagline);
  const [logoUrl, setLogoUrl] = useState(appSettings.logo_url);
  const [supportEmail, setSupportEmail] = useState(appSettings.support_email);
  const [supportPhone, setSupportPhone] = useState(appSettings.support_phone);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // New User Form State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRoleId, setNewUserRoleId] = useState('divisi_teknik');

  // Selected Role for Permission Matrix
  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState<string>('divisi_teknik');

  // Workflow Builder State
  const [workflowCategory, setWorkflowCategory] = useState<'registration' | 'repair'>('repair');
  const [isAddStageOpen, setIsAddStageOpen] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageDivision, setNewStageDivision] = useState('Divisi Teknik');
  const [newStageColor, setNewStageColor] = useState('#3b82f6');
  const [newStageSla, setNewStageSla] = useState(12);

  // SQL Copy state
  const [isCopied, setIsCopied] = useState(false);

  // Handle Logo Upload via Supabase Storage
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const res = await uploadFileToStorage(file, 'app-assets');
      setLogoUrl(res.url);
      updateAppSettings({ logo_url: res.url });
      showToast(
        res.isCloud
          ? 'Logo berhasil diunggah ke Supabase Storage & diperbarui di aplikasi!'
          : 'Logo berhasil disimpan secara lokal & diperbarui di aplikasi!',
        'success'
      );
    } catch (err: any) {
      showToast(`Gagal mengunggah logo: ${err.message}`, 'error');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    updateAppSettings({
      company_name: companyName,
      company_tagline: companyTagline,
      logo_url: logoUrl,
      support_email: supportEmail,
      support_phone: supportPhone,
    });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;

    const role = roles.find((r) => r.id === newUserRoleId);
    addUser({
      name: newUserName,
      email: newUserEmail,
      role_id: newUserRoleId,
      role_name: role ? role.name : 'Anggota Divisi',
      division: role ? role.division : 'Divisi',
      avatar_url: '',
    });

    setNewUserName('');
    setNewUserEmail('');
    setIsAddUserOpen(false);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setIsCopied(true);
    showToast('Skrip SQL lengkap berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setIsCopied(false), 3000);
  };

  // Move workflow stage up/down
  const moveStage = (category: 'registration' | 'repair', index: number, direction: 'up' | 'down') => {
    const list = category === 'registration' ? [...registrationStages] : [...repairStages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    updateWorkflowStages(category, list);
  };

  const handleAddStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) return;

    addWorkflowStage(workflowCategory, {
      category: workflowCategory,
      name: newStageName.trim(),
      slug: newStageName.toLowerCase().replace(/\s+/g, '_'),
      description: `Tahapan alur ${newStageName}`,
      assigned_division: newStageDivision,
      color_badge: newStageColor,
      sla_hours: Number(newStageSla) || 24,
    });

    setNewStageName('');
    setIsAddStageOpen(false);
  };

  // Modules list for RBAC matrix
  const modulesList: { key: ModuleKey; label: string; desc: string }[] = [
    { key: 'dashboard', label: 'Ringkasan Dashboard', desc: 'Statistik eksekutif & KPI ringkas' },
    { key: 'portal_pendaftaran', label: 'Portal Pendaftaran Pelanggan', desc: 'Input permohonan pasang baru & verifikasi' },
    { key: 'papan_repair', label: 'Papan Kerja Minor Repair', desc: 'Papan Kanban, penugasan teknisi & log' },
    { key: 'workflow_builder', label: 'Editor Alur Kerja (Workflow)', desc: 'Kustomisasi tahapan status alur' },
    { key: 'user_management', label: 'Manajemen Hak Akses & User', desc: 'Pengaturan akun tim & role RBAC' },
    { key: 'branding_customization', label: 'Kustomisasi Logo & Branding', desc: 'Ganti logo perusahaan & identitas' },
    { key: 'database_schema', label: 'Skema Database & RLS', desc: 'Akses DDL dan generator Supabase SQL' },
  ];

  const currentRoleMatrix = roles.find((r) => r.id === selectedRoleForMatrix) || roles[1];

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="p-5 md:p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-slate-500">Pusat Kendali</span>
          <span className="text-slate-300">·</span>
          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            Hak Akses Khusus Admin Pusat
          </span>
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
          Pusat Pengaturan Sistem & Workflow
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-3xl">
          Kelola matriks hak akses per divisi (RBAC), kustomisasi logo dan branding perusahaan secara dinamis, visual alur kerja tiket, dan skema Supabase RLS.
        </p>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-5 border-b border-slate-200 overflow-x-auto pb-px">
          {[
            { id: 'rbac', label: 'Manajemen RBAC & User', icon: <Users2 className="w-4 h-4" /> },
            { id: 'branding', label: 'Branding & Logo Dinamis', icon: <Palette className="w-4 h-4" /> },
            { id: 'workflow', label: 'Editor Alur Kerja (Workflow)', icon: <GitFork className="w-4 h-4" /> },
            { id: 'schema', label: 'Skema Database & RLS', icon: <Database className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'rbac') setActiveView('user_management');
                if (tab.id === 'branding') setActiveView('branding_customization');
                if (tab.id === 'workflow') setActiveView('workflow_builder');
                if (tab.id === 'schema') setActiveView('database_schema');
              }}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'border-slate-900 text-slate-900 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: MANAJEMEN RBAC & USER */}
      {activeTab === 'rbac' && (
        <div className="space-y-6">
          {/* Matriks Hak Akses Per Role */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Matriks Hak Akses Modul (Role-Based Access Control)
                </h3>
                <p className="text-xs text-slate-500">
                  Centang modul dan kewenangan aksi yang boleh diakses oleh tiap divisi
                </p>
              </div>

              {/* Role Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Pilih Peran:</span>
                <select
                  value={selectedRoleForMatrix}
                  onChange={(e) => setSelectedRoleForMatrix(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.division})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {currentRoleMatrix.is_admin ? (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Admin Pusat</strong> memiliki kewenangan tertinggi dan akses tak terbatas ke seluruh modul dan operasi sistem.
                </span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Modul Aplikasi</th>
                      <th className="py-2.5 px-3 font-semibold text-center w-28">Lihat (View)</th>
                      <th className="py-2.5 px-3 font-semibold text-center w-28">Tambah (Create)</th>
                      <th className="py-2.5 px-3 font-semibold text-center w-28">Edit / Verifikasi</th>
                      <th className="py-2.5 px-3 font-semibold text-center w-28">Kelola (Manage)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modulesList.map((mod) => {
                      const perm = currentRoleMatrix.permissions[mod.key] || { view: false };
                      return (
                        <tr key={mod.key} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3">
                            <p className="font-semibold text-slate-800">{mod.label}</p>
                            <p className="text-[11px] text-slate-400">{mod.desc}</p>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(perm.view)}
                              onChange={(e) =>
                                updateRolePermissions(currentRoleMatrix.id, mod.key, {
                                  view: e.target.checked,
                                })
                              }
                              className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              disabled={!perm.view}
                              checked={Boolean(perm.create)}
                              onChange={(e) =>
                                updateRolePermissions(currentRoleMatrix.id, mod.key, {
                                  create: e.target.checked,
                                })
                              }
                              className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer disabled:opacity-30"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              disabled={!perm.view}
                              checked={Boolean(perm.edit || perm.verify)}
                              onChange={(e) =>
                                updateRolePermissions(currentRoleMatrix.id, mod.key, {
                                  edit: e.target.checked,
                                  verify: e.target.checked,
                                })
                              }
                              className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer disabled:opacity-30"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              disabled={!perm.view}
                              checked={Boolean(perm.manage || perm.delete)}
                              onChange={(e) =>
                                updateRolePermissions(currentRoleMatrix.id, mod.key, {
                                  manage: e.target.checked,
                                  delete: e.target.checked,
                                })
                              }
                              className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer disabled:opacity-30"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Daftar User Divisi */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Daftar Akun Pengguna & Divisi</h3>
                <p className="text-xs text-slate-500">Anggota tim yang memiliki akses ke sistem</p>
              </div>

              <button
                onClick={() => setIsAddUserOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah User
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{u.name}</p>
                      <p className="text-[11px] text-slate-500">{u.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {u.role_name}
                      </span>
                    </div>
                  </div>

                  {u.id !== 'usr_admin_01' && (
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Pengguna"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BRANDING & LOGO DINAMIS */}
      {activeTab === 'branding' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-3xl space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900">Kustomisasi Tampilan & Identitas Perusahaan</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Logo yang diunggah akan secara dinamis menggantikan logo utama di seluruh sidebar, header, dan mobile bar aplikasi.
            </p>
          </div>

          <form onSubmit={handleSaveBranding} className="space-y-6">
            {/* Logo Upload Box */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <label className="block text-xs font-bold text-slate-800">
                Logo Perusahaan (Dinamis)
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Logo Preview Container */}
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center p-2 shrink-0 overflow-hidden">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Company Logo Preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <Building className="w-6 h-6 mx-auto mb-1 opacity-50" />
                      <span className="text-[10px] block">Belum ada logo</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-xs flex-1">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold cursor-pointer transition-colors shadow-xs">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    {isUploadingLogo ? 'Mengunggah ke Storage...' : 'Unggah Logo Baru (PNG / JPG / SVG)'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={isUploadingLogo}
                    />
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Disimpan di Supabase Storage bucket <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">app-assets</code>. Rekomendasi resolusi horizontal 200x50px atau transparan.
                  </p>

                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogoUrl('');
                        updateAppSettings({ logo_url: '' });
                      }}
                      className="text-[11px] text-rose-600 hover:underline block font-medium cursor-pointer"
                    >
                      Hapus Logo & Gunakan Monogram Bawaan
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Form Input Data Perusahaan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Resmi Perusahaan
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tagline Perusahaan
                </label>
                <input
                  type="text"
                  value={companyTagline}
                  onChange={(e) => setCompanyTagline(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Support & Operasional
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Telepon Hotline / WhatsApp
                </label>
                <input
                  type="text"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan Perubahan Branding
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: EDITOR ALUR KERJA (WORKFLOW BUILDER) */}
      {activeTab === 'workflow' && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Visual Workflow Builder (Pengaturan Tahapan Alur Kerja)
                </h3>
                <p className="text-xs text-slate-500">
                  Ubah urutan, tambah tahapan baru, tentukan divisi penanggung jawab, dan SLA waktu
                </p>
              </div>

              {/* Category Switcher */}
              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setWorkflowCategory('repair')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      workflowCategory === 'repair'
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Alur Minor Repair ({repairStages.length} Tahap)
                  </button>
                  <button
                    onClick={() => setWorkflowCategory('registration')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      workflowCategory === 'registration'
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Alur Pendaftaran ({registrationStages.length} Tahap)
                  </button>
                </div>

                <button
                  onClick={() => setIsAddStageOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Tahap
                </button>
              </div>
            </div>

            {/* Interactive Stages Pipeline */}
            <div className="space-y-3">
              {(workflowCategory === 'registration' ? registrationStages : repairStages).map(
                (stage, index, arr) => (
                  <div
                    key={stage.id}
                    className="p-3.5 bg-slate-50 hover:bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {/* Step Number Badge */}
                      <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0 tabular-nums">
                        {stage.order}
                      </div>

                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: stage.color_badge }} />

                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{stage.name}</h4>
                        <p className="text-[11px] text-slate-500">{stage.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                          Divisi Bertugas
                        </span>
                        <span className="text-xs font-semibold text-slate-800">
                          {stage.assigned_division}
                        </span>
                      </div>

                      <div className="text-right hidden sm:block">
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                          Target SLA
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-800 tabular-nums">
                          {stage.sla_hours} Jam
                        </span>
                      </div>

                      {/* Reorder Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          disabled={index === 0}
                          onClick={() => moveStage(workflowCategory, index, 'up')}
                          className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-20 cursor-pointer"
                          title="Pindahkan ke atas"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          disabled={index === arr.length - 1}
                          onClick={() => moveStage(workflowCategory, index, 'down')}
                          className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-20 cursor-pointer"
                          title="Pindahkan ke bawah"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteWorkflowStage(workflowCategory, stage.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer ml-1"
                          title="Hapus Tahapan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SKEMA DATABASE & RLS SUPABASE */}
      {activeTab === 'schema' && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Skema Lengkap Database Supabase & Row Level Security (RLS)
                </h3>
                <p className="text-xs text-slate-500">
                  Dapat langsung disalin dan dieksekusi di Supabase SQL Editor
                </p>
              </div>

              <button
                onClick={handleCopySql}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                {isCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{isCopied ? 'Tersalin ke Clipboard!' : 'Salin Kode SQL Lengkap'}</span>
              </button>
            </div>

            {/* Quick 3-Step Guide */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">1</span>
                  Buka Supabase Project
                </span>
                <p className="text-[11px] text-slate-500">
                  Masuk ke dashboard Supabase Anda dan pilih menu <strong>SQL Editor</strong> di sidebar kiri.
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">2</span>
                  Tempel & Jalankan Skrip
                </span>
                <p className="text-[11px] text-slate-500">
                  Klik tombol <strong>"Salin Kode SQL Lengkap"</strong> di atas, tempel di query editor, lalu klik <strong>RUN</strong>.
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">3</span>
                  Hubungkan Aplikasi
                </span>
                <p className="text-[11px] text-slate-500">
                  Klik tombol <strong>"Supabase"</strong> di header atas aplikasi ini dan masukkan Project URL & Anon Key.
                </p>
              </div>
            </div>

            {/* SQL Code Block */}
            <div className="relative">
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[480px] leading-relaxed">
                {SUPABASE_SQL_SCHEMA}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah User Baru */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">Tambah User Divisi Baru</h3>
            <p className="text-xs text-slate-500 mb-4">
              Pengguna baru akan mendapatkan hak akses sesuai dengan peran divisi yang dipilih.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Contoh: Ahmad Fauzi, S.T."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Perusahaan
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="ahmad.fauzi@solusiterpadu.id"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Peran Divisi (RBAC Role)
                </label>
                <select
                  value={newUserRoleId}
                  onChange={(e) => setNewUserRoleId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.division})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Simpan User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Tahapan Workflow Baru */}
      {isAddStageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Tambah Tahapan {workflowCategory === 'registration' ? 'Pendaftaran' : 'Minor Repair'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Tambahkan tahapan alur baru ke urutan operasional tim.
            </p>

            <form onSubmit={handleAddStage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Tahapan Status
                </label>
                <input
                  type="text"
                  required
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="Contoh: Pengecekan Lokasi Fisik"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Divisi Penanggung Jawab
                </label>
                <select
                  value={newStageDivision}
                  onChange={(e) => setNewStageDivision(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Divisi Teknik">Divisi Teknik</option>
                  <option value="Divisi Sales">Divisi Sales</option>
                  <option value="Divisi Admin">Divisi Admin</option>
                  <option value="Admin Pusat">Admin Pusat</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Warna Indikator
                  </label>
                  <input
                    type="color"
                    value={newStageColor}
                    onChange={(e) => setNewStageColor(e.target.value)}
                    className="w-full h-8 px-1 py-0.5 rounded border border-slate-300 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target SLA (Jam)
                  </label>
                  <input
                    type="number"
                    value={newStageSla}
                    onChange={(e) => setNewStageSla(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddStageOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Tambah Tahapan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
