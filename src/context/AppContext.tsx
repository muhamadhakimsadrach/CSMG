import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AppSettings,
  ModuleKey,
  ModulePermission,
  Registration,
  RepairOrder,
  Role,
  UserProfile,
  WorkflowStage,
} from '../types';
import { useToastBase } from './ToastContext';
import { db } from '../lib/dbClient';

const INITIAL_ROLES: Role[] = [
  {
    id: 'role_admin',
    name: 'Admin Aetra',
    division: 'Manajemen Pusat & Pengaturan',
    description: 'Akses penuh ke semua modul sistem, branding perusahaan, manajemen hak akses pengguna, dan konfigurasi alur kerja.',
    is_admin: true,
    permissions: {
      dashboard: { view: true, create: true, edit: true, delete: true, export: true },
      pendaftaran: { view: true, create: true, edit: true, delete: true, export: true },
      repair: { view: true, create: true, edit: true, delete: true, export: true },
      forms: { view: true, create: true, edit: true, delete: true, export: true },
      pengguna: { view: true, create: true, edit: true, delete: true, export: true },
      workflow: { view: true, create: true, edit: true, delete: true, export: true },
      pengaturan: { view: true, create: true, edit: true, delete: true, export: true },
      log_aktivitas: { view: true, create: true, edit: true, delete: true, export: true },
    },
  },
  {
    id: 'role_cs',
    name: 'Customer Service (CS)',
    division: 'Pintu Masuk Pendaftaran & Complain',
    description: 'Menerima pendaftaran sambungan baru & pengaduan pelanggan, verifikasi kelengkapan berkas, serta penerbitan ID pelanggan.',
    permissions: {
      dashboard: { view: true, create: false, edit: false, delete: false, export: true },
      pendaftaran: { view: true, create: true, edit: true, delete: false, export: true },
      repair: { view: true, create: true, edit: true, delete: false, export: true },
      forms: { view: true, create: false, edit: false, delete: false, export: false },
      pengguna: { view: false, create: false, edit: false, delete: false, export: false },
      workflow: { view: true, create: false, edit: false, delete: false, export: false },
      pengaturan: { view: false, create: false, edit: false, delete: false, export: false },
      log_aktivitas: { view: true, create: false, edit: false, delete: false, export: false },
    },
  },
  {
    id: 'role_spv_sales',
    name: 'SPV Sales',
    division: 'Supervisor Divisi Sales',
    description: 'Menerima delegasi tugas pendaftaran dari CS dan menugaskan survei kelayakan jaringan ke tim Sales lapangan.',
    permissions: {
      dashboard: { view: true, create: false, edit: false, delete: false, export: true },
      pendaftaran: { view: true, create: false, edit: true, delete: false, export: true },
      repair: { view: false, create: false, edit: false, delete: false, export: false },
      forms: { view: false, create: false, edit: false, delete: false, export: false },
      pengguna: { view: true, create: false, edit: false, delete: false, export: false },
      workflow: { view: true, create: false, edit: false, delete: false, export: false },
      pengaturan: { view: false, create: false, edit: false, delete: false, export: false },
      log_aktivitas: { view: true, create: false, edit: false, delete: false, export: false },
    },
  },
  {
    id: 'role_spv_tech',
    name: 'SPV Technical',
    division: 'Supervisor Divisi Teknik',
    description: 'Menerima laporan gangguan air dari CS dan mendelegasikan penanganan ke tim New Connection atau Minor Repair.',
    permissions: {
      dashboard: { view: true, create: false, edit: false, delete: false, export: true },
      pendaftaran: { view: false, create: false, edit: false, delete: false, export: false },
      repair: { view: true, create: false, edit: true, delete: false, export: true },
      forms: { view: false, create: false, edit: false, delete: false, export: false },
      pengguna: { view: true, create: false, edit: false, delete: false, export: false },
      workflow: { view: true, create: false, edit: false, delete: false, export: false },
      pengaturan: { view: false, create: false, edit: false, delete: false, export: false },
      log_aktivitas: { view: true, create: false, edit: false, delete: false, export: false },
    },
  },
  {
    id: 'role_sales',
    name: 'Sales (Petugas Lapangan)',
    division: 'Petugas Survey & Pendaftaran',
    description: 'Melaksanakan survei pipa dan pengukuran jaringan sambungan baru di lokasi pemohon.',
    permissions: {
      dashboard: { view: true, create: false, edit: false, delete: false, export: false },
      pendaftaran: { view: true, create: false, edit: true, delete: false, export: false },
      repair: { view: false, create: false, edit: false, delete: false, export: false },
      forms: { view: false, create: false, edit: false, delete: false, export: false },
      pengguna: { view: false, create: false, edit: false, delete: false, export: false },
      workflow: { view: false, create: false, edit: false, delete: false, export: false },
      pengaturan: { view: false, create: false, edit: false, delete: false, export: false },
      log_aktivitas: { view: false, create: false, edit: false, delete: false, export: false },
    },
  },
  {
    id: 'role_nc',
    name: 'NC (New Connection)',
    division: 'Tim Instalasi Sambungan Baru',
    description: 'Pemasangan pipa dinas dan pemasangan meter air baru setelah pembayaran tervalidasi.',
    permissions: {
      dashboard: { view: true, create: false, edit: false, delete: false, export: false },
      pendaftaran: { view: true, create: false, edit: true, delete: false, export: false },
      repair: { view: false, create: false, edit: false, delete: false, export: false },
      forms: { view: false, create: false, edit: false, delete: false, export: false },
      pengguna: { view: false, create: false, edit: false, delete: false, export: false },
      workflow: { view: false, create: false, edit: false, delete: false, export: false },
      pengaturan: { view: false, create: false, edit: false, delete: false, export: false },
      log_aktivitas: { view: false, create: false, edit: false, delete: false, export: false },
    },
  },
  {
    id: 'role_repair',
    name: 'Minor Repair (Teknisi)',
    division: 'Tim Perbaikan & Material',
    description: 'Eksekusi perbaikan pipa bocor, meter air rusak, dan pelaporan material yang digunakan.',
    permissions: {
      dashboard: { view: true, create: false, edit: false, delete: false, export: false },
      pendaftaran: { view: false, create: false, edit: false, delete: false, export: false },
      repair: { view: true, create: false, edit: true, delete: false, export: false },
      forms: { view: false, create: false, edit: false, delete: false, export: false },
      pengguna: { view: false, create: false, edit: false, delete: false, export: false },
      workflow: { view: false, create: false, edit: false, delete: false, export: false },
      pengaturan: { view: false, create: false, edit: false, delete: false, export: false },
      log_aktivitas: { view: false, create: false, edit: false, delete: false, export: false },
    },
  },
];

