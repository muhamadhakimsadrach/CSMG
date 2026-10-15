import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AppSettings,
  Role,
  UserProfile,
  WorkflowStage,
  Registration,
  RepairOrder,
  ModuleKey,
  ModulePermission,
  SupabaseConfig,
  RepairLog,
} from '../types';
import {
  INITIAL_SETTINGS,
  INITIAL_ROLES,
  INITIAL_USERS,
  INITIAL_REGISTRATION_STAGES,
  INITIAL_REPAIR_STAGES,
  INITIAL_REGISTRATIONS,
  INITIAL_REPAIR_ORDERS,
} from '../lib/mockData';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  getSupabaseClient,
  testSupabaseConnection,
} from '../lib/supabaseClient';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  // Current user & RBAC
  currentUser: UserProfile;
  currentRole: Role;
  users: UserProfile[];
  roles: Role[];
  switchUser: (userId: string) => void;
  can: (module: ModuleKey, action?: keyof ModulePermission) => boolean;
  
  // App Settings & Branding
  appSettings: AppSettings;
  updateAppSettings: (updates: Partial<AppSettings>) => void;
  
  // RBAC Management
  updateRolePermissions: (roleId: string, module: ModuleKey, permissions: Partial<ModulePermission>) => void;
  addUser: (newUser: Omit<UserProfile, 'id' | 'created_at'>) => void;
  updateUser: (id: string, updates: Partial<UserProfile>) => void;
  deleteUser: (id: string) => void;
  
  // Workflow Stages
  registrationStages: WorkflowStage[];
  repairStages: WorkflowStage[];
  updateWorkflowStages: (category: 'registration' | 'repair', stages: WorkflowStage[]) => void;
  addWorkflowStage: (category: 'registration' | 'repair', stage: Omit<WorkflowStage, 'id' | 'order'>) => void;
  deleteWorkflowStage: (category: 'registration' | 'repair', id: string) => void;
  
  // Registrations
  registrations: Registration[];
  addRegistration: (data: Omit<Registration, 'id' | 'registration_no' | 'created_at' | 'updated_at'>) => void;
  updateRegistrationStatus: (id: string, newStatus: string, note?: string) => void;
  verifyDocument: (regId: string, docId: string, verified: boolean, notes?: string) => void;
  
  // Repair Orders
  repairOrders: RepairOrder[];
  addRepairOrder: (data: Omit<RepairOrder, 'id' | 'ticket_no' | 'created_at' | 'updated_at' | 'logs'>) => void;
  dispatchRepairTicketFromRegistration: (reg: Registration, customIssue?: string, techName?: string) => void;
  updateRepairStatus: (id: string, newStatus: string, logNote?: string) => void;
  assignTechnician: (id: string, techName: string) => void;
  addRepairLog: (id: string, actionSummary: string, note: string) => void;
  updateRepairDetails: (id: string, updates: Partial<RepairOrder>) => void;
  
  // Navigation & UI
  activeView: ModuleKey;
  setActiveView: (view: ModuleKey) => void;
  toast: ToastState | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  
  // Supabase
  supabaseConfig: SupabaseConfig;
  updateSupabaseCredentials: (url: string, key: string) => Promise<{ success: boolean; message: string }>;
  disconnectSupabase: () => void;
  isSyncing: boolean;
  syncWithSupabase: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initial State from localStorage or Defaults
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('app_settings_data');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  const [roles, setRoles] = useState<Role[]>(() => {
    const saved = localStorage.getItem('app_roles_data');
    return saved ? JSON.parse(saved) : INITIAL_ROLES;
  });

  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('app_users_data');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem('app_active_user_id') || 'usr_admin_01';
  });

  const [registrationStages, setRegistrationStages] = useState<WorkflowStage[]>(() => {
    const saved = localStorage.getItem('app_reg_stages');
    return saved ? JSON.parse(saved) : INITIAL_REGISTRATION_STAGES;
  });

  const [repairStages, setRepairStages] = useState<WorkflowStage[]>(() => {
    const saved = localStorage.getItem('app_rep_stages');
    return saved ? JSON.parse(saved) : INITIAL_REPAIR_STAGES;
  });

  const [registrations, setRegistrations] = useState<Registration[]>(() => {
    const saved = localStorage.getItem('app_registrations');
    return saved ? JSON.parse(saved) : INITIAL_REGISTRATIONS;
  });

  const [repairOrders, setRepairOrders] = useState<RepairOrder[]>(() => {
    const saved = localStorage.getItem('app_repair_orders');
    return saved ? JSON.parse(saved) : INITIAL_REPAIR_ORDERS;
  });

  const [activeView, setActiveView] = useState<ModuleKey>('dashboard');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Supabase config state
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => {
    const stored = getStoredSupabaseConfig();
    return {
      url: stored.url,
      anonKey: stored.anonKey,
      isConnected: Boolean(stored.url && stored.anonKey),
    };
  });

  // Current active user object & role
  const currentUser = users.find((u) => u.id === currentUserId) || users[0];
  const currentRole = roles.find((r) => r.id === currentUser.role_id) || roles[0];

  // Helper to show toasts
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('app_settings_data', JSON.stringify(appSettings));
  }, [appSettings]);

  useEffect(() => {
    localStorage.setItem('app_roles_data', JSON.stringify(roles));
  }, [roles]);

  useEffect(() => {
    localStorage.setItem('app_users_data', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('app_reg_stages', JSON.stringify(registrationStages));
  }, [registrationStages]);

  useEffect(() => {
    localStorage.setItem('app_rep_stages', JSON.stringify(repairStages));
  }, [repairStages]);

  useEffect(() => {
    localStorage.setItem('app_registrations', JSON.stringify(registrations));
  }, [registrations]);

  useEffect(() => {
    localStorage.setItem('app_repair_orders', JSON.stringify(repairOrders));
  }, [repairOrders]);

  // Check RBAC permission for module & action
  const can = (module: ModuleKey, action: keyof ModulePermission = 'view'): boolean => {
    if (currentRole.is_admin) return true;
    const modPerm = currentRole.permissions[module];
    if (!modPerm) return false;
    return Boolean(modPerm[action]);
  };

  // Switch active user
  const switchUser = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUserId(userId);
      localStorage.setItem('app_active_user_id', userId);
      showToast(`Beralih ke profil: ${found.name} (${found.role_name})`, 'info');
      // If the current active view is not allowed for this role, redirect to dashboard or first allowed view
      const targetRole = roles.find((r) => r.id === found.role_id);
      if (targetRole && !targetRole.is_admin) {
        const allowed = targetRole.permissions[activeView]?.view;
        if (!allowed) {
          setActiveView('dashboard');
        }
      }
    }
  };

  // App settings
  const updateAppSettings = (updates: Partial<AppSettings>) => {
    setAppSettings((prev) => ({
      ...prev,
      ...updates,
      updated_at: new Date().toISOString(),
    }));
    showToast('Pengaturan branding perusahaan berhasil disimpan', 'success');
  };

  // Update permissions for role
  const updateRolePermissions = (roleId: string, module: ModuleKey, permissions: Partial<ModulePermission>) => {
    setRoles((prev) =>
      prev.map((role) => {
        if (role.id !== roleId) return role;
        const currentModPerm = role.permissions[module] || { view: false };
        return {
          ...role,
          permissions: {
            ...role.permissions,
            [module]: {
              ...currentModPerm,
              ...permissions,
            },
          },
        };
      })
    );
    showToast('Hak akses modul role berhasil diperbarui', 'success');
  };

  // Add / Edit / Delete User
  const addUser = (newUser: Omit<UserProfile, 'id' | 'created_at'>) => {
    const id = `usr_${Date.now()}`;
    const userWithId: UserProfile = {
      ...newUser,
      id,
      created_at: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, userWithId]);
    showToast(`User ${newUser.name} berhasil ditambahkan`, 'success');
  };

  const updateUser = (id: string, updates: Partial<UserProfile>) => {
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
    showToast('Data pengguna berhasil diperbarui', 'success');
  };

  const deleteUser = (id: string) => {
    if (id === 'usr_admin_01') {
      showToast('Admin Pusat bawaan tidak boleh dihapus.', 'error');
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
    if (currentUserId === id) {
      setCurrentUserId('usr_admin_01');
    }
    showToast('User berhasil dihapus', 'info');
  };

  // Workflow Stages
  const updateWorkflowStages = (category: 'registration' | 'repair', stages: WorkflowStage[]) => {
    const sorted = stages.map((s, index) => ({ ...s, order: index + 1 }));
    if (category === 'registration') {
      setRegistrationStages(sorted);
    } else {
      setRepairStages(sorted);
    }
    showToast(`Alur kerja ${category === 'registration' ? 'pendaftaran' : 'perbaikan'} berhasil diperbarui`, 'success');
  };

  const addWorkflowStage = (category: 'registration' | 'repair', stage: Omit<WorkflowStage, 'id' | 'order'>) => {
    const id = `stg_${Date.now()}`;
    if (category === 'registration') {
      const order = registrationStages.length + 1;
      setRegistrationStages((prev) => [...prev, { ...stage, id, order, category }]);
    } else {
      const order = repairStages.length + 1;
      setRepairStages((prev) => [...prev, { ...stage, id, order, category }]);
    }
    showToast(`Tahapan alur baru berhasil ditambahkan`, 'success');
  };

  const deleteWorkflowStage = (category: 'registration' | 'repair', id: string) => {
    if (category === 'registration') {
      if (registrationStages.length <= 2) {
        showToast('Minimal harus ada 2 tahapan dalam alur pendaftaran', 'error');
        return;
      }
      setRegistrationStages((prev) => prev.filter((s) => s.id !== id));
    } else {
      if (repairStages.length <= 2) {
        showToast('Minimal harus ada 2 tahapan dalam alur repair', 'error');
        return;
      }
      setRepairStages((prev) => prev.filter((s) => s.id !== id));
    }
    showToast('Tahapan alur dihapus', 'info');
  };

  // Registrations
  const addRegistration = (data: Omit<Registration, 'id' | 'registration_no' | 'created_at' | 'updated_at'>) => {
    const seq = String(registrations.length + 1).padStart(4, '0');
    const registration_no = `REG-2026-${seq}`;
    const newReg: Registration = {
      ...data,
      id: `reg_${Date.now()}`,
      registration_no,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setRegistrations((prev) => [newReg, ...prev]);
    showToast(`Pendaftaran ${registration_no} atas nama ${data.customer_name} berhasil dibuat!`, 'success');
  };

  const updateRegistrationStatus = (id: string, newStatus: string, note?: string) => {
    setRegistrations((prev) =>
      prev.map((reg) => {
        if (reg.id !== id) return reg;
        return {
          ...reg,
          status: newStatus,
          notes: note ? `${reg.notes ? reg.notes + '\n' : ''}[${new Date().toLocaleDateString('id-ID')}] ${note}` : reg.notes,
          updated_at: new Date().toISOString(),
        };
      })
    );
    showToast(`Status pendaftaran diperbarui menjadi "${newStatus}"`, 'success');
  };

  const verifyDocument = (regId: string, docId: string, verified: boolean, notes?: string) => {
    setRegistrations((prev) =>
      prev.map((reg) => {
        if (reg.id !== regId) return reg;
        const docs = reg.documents.map((d) => {
          if (d.id !== docId) return d;
          return {
            ...d,
            verified,
            notes: notes || d.notes,
          };
        });
        return {
          ...reg,
          documents: docs,
          updated_at: new Date().toISOString(),
        };
      })
    );
    showToast(verified ? 'Dokumen diverifikasi valid' : 'Verifikasi dokumen ditolak/dibatalkan', 'info');
  };

  // Repair Orders
  const addRepairOrder = (data: Omit<RepairOrder, 'id' | 'ticket_no' | 'created_at' | 'updated_at' | 'logs'>) => {
    const seq = String(repairOrders.length + 101).padStart(4, '0');
    const ticket_no = `REP-2026-${seq}`;
    const initialLog: RepairLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      author_name: currentUser.name,
      author_role: currentUser.role_name,
      action_summary: 'Tiket Perbaikan Dibuat',
      note: `Keluhan: ${data.issue_description}`,
    };
    const newOrder: RepairOrder = {
      ...data,
      id: `rep_${Date.now()}`,
      ticket_no,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      logs: [initialLog],
    };
    setRepairOrders((prev) => [newOrder, ...prev]);
    showToast(`Tiket kerja ${ticket_no} berhasil diterbitkan`, 'success');
  };

  const dispatchRepairTicketFromRegistration = (
    reg: Registration,
    customIssue?: string,
    techName?: string
  ) => {
    const seq = String(repairOrders.length + 101).padStart(4, '0');
    const ticket_no = `REP-2026-${seq}`;
    const initialLog: RepairLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      author_name: currentUser.name,
      author_role: currentUser.role_name,
      action_summary: `Tiket Kerja Terintegrasi dari ${reg.registration_no}`,
      note: `Tiket terbit otomatis dari portal pendaftaran pelanggan: ${reg.customer_name} (${reg.package_plan}). Instruksi: ${
        customIssue || 'Pemasangan perangkat baru, terminasi kabel, & aktivasi sinyal.'
      }`,
    };
    const newOrder: RepairOrder = {
      id: `rep_${Date.now()}`,
      ticket_no,
      registration_no: reg.registration_no,
      installation_address: reg.installation_address,
      customer_name: reg.customer_name,
      contact_phone: reg.phone,
      unit_name: `Unit CPE / Terminal Router (${reg.package_plan})`,
      serial_number: `CPE-${Date.now().toString().slice(-6)}`,
      category: 'Modem / Router',
      issue_description:
        customIssue ||
        `Instalasi & perakitan perangkat baru untuk layanan ${reg.service_type} (${reg.package_plan}) di alamat pelanggan: ${reg.installation_address}`,
      priority: 'Tinggi',
      status: 'Tiket Masuk',
      assigned_technician: techName || 'Budi Santoso, S.T.',
      estimated_cost: 0,
      parts_used: ['Modem Router Gigabit Dual-Band', 'Patch Cord Serat Optik 3M', 'Kabel UTP Cat6 15M'],
      repair_notes: `Alamat Pemasangan: ${reg.installation_address}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      logs: [initialLog],
    };
    setRepairOrders((prev) => [newOrder, ...prev]);
    if (reg.status !== 'Instalasi Lapangan' && reg.status !== 'Layanan Aktif') {
      updateRegistrationStatus(reg.id, 'Instalasi Lapangan', `Tiket teknisi diterbitkan: ${ticket_no}`);
    }
    showToast(`Tiket kerja ${ticket_no} terhubung ke pendaftaran ${reg.registration_no}!`, 'success');
  };

  const updateRepairStatus = (id: string, newStatus: string, logNote?: string) => {
    setRepairOrders((prev) =>
      prev.map((order) => {
        if (order.id !== id) return order;
        const newLog: RepairLog = {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          author_name: currentUser.name,
          author_role: currentUser.role_name,
          action_summary: `Status diubah ke ${newStatus}`,
          note: logNote || `Status pekerjaan diperbarui dari "${order.status}" ke "${newStatus}".`,
          status_transition: `${order.status} → ${newStatus}`,
        };
        return {
          ...order,
          status: newStatus,
          updated_at: new Date().toISOString(),
          logs: [...order.logs, newLog],
        };
      })
    );
    showToast(`Status tiket perbaikan diperbarui menjadi "${newStatus}"`, 'success');
  };

  const assignTechnician = (id: string, techName: string) => {
    setRepairOrders((prev) =>
      prev.map((order) => {
        if (order.id !== id) return order;
        const newLog: RepairLog = {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          author_name: currentUser.name,
          author_role: currentUser.role_name,
          action_summary: `Penugasan Teknisi: ${techName}`,
          note: `Teknisi penanggung jawab ditugaskan kepada ${techName}`,
        };
        return {
          ...order,
          assigned_technician: techName,
          updated_at: new Date().toISOString(),
          logs: [...order.logs, newLog],
        };
      })
    );
    showToast(`Tiket ditugaskan kepada ${techName}`, 'success');
  };

  const addRepairLog = (id: string, actionSummary: string, note: string) => {
    setRepairOrders((prev) =>
      prev.map((order) => {
        if (order.id !== id) return order;
        const newLog: RepairLog = {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          author_name: currentUser.name,
          author_role: currentUser.role_name,
          action_summary: actionSummary,
          note,
        };
        return {
          ...order,
          updated_at: new Date().toISOString(),
          logs: [...order.logs, newLog],
        };
      })
    );
    showToast('Log penanganan teknisi berhasil dicatat', 'success');
  };

  const updateRepairDetails = (id: string, updates: Partial<RepairOrder>) => {
    setRepairOrders((prev) =>
      prev.map((order) => {
        if (order.id !== id) return order;
        return {
          ...order,
          ...updates,
          updated_at: new Date().toISOString(),
        };
      })
    );
    showToast('Detail perbaikan berhasil diperbarui', 'success');
  };

  // Supabase live sync
  const updateSupabaseCredentials = async (url: string, key: string) => {
    const testResult = await testSupabaseConnection(url, key);
    if (testResult.success) {
      saveSupabaseConfig(url, key);
      setSupabaseConfig({
        url,
        anonKey: key,
        isConnected: true,
      });
      showToast('Koneksi Supabase aktif! Data dapat disinkronkan.', 'success');
      return { success: true, message: testResult.message };
    } else {
      return { success: false, message: testResult.message };
    }
  };

  const disconnectSupabase = () => {
    saveSupabaseConfig('', '');
    setSupabaseConfig({
      url: '',
      anonKey: '',
      isConnected: false,
    });
    showToast('Koneksi Supabase diputus. Kembali ke Mode Demo Lokal.', 'info');
  };

  const syncWithSupabase = async () => {
    const client = getSupabaseClient();
    if (!client) {
      showToast('Supabase belum terhubung. Konfigurasi URL dan Anon Key terlebih dahulu.', 'error');
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Coba ambil app_settings
      const { data: settingsData } = await client.from('app_settings').select('*').limit(1).maybeSingle();
      if (settingsData) {
        setAppSettings((prev) => ({
          ...prev,
          company_name: settingsData.company_name || prev.company_name,
          company_tagline: settingsData.company_tagline || prev.company_tagline,
          logo_url: settingsData.logo_url || prev.logo_url,
          support_email: settingsData.support_email || prev.support_email,
          support_phone: settingsData.support_phone || prev.support_phone,
        }));
      }

      // 2. Coba sinkronisasi registrations
      const { data: regData } = await client.from('registrations').select('*').order('created_at', { ascending: false });
      if (regData && regData.length > 0) {
        setRegistrations(regData);
      }

      // 3. Coba sinkronisasi repair orders
      const { data: repData } = await client.from('repair_orders').select('*').order('created_at', { ascending: false });
      if (repData && repData.length > 0) {
        setRepairOrders(repData);
      }

      showToast('Sinkronisasi data Supabase berhasil!', 'success');
    } catch (e: any) {
      showToast(`Gagal sinkronisasi: ${e?.message || 'Error jaringan'}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentRole,
        users,
        roles,
        switchUser,
        can,
        appSettings,
        updateAppSettings,
        updateRolePermissions,
        addUser,
        updateUser,
        deleteUser,
        registrationStages,
        repairStages,
        updateWorkflowStages,
        addWorkflowStage,
        deleteWorkflowStage,
        registrations,
        addRegistration,
        updateRegistrationStatus,
        verifyDocument,
        repairOrders,
        addRepairOrder,
        dispatchRepairTicketFromRegistration,
        updateRepairStatus,
        assignTechnician,
        addRepairLog,
        updateRepairDetails,
        activeView,
        setActiveView,
        toast,
        showToast,
        supabaseConfig,
        updateSupabaseCredentials,
        disconnectSupabase,
        isSyncing,
        syncWithSupabase,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
