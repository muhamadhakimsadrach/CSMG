import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ModuleKey } from '../types';
import {
  Shield,
  Users2,
  Palette,
  Database,
  Plus,
  Trash2,
  Building,
  Save,
  CheckCircle2,
  RefreshCw,
  Server,
  Activity,
  KeyRound,
} from 'lucide-react';

interface Props {
  initialTab?: 'rbac' | 'branding' | 'tidb';
}

export const AdminSettings: React.FC<Props> = ({ initialTab = 'rbac' }) => {
  const {
    roles,
    users,
    appSettings,
    updateAppSettings,
    updateRolePermissions,
    addUser,
    deleteUser,
    tiDBConnected,
    tiDBLatency,
    checkTiDBStatus,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'rbac' | 'branding' | 'tidb'>(initialTab);
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id || 'role_admin');
  const [brandingForm, setBrandingForm] = useState({ ...appSettings });
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRoleId, setNewUserRoleId] = useState(roles[0]?.id || 'role_admin');
  const [isTestingTiDB, setIsTestingTiDB] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || roles[0];

  const modulesList: { key: ModuleKey; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard & Statistik' },
    { key: 'pendaftaran', label: 'Pendaftaran Sambungan Air' },
    { key: 'repair', label: 'Perbaikan & Pengaduan Gangguan' },
    { key: 'pengguna', label: 'Manajemen Staf & User' },
    { key: 'pengaturan', label: 'Pengaturan & Branding' },
    { key: 'log_aktivitas', label: 'Audit Log Aktivitas' },
  ];

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    updateAppSettings(brandingForm);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;
    const role = roles.find((r) => r.id === newUserRoleId);
    addUser({
      name: newUserName,
      email: newUserEmail,
      role_id: newUserRoleId,
      role_name: role ? role.name : 'Staf Divisi',
      division: role ? role.division : 'Operasional',
    });
    setNewUserName('');
    setNewUserEmail('');
    setIsAddUserOpen(false);
  };

  const handleTestTiDB = async () => {
    setIsTestingTiDB(true);
    setTestResult(null);
    try {
      await checkTiDBStatus();
      setTestResult(`Koneksi TiDB Cloud MySQL Sukses! Latensi: ${tiDBLatency}ms`);
    } catch (e: any) {
      setTestResult(`Gagal terhubung ke TiDB: ${e.message}`);
    } finally {
      setIsTestingTiDB(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Shield className="w-6 h-6 text-sky-600" />
          <span>Pengaturan Sistem, Hak Akses & TiDB Cloud</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Atur perizinan RBAC staf, identitas perusahaan, dan pemantauan koneksi basis data MySQL TiDB.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('rbac')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'rbac'
              ? 'border-sky-600 text-sky-700 bg-sky-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Manajemen Pengguna & RBAC</span>
        </button>
        <button
          onClick={() => setActiveTab('tidb')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'tidb'
              ? 'border-sky-600 text-sky-700 bg-sky-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>TiDB Cloud MySQL Status</span>
        </button>
        <button
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'branding'
              ? 'border-sky-600 text-sky-700 bg-sky-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Branding & Perusahaan</span>
        </button>
      </div>

      {/* TAB 1: RBAC & Users */}
      {activeTab === 'rbac' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Daftar Peran Staf (Roles)</h3>
            <div className="space-y-1.5">
              {roles.map((r) => {
                const isSelected = r.id === selectedRoleId;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoleId(r.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all text-xs ${
                      isSelected
                        ? 'bg-sky-50 border-sky-300 text-sky-900 font-bold shadow-xs'
                        : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{r.name}</span>
                      {r.is_admin && (
                        <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{r.division}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permissions Matrix */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Matriks Hak Akses: {selectedRole?.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedRole?.description}</p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Modul</th>
                    <th className="py-2.5 px-2 text-center">Lihat</th>
                    <th className="py-2.5 px-2 text-center">Tambah</th>
                    <th className="py-2.5 px-2 text-center">Ubah</th>
                    <th className="py-2.5 px-2 text-center">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {modulesList.map((m) => {
                    const currentPerm = selectedRole?.permissions[m.key] || { view: false };
                    return (
                      <tr key={m.key} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-medium text-slate-800">{m.label}</td>
                        {(['view', 'create', 'edit', 'delete'] as const).map((act) => (
                          <td key={act} className="py-3 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(currentPerm[act])}
                              disabled={selectedRole?.is_admin}
                              onChange={(e) =>
                                updateRolePermissions(selectedRoleId, m.key, {
                                  [act]: e.target.checked,
                                })
                              }
                              className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer disabled:opacity-50"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Staf Member List under Role */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-900 text-xs">Pengguna dengan Peran Ini</h4>
                <button
                  onClick={() => setIsAddUserOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Pengguna</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {users
                  .filter((u) => u.role_id === selectedRoleId)
                  .map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{user.name}</p>
                        <p className="text-[11px] text-slate-500">{user.email}</p>
                      </div>
                      {user.id !== 'usr_admin_01' && (
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md"
                          title="Hapus Pengguna"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TiDB Cloud MySQL Status */}
      {activeTab === 'tidb' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-3xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-500 text-white flex items-center justify-center shadow-md">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">TiDB Cloud MySQL (Dedicated Cluster)</h3>
                <p className="text-xs text-slate-500">
                  Basis data terdistribusi skalabel tinggi dengan enkripsi TLS/SSL
                </p>
              </div>
            </div>

            <button
              onClick={handleTestTiDB}
              disabled={isTestingTiDB}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingTiDB ? 'animate-spin' : ''}`} />
              <span>Uji Koneksi Sekarang</span>
            </button>
          </div>

          {testResult && (
            <div
              className={`p-3.5 rounded-xl text-xs font-medium border ${
                testResult.includes('Sukses')
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {testResult}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 text-[11px] font-medium">Cluster Host</span>
              <p className="font-bold text-slate-800 mt-1 break-all">
                gateway01.ap-southeast-1.prod.aws.tidbcloud.com
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 text-[11px] font-medium">Port & Database</span>
              <p className="font-bold text-slate-800 mt-1">Port 4000 &bull; Database: aetra</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 text-[11px] font-medium">Username Akun</span>
              <p className="font-bold text-slate-800 mt-1">3Km63GXw5WDRMuG.root</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 text-[11px] font-medium">Protokol Keamanan</span>
              <p className="font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                TLS v1.3 SSL Enforced (Aman)
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-100 text-xs text-sky-900 leading-relaxed">
            <p className="font-bold mb-1">Informasi Arsitektur:</p>
            Semua transaksi pada aplikasi ini (registrasi pendaftaran baru, update status alur kerja, pengaduan gangguan teknis, dan audit log) otomatis dijalankan oleh server Node.js Express via driver <code className="bg-sky-100 px-1.5 py-0.5 rounded font-mono font-bold">mysql2</code> langsung ke klaster TiDB Cloud.
          </div>
        </div>
      )}

      {/* TAB 3: Branding */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSaveBranding} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-2xl space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama Aplikasi / Portal</label>
            <input
              type="text"
              value={brandingForm.app_name}
              onChange={(e) => setBrandingForm({ ...brandingForm, app_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama Perusahaan</label>
            <input
              type="text"
              value={brandingForm.company_name}
              onChange={(e) => setBrandingForm({ ...brandingForm, company_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tagline Layanan</label>
            <input
              type="text"
              value={brandingForm.tagline}
              onChange={(e) => setBrandingForm({ ...brandingForm, tagline: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon Layanan</label>
              <input
                type="text"
                value={brandingForm.support_phone}
                onChange={(e) => setBrandingForm({ ...brandingForm, support_phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Layanan</label>
              <input
                type="email"
                value={brandingForm.support_email}
                onChange={(e) => setBrandingForm({ ...brandingForm, support_email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md shadow-sky-600/20 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan ke TiDB</span>
            </button>
          </div>
        </form>
      )}

      {/* Modal Add User */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-slide-up text-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-4">Tambah Pengguna Staf Baru</h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Contoh: Andi Wijaya"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Staf</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="andi@aetra.demo"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Peran / Divisi</label>
                <select
                  value={newUserRoleId}
                  onChange={(e) => setNewUserRoleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.division})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold"
                >
                  Simpan Staf
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