const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr_admin_01',
    name: 'Rani Prameswari (Admin)',
    email: 'admin@aetra.demo',
    role_id: 'role_admin',
    role_name: 'Admin Aetra',
    division: 'Manajemen Pusat & Pengaturan',
    phone_number: '0812-0000-1001',
    created_at: new Date().toISOString(),
  },
  {
    id: 'usr_cs_01',
    name: 'Intan Permatasari (CS)',
    email: 'cs@aetra.demo',
    role_id: 'role_cs',
    role_name: 'Customer Service (CS)',
    division: 'Pintu Masuk Pendaftaran & Complain',
    phone_number: '0812-0000-1002',
    created_at: new Date().toISOString(),
  },
  {
    id: 'usr_spv_sales_01',
    name: 'Bagas Adhi Nugroho (SPV Sales)',
    email: 'spv.sales@aetra.demo',
    role_id: 'role_spv_sales',
    role_name: 'SPV Sales',
    division: 'Supervisor Divisi Sales',
    phone_number: '0812-0000-1003',
    created_at: new Date().toISOString(),
  },
  {
    id: 'usr_spv_tech_01',
    name: 'Fikri Maulana (SPV Technical)',
    email: 'spv.technical@aetra.demo',
    role_id: 'role_spv_tech',
    role_name: 'SPV Technical',
    division: 'Supervisor Divisi Teknik',
    phone_number: '0812-0000-1004',
    created_at: new Date().toISOString(),
  },
  {
    id: 'usr_sales_01',
    name: 'Sarah Wijaya (Sales)',
    email: 'sales@aetra.demo',
    role_id: 'role_sales',
    role_name: 'Sales (Petugas Lapangan)',
    division: 'Petugas Survey & Pendaftaran',
    phone_number: '0812-0000-1005',
    created_at: new Date().toISOString(),
  },
  {
    id: 'usr_nc_01',
    name: 'Joko Susilo (NC)',
    email: 'nc@aetra.demo',
    role_id: 'role_nc',
    role_name: 'NC (New Connection)',
    division: 'Tim Instalasi Sambungan Baru',
    phone_number: '0812-0000-1006',
    created_at: new Date().toISOString(),
  },
  {
    id: 'usr_repair_01',
    name: 'Dedi Kurniawan (Teknisi)',
    email: 'repair@aetra.demo',
    role_id: 'role_repair',
    role_name: 'Minor Repair (Teknisi)',
    division: 'Tim Perbaikan & Material',
    phone_number: '0812-0000-1007',
    created_at: new Date().toISOString(),
  },
];

