import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Database,
  ChevronDown,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    appSettings,
    currentUser,
    currentRole,
    users,
    switchUser,
    activeView,
    setActiveView,
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const getBreadcrumbLabel = () => {
    switch (activeView) {
      case 'dashboard':
        return 'Ringkasan Eksekutif';
      case 'portal_pendaftaran':
        return 'Portal Pendaftaran Pelanggan';
      case 'papan_repair':
        return 'Papan Kerja Minor Repair';
      case 'workflow_builder':
        return 'Pusat Alur Kerja & Workflow';
      case 'user_management':
        return 'Manajemen Hak Akses & User';
      case 'branding_customization':
        return 'Kustomisasi Tampilan & Branding';
      case 'database_schema':
        return 'Skema Basis Data';
      default:
        return 'Sistem Operasional';
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark / Dynamic Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
          >
            {appSettings.logo_url ? (
              <img
                src={appSettings.logo_url}
                alt={appSettings.company_name}
                className="h-8 max-w-[120px] object-contain rounded-md"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
                ST
              </div>
            )}
            <div className="hidden sm:block">
              <span className="text-sm font-bold text-slate-900 tracking-tight block leading-tight whitespace-nowrap">
                {appSettings.company_name}
              </span>
            </div>
          </button>

          {/* Subtle separator */}
          <span className="hidden lg:inline text-slate-300 font-light text-base">/</span>

          {/* Contextual Module Name */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span>Operasional</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold">{getBreadcrumbLabel()}</span>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Compact Desktop) */}
        <div className="hidden md:flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setActiveView('portal_pendaftaran')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeView === 'portal_pendaftaran'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Pendaftaran
          </button>
          <button
            onClick={() => setActiveView('papan_repair')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeView === 'papan_repair'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Minor Repair
          </button>
          {currentRole.is_admin && (
            <button
              onClick={() => setActiveView('workflow_builder')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeView === 'workflow_builder' || activeView === 'user_management' || activeView === 'branding_customization'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Pengaturan Admin
            </button>
          )}
        </div>

        {/* Zone 3: Interactive Controls (System status indicator & Quick User/Role Switcher) */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* System Status Pill */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-700"
            title="Sistem & Basis Data Aktif"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Basis Data</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Online" />
          </div>

          {/* Quick Role / User Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 rounded-md bg-slate-800 text-white flex items-center justify-center text-[11px] font-bold">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden md:block">
                <span className="text-xs font-semibold text-slate-900 block leading-tight">
                  {currentUser.name.split(' ')[0]}
                </span>
                <span className="text-[10px] text-slate-500 block leading-none">
                  {currentRole.name}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in duration-100"
                onClick={() => setIsUserMenuOpen(false)}
              >
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    Profil Aktif Saat Ini
                  </p>
                  <p className="text-xs font-semibold text-slate-900 mt-0.5">{currentUser.name}</p>
                  <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    {currentRole.is_admin ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        <ShieldAlert className="w-3 h-3 text-amber-600" />
                        Akses Penuh (Admin Pusat)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                        <ShieldCheck className="w-3 h-3 text-sky-600" />
                        Akses Terbatas: {currentRole.division}
                      </span>
                    )}
                  </div>
                </div>

                <div className="py-1">
                  <p className="px-3.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Simulasi Akses Peran (RBAC)
                  </p>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => switchUser(u.id)}
                      className={`w-full px-3.5 py-2 text-left flex items-center justify-between text-xs hover:bg-slate-50 transition-colors cursor-pointer ${
                        u.id === currentUser.id ? 'bg-indigo-50/60 font-semibold text-indigo-900' : 'text-slate-700'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-slate-900">{u.name}</p>
                        <p className="text-[11px] text-slate-500">{u.role_name}</p>
                      </div>
                      {u.id === currentUser.id && (
                        <span className="text-[10px] text-indigo-600 font-bold bg-indigo-100/70 px-1.5 py-0.5 rounded">
                          Aktif
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="pt-1.5 border-t border-slate-100 px-3.5 pb-1">
                  <button
                    onClick={() => setActiveView('user_management')}
                    className="w-full py-1 text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                  >
                    Kelola Pengguna & Hak Akses →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
