import React from 'react';
import { useApp } from '../context/AppContext';
import { ModuleKey } from '../types';
import {
  LayoutDashboard,
  ClipboardList,
  Wrench,
  GitFork,
  Users2,
  Palette,
  Database,
  Building,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    appSettings,
    currentRole,
    activeView,
    setActiveView,
    can,
    supabaseConfig,
  } = useApp();

  const mainNavItems: { key: ModuleKey; label: string; icon: React.ReactNode }[] = [
    {
      key: 'dashboard',
      label: 'Ringkasan Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      key: 'portal_pendaftaran',
      label: 'Pendaftaran Pelanggan',
      icon: <ClipboardList className="w-4 h-4" />,
    },
    {
      key: 'papan_repair',
      label: 'Papan Kerja Minor Repair',
      icon: <Wrench className="w-4 h-4" />,
    },
  ];

  const adminNavItems: { key: ModuleKey; label: string; icon: React.ReactNode }[] = [
    {
      key: 'workflow_builder',
      label: 'Editor Alur Kerja',
      icon: <GitFork className="w-4 h-4" />,
    },
    {
      key: 'user_management',
      label: 'Manajemen RBAC & User',
      icon: <Users2 className="w-4 h-4" />,
    },
    {
      key: 'branding_customization',
      label: 'Kustomisasi Tampilan',
      icon: <Palette className="w-4 h-4" />,
    },
    {
      key: 'database_schema',
      label: 'Skema Database & RLS',
      icon: <Database className="w-4 h-4" />,
    },
  ];

  const filteredMainItems = mainNavItems.filter((item) => can(item.key, 'view'));
  const filteredAdminItems = adminNavItems.filter((item) => can(item.key, 'view'));

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200/90 h-[calc(100vh-3.5rem)] sticky top-14 shrink-0 justify-between select-none">
      <div className="p-4 space-y-6 overflow-y-auto">
        {/* Dynamic Company Brand Header */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-3">
          {appSettings.logo_url ? (
            <img
              src={appSettings.logo_url}
              alt={appSettings.company_name}
              className="w-10 h-10 object-contain rounded-lg border border-slate-200 bg-white p-0.5 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
              <Building className="w-5 h-5 text-slate-200" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-900 truncate">
              {appSettings.company_name}
            </h4>
            <p className="text-[11px] text-slate-500 truncate leading-tight">
              {appSettings.company_tagline || 'Sistem Terpadu Multi-Divisi'}
            </p>
          </div>
        </div>

        {/* Section 1: Operasional Utama */}
        <div>
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Operasional Layanan
          </p>
          <nav className="space-y-1">
            {filteredMainItems.map((item) => {
              const isActive = activeView === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveView(item.key)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Section 2: Pusat Pengaturan Admin & Workflow */}
        {filteredAdminItems.length > 0 && (
          <div>
            <div className="px-3 flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Pusat Pengaturan
              </p>
              {currentRole.is_admin && (
                <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  Admin
                </span>
              )}
            </div>
            <nav className="space-y-1">
              {filteredAdminItems.map((item) => {
                const isActive = activeView === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveView(item.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Sidebar Footer: User Status & Database Health */}
      <div className="p-3.5 border-t border-slate-200/90 bg-slate-50/50 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span className="truncate max-w-[120px]">{currentRole.name}</span>
          </div>
          <span className="text-slate-400 text-[10px]">{currentRole.division}</span>
        </div>

        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                supabaseConfig.isConnected ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
            {supabaseConfig.isConnected ? 'Supabase Live' : 'Demo Local'}
          </span>
          <span className="text-slate-400 font-mono">v1.2.0</span>
        </div>
      </div>
    </aside>
  );
};