const INITIAL_SETTINGS: AppSettings = {
  id: 'set_01',
  app_name: 'Aetra Tangerang',
  company_name: 'PT Aetra Air Tangerang',
  tagline: 'Portal Layanan Terpadu Air Minum',
  logo_url: '',
  favicon_url: '',
  accent_color: '#0077BD',
  login_title: 'Portal Layanan Terpadu',
  login_subtitle: 'Akses staf internal, pendaftaran mandiri sambungan baru, dan pelacakan keluhan pelanggan.',
  login_badge: 'Layanan Air Terpadu PT Aetra',
  login_hero_image: '',
  support_email: 'layanan@aetratangerang.co.id',
  support_phone: '021 598 5474',
  updated_at: new Date().toISOString(),
};

interface AppContextType {
  appSettings: AppSettings;
  roles: Role[];
  users: UserProfile[];
  currentUserId: string;
  currentRole: Role;
  currentUser: UserProfile;
  registrations: Registration[];
  repairOrders: RepairOrder[];
  activeView: ModuleKey;
  tiDBConnected: boolean;
  tiDBLatency: number;
  setActiveView: (view: ModuleKey) => void;
  switchUser: (userId: string) => void;
  can: (module: ModuleKey, action?: keyof ModulePermission) => boolean;
  updateAppSettings: (updates: Partial<AppSettings>) => void;
  updateRolePermissions: (roleId: string, module: ModuleKey, permissions: Partial<ModulePermission>) => void;
  addUser: (user: Omit<UserProfile, 'id' | 'created_at'>) => void;
  updateUser: (id: string, updates: Partial<UserProfile>) => void;
  deleteUser: (id: string) => void;
  addRegistration: (newReg: Omit<Registration, 'id' | 'created_at'>) => Promise<Registration>;
  updateRegistration: (id: string, updates: Partial<Registration>) => Promise<void>;
  deleteRegistration: (id: string) => Promise<void>;
  addRepairOrder: (newOrder: Omit<RepairOrder, 'id' | 'created_at'>) => Promise<RepairOrder>;
  updateRepairOrder: (id: string, updates: Partial<RepairOrder>) => Promise<void>;
  deleteRepairOrder: (id: string) => Promise<void>;
  checkTiDBStatus: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToastBase();

