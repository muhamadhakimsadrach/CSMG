import React from 'react';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, ClipboardList, Wrench, Settings } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { activeView, setActiveView, currentRole } = useApp();

  const isSettingsActive =
    activeView === 'workflow_builder' ||
    activeView === 'user_management' ||
    activeView === 'branding_customization' ||
    activeView === 'database_schema';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg">
      <div className="grid grid-cols-4 items-center h-14">
        {/* Tab 1: Dashboard */}
        <button
          onClick={() => setActiveView('dashboard')}
          className={`min-h-[44px] flex flex-col items-center justify-center transition-colors cursor-pointer ${
            activeView === 'dashboard' ? 'text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-0.5">Ringkasan</span>
        </button>

        {/* Tab 2: Pendaftaran */}
        <button
          onClick={() => setActiveView('portal_pendaftaran')}
          className={`min-h-[44px] flex flex-col items-center justify-center transition-colors cursor-pointer ${
            activeView === 'portal_pendaftaran'
              ? 'text-slate-900 font-semibold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-0.5">Pendaftaran</span>
        </button>

        {/* Tab 3: Minor Repair */}
        <button
          onClick={() => setActiveView('papan_repair')}
          className={`min-h-[44px] flex flex-col items-center justify-center transition-colors cursor-pointer ${
            activeView === 'papan_repair' ? 'text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Wrench className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-0.5">Repair</span>
        </button>

        {/* Tab 4: Pengaturan */}
        <button
          onClick={() => {
            if (currentRole.is_admin) {
              setActiveView('workflow_builder');
            } else {
              setActiveView('database_schema');
            }
          }}
          className={`min-h-[44px] flex flex-col items-center justify-center transition-colors cursor-pointer ${
            isSettingsActive ? 'text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-0.5">Pengaturan</span>
        </button>
      </div>
    </nav>
  );
};
