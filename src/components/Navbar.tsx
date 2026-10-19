import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { ModuleKey } from '../types';
import {
  Droplets,
  LayoutDashboard,
  ClipboardList,
  Wrench,
  Users2,
  Settings,
  History,
  Database,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  User,
  Shield,
  Activity,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { logout } = useAuth();
  const {
    appSettings,
    activeView,
    setActiveView,
    currentUser,
    currentRole,
    users,
    switchUser,
    can,
    tiDBConnected,
    tiDBLatency,
    checkTiDBStatus,
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navItems: { key: ModuleKey; label: string; icon: React.ElementType }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'pendaftaran', label: 'Pendaftaran Air', icon: ClipboardList },
    { key: 'repair', label: 'Perbaikan & Gangguan', icon: Wrench },
    { key: 'pengguna', label: 'Manajemen Staf', icon: Users2 },
    { key: 'pengaturan', label: 'Pengaturan & RBAC', icon: Settings },
    { key: 'log_aktivitas', label: 'Log Aktivitas', icon: History },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center shadow-md shadow-sky-500/20 text-white">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">
                  {appSettings.app_name || 'Aetra Tangerang'}
                </span>
                {/* TiDB Cloud Live Status Badge */}
                <div
                  onClick={() => checkTiDBStatus()}
                  title="Klik untuk cek ulang koneksi TiDB Cloud"
                  className={`cursor-pointer inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                    tiDBConnected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <Database className="w-3 h-3" />
                  <span>TiDB Cloud</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      tiDBConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  {tiDBConnected && <span className="text-[10px] opacity-75">{tiDBLatency}ms</span>}
                </div>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                {appSettings.company_name} &bull; MySQL Database
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const allowed = can(item.key, 'view');
              if (!allowed) return null;
              const Icon = item.icon;
              const isActive = activeView === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveView(item.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 shadow-xs border border-sky-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Profile Switcher */}
          <div className="relative">
            {(() => {
              const currentDisplayName = currentUser?.name || currentUser?.full_name || 'Admin Aetra';
              const currentRoleTitle = currentRole?.name || currentUser?.role_name || 'Administrator';
              return (
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 pl-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition-all text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {currentDisplayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block leading-tight pr-1">
                    <p className="text-xs font-bold text-slate-800 line-clamp-1">{currentDisplayName}</p>
                    <p className="text-[10px] font-medium text-sky-600">{currentRoleTitle}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
              );
            })()}

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-slide-up">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Profil Saat Ini
                  </p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">
                    {currentUser?.name || currentUser?.full_name || 'Admin Aetra'}
                  </p>
                  <p className="text-xs text-sky-600 font-medium">{currentUser?.email || 'admin@aetra.demo'}</p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 text-xs font-medium border border-sky-100">
                    <Shield className="w-3.5 h-3.5" />
                    <span>{currentRole?.name || currentUser?.role_name || 'Administrator'}</span>
                  </div>
                </div>

                <div className="p-2">
                  <p className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Ganti Profil Staf (Simulasi RBAC)
                  </p>
                  <div className="max-h-56 overflow-y-auto space-y-1 mt-1">
                    {users.map((u) => {
                      const isCurrent = u.id === currentUser?.id;
                      const uDisplayName = u.name || u.full_name || u.email || 'Pengguna';
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            switchUser(u.id);
                            setIsUserMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                            isCurrent
                              ? 'bg-sky-50 text-sky-700 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <p className="font-medium text-slate-800">{uDisplayName}</p>
                            <p className="text-[10px] text-slate-500">{u.role_name || 'Staf'}</p>
                          </div>
                          {isCurrent && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* TiDB Connection Info in Dropdown */}
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <Database className="w-3.5 h-3.5 text-sky-600" />
                    <span>TiDB MySQL Cloud</span>
                  </span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Online
                  </span>
                </div>

                <div className="p-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      logout();
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-center"
                  >
                    Keluar / Halaman Login & Pelacakan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="lg:hidden flex items-center gap-1 py-2 border-t border-slate-100 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const allowed = can(item.key, 'view');
            if (!allowed) return null;
            const Icon = item.icon;
            const isActive = activeView === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveView(item.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
