import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, Role } from '../types';
import { useToastBase } from './ToastContext';

interface AuthContextType {
  user: UserProfile;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  switchUser: (userId: string) => void;
  availableUsers: UserProfile[];
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
}

const DEFAULT_ADMIN: UserProfile = {
  id: 'usr_admin_01',
  name: 'Rani Prameswari (Admin)',
  full_name: 'Rani Prameswari (Admin)',
  email: 'admin@aetra.demo',
  role_id: 'role_admin',
  role_name: 'Admin Aetra',
  division: 'Manajemen Pusat & Pengaturan',
  department: 'Manajemen Pusat & Pengaturan',
  phone_number: '0812-0000-1001',
  created_at: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToastBase();
  const [user, setUser] = useState<UserProfile>(DEFAULT_ADMIN);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([DEFAULT_ADMIN]);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Load available users from TiDB
  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/tidb/table/profiles');
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        const mapped: UserProfile[] = json.data.map((p: any) => ({
          ...p,
          name: p.full_name || p.name || p.email?.split('@')[0] || 'Staf Aetra',
          full_name: p.full_name || p.name || 'Staf Aetra',
          division: p.department || p.division || 'Operasional',
          role_name: p.role_name || 'Staf',
        }));
        setAvailableUsers(mapped);

        // Check if session stored
        const storedId = localStorage.getItem('aetra_active_user_id');
        const active = mapped.find((u) => u.id === storedId) || mapped[0];
        if (active) setUser(active);
      }
    } catch (err: any) {
      console.warn('[Auth] load users error:', err.message);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const login = async (email: string, password = 'password'): Promise<boolean> => {
    try {
      const res = await fetch('/api/tidb/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (json.error) {
        showToast(json.error, 'error');
        return false;
      }

      const rawUser = json.data.user;
      const loggedUser: UserProfile = {
        ...rawUser,
        name: rawUser.full_name || rawUser.name || rawUser.email.split('@')[0],
        full_name: rawUser.full_name,
        division: rawUser.department || rawUser.division || 'Operasional',
      };

      setUser(loggedUser);
      localStorage.setItem('aetra_active_user_id', loggedUser.id);
      setShowLoginModal(false);
      showToast(`Selamat datang kembali, ${loggedUser.name}!`, 'success');
      return true;
    } catch (err: any) {
      const found = availableUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (found) {
        setUser(found);
        localStorage.setItem('aetra_active_user_id', found.id);
        setShowLoginModal(false);
        showToast(`Masuk sebagai ${found.name}`, 'success');
        return true;
      }
      showToast('Kredensial tidak ditemukan.', 'error');
      return false;
    }
  };

  const logout = () => {
    setShowLoginModal(true);
    showToast('Silakan pilih profil staf atau masukkan akun Anda.', 'info');
  };

  const switchUser = (userId: string) => {
    const found = availableUsers.find((u) => u.id === userId);
    if (found) {
      setUser(found);
      localStorage.setItem('aetra_active_user_id', found.id);
      showToast(`Beralih ke staf: ${found.name} (${found.role_name})`, 'info');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: null,
        isAuthenticated: true,
        isLoading,
        login,
        logout,
        switchUser,
        availableUsers,
        showLoginModal,
        setShowLoginModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