  const [appSettings, setAppSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [roles, setRoles] = useState<Role[]>(INITIAL_ROLES);
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [currentUserId, setCurrentUserId] = useState<string>('usr_admin_01');
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [repairOrders, setRepairOrders] = useState<RepairOrder[]>([]);
  const [activeView, setActiveView] = useState<ModuleKey>('dashboard');
  const [tiDBConnected, setTiDBConnected] = useState<boolean>(true);
  const [tiDBLatency, setTiDBLatency] = useState<number>(108);

  // Check TiDB Connection Status
  const checkTiDBStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/tidb/status');
      const json = await res.json();
      setTiDBConnected(Boolean(json.ok));
      if (json.latency) setTiDBLatency(json.latency);
    } catch {
      setTiDBConnected(false);
    }
  }, []);

  // Initial Sync with TiDB Cloud on mount
  useEffect(() => {
    checkTiDBStatus();
    fetch('/api/tidb/sync-all')
      .then((res) => res.json())
      .then((res) => {
        if (res.data) {
          if (res.data.registrations && res.data.registrations.length > 0) {
            setRegistrations(res.data.registrations);
          }
          if (res.data.repair_orders && res.data.repair_orders.length > 0) {
            setRepairOrders(res.data.repair_orders);
          }
          if (res.data.app_settings && res.data.app_settings.length > 0) {
            setAppSettings((prev) => ({ ...prev, ...res.data.app_settings[0] }));
          }
          if (res.data.profiles && res.data.profiles.length > 0) {
            const mappedProfiles: UserProfile[] = res.data.profiles.map((p: any) => ({
              ...p,
              name: p.full_name || p.name || p.email?.split('@')[0] || 'Staf Aetra',
              full_name: p.full_name || p.name || 'Staf Aetra',
              division: p.department || p.division || 'Operasional',
              role_name: p.role_name || 'Staf',
            }));
            setUsers(mappedProfiles);
          }
        }
      })
      .catch((err) => console.warn('[TiDB initial sync warning]:', err));
  }, [checkTiDBStatus]);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0] || INITIAL_USERS[0];
  const currentRole = roles.find((r) => r.id === currentUser.role_id) || roles[0];

  const can = (module: ModuleKey, action: keyof ModulePermission = 'view'): boolean => {
    if (currentRole.is_admin) return true;
    const modPerm = currentRole.permissions[module];
    if (!modPerm) return false;
    return Boolean(modPerm[action]);
  };

  const switchUser = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUserId(userId);
      showToast(`Beralih ke profil: ${found.name} (${found.role_name})`, 'info');
    }
  };

  const updateAppSettings = async (updates: Partial<AppSettings>) => {
    const next = { ...appSettings, ...updates, updated_at: new Date().toISOString() };
    setAppSettings(next);
    await db.from('app_settings').insert(next);
    showToast('Pengaturan branding disimpan ke TiDB Cloud', 'success');
  };

  const updateRolePermissions = (roleId: string, module: ModuleKey, permissions: Partial<ModulePermission>) => {
    setRoles((prev) =>
      prev.map((role) => {
        if (role.id !== roleId) return role;
        const currentModPerm = role.permissions[module] || { view: false };
        return {
          ...role,
          permissions: {
            ...role.permissions,
            [module]: { ...currentModPerm, ...permissions },
          },
        };
      })
    );
    showToast('Hak akses role berhasil diperbarui', 'success');
  };

  const addUser = async (newUser: Omit<UserProfile, 'id' | 'created_at'>) => {
    const id = `usr_${Date.now()}`;
    const userWithId: UserProfile = {
      ...newUser,
      id,
      created_at: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, userWithId]);
    await db.from('profiles').insert(userWithId);
    showToast(`User ${newUser.name} berhasil ditambahkan ke TiDB Cloud`, 'success');
  };

  const updateUser = async (id: string, updates: Partial<UserProfile>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const role = updates.role_id ? roles.find((r) => r.id === updates.role_id) : undefined;
        return {
          ...u,
          ...updates,
          role_name: role ? role.name : u.role_name,
          division: role ? role.division : u.division,
        };
      })
    );
    const updater = await db.from('profiles').update(updates);
    await updater.eq('id', id);
    showToast('Data pengguna diperbarui di TiDB Cloud', 'success');
  };

  const deleteUser = async (id: string) => {
    if (id === 'usr_admin_01') {
      showToast('Admin Pusat bawaan tidak boleh dihapus.', 'error');
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
    const deleter = await db.from('profiles').delete();
    await deleter.eq('id', id);
    showToast('Pengguna dihapus dari TiDB Cloud', 'info');
  };

  const addRegistration = async (newReg: Omit<Registration, 'id' | 'created_at'>): Promise<Registration> => {
    const id = `reg_${Date.now()}`;
    const item: Registration = {
      ...newReg,
      id,
      created_at: new Date().toISOString(),
    };
    setRegistrations((prev) => [item, ...prev]);
    await db.from('registrations').insert(item);
    showToast(`Tiket pendaftaran ${item.ticket_number} tercatat di TiDB Cloud`, 'success');
    return item;
  };

  const updateRegistration = async (id: string, updates: Partial<Registration>) => {
    setRegistrations((prev) =>
      prev.map((reg) => (reg.id === id ? { ...reg, ...updates, updated_at: new Date().toISOString() } : reg))
    );
    const updater = await db.from('registrations').update(updates);
    await updater.eq('id', id);
    showToast('Status pendaftaran berhasil diperbarui di TiDB Cloud', 'success');
  };

  const deleteRegistration = async (id: string) => {
    setRegistrations((prev) => prev.filter((reg) => reg.id !== id));
    const deleter = await db.from('registrations').delete();
    await deleter.eq('id', id);
    showToast('Data pendaftaran berhasil dihapus dari TiDB Cloud', 'info');
  };

  const addRepairOrder = async (newOrder: Omit<RepairOrder, 'id' | 'created_at'>): Promise<RepairOrder> => {
    const id = `rep_${Date.now()}`;
    const item: RepairOrder = {
      ...newOrder,
      id,
      created_at: new Date().toISOString(),
    };
    setRepairOrders((prev) => [item, ...prev]);
    await db.from('repair_orders').insert(item);
    showToast(`Tiket perbaikan ${item.ticket_number} tersimpan di TiDB Cloud`, 'success');
    return item;
  };

  const updateRepairOrder = async (id: string, updates: Partial<RepairOrder>) => {
    setRepairOrders((prev) =>
      prev.map((order) => (order.id === id ? { ...order, ...updates, updated_at: new Date().toISOString() } : order))
    );
    const updater = await db.from('repair_orders').update(updates);
    await updater.eq('id', id);
    showToast('Status perbaikan diperbarui di TiDB Cloud', 'success');
  };

  const deleteRepairOrder = async (id: string) => {
    setRepairOrders((prev) => prev.filter((order) => order.id !== id));
    const deleter = await db.from('repair_orders').delete();
    await deleter.eq('id', id);
    showToast('Tiket perbaikan dihapus dari TiDB Cloud', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        appSettings,
        roles,
        users,
        currentUserId,
        currentRole,
        currentUser,
        registrations,
        repairOrders,
        activeView,
        tiDBConnected,
        tiDBLatency,
        setActiveView,
        switchUser,
        can,
        updateAppSettings,
        updateRolePermissions,
        addUser,
        updateUser,
        deleteUser,
        addRegistration,
        updateRegistration,
        deleteRegistration,
        addRepairOrder,
        updateRepairOrder,
        deleteRepairOrder,
        checkTiDBStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
