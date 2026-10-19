import React from 'react';
import { ToastProvider } from './context/ToastContext';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { RegistrationPortal } from './components/RegistrationPortal';
import { RepairBoard } from './components/RepairBoard';
import { AdminSettings } from './components/AdminSettings';
import { ActivityLogView } from './components/ActivityLogView';
import { Login } from './pages/Login';
import { Database, X } from 'lucide-react';

const AppContent: React.FC = () => {
  const { activeView, tiDBLatency, appSettings } = useApp();
  const { showLoginModal, setShowLoginModal } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'pendaftaran' && <RegistrationPortal />}
        {activeView === 'repair' && <RepairBoard />}
        {activeView === 'pengguna' && <AdminSettings initialTab="rbac" />}
        {activeView === 'pengaturan' && <AdminSettings initialTab="tidb" />}
        {activeView === 'log_aktivitas' && <ActivityLogView />}
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200/80 py-5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">{appSettings.company_name}</span>
            <span>&bull;</span>
            <span>{appSettings.tagline}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <Database className="w-3.5 h-3.5 text-emerald-500" />
              <span>TiDB Cloud MySQL Online ({tiDBLatency}ms)</span>
            </div>
            <span>&bull;</span>
            <span className="text-slate-400">Layanan: {appSettings.support_phone}</span>
          </div>
        </div>
      </footer>

      {/* Login & Public Tracking Modal Overlay if triggered */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="relative max-w-4xl w-full overflow-hidden rounded-3xl shadow-2xl">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute right-4 top-4 z-50 p-2 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <Login />
          </div>
        </div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </AppProvider>
    </ToastProvider>
  );
};

export default App;
