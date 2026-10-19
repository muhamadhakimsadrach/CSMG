import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  Droplets,
  Lock,
  Mail,
  ArrowRight,
  Search,
  CheckCircle2,
  Clock,
  Phone,
  ShieldCheck,
  Building,
  User,
  Wrench,
  AlertCircle,
  Database,
  ExternalLink,
} from 'lucide-react';

export const Login: React.FC = () => {
  const { login, availableUsers } = useAuth();
  const { registrations, repairOrders, tiDBConnected, tiDBLatency, appSettings } = useApp();

  const [activeTab, setActiveTab] = useState<'login' | 'track'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tracking State
  const [trackTicket, setTrackTicket] = useState('');
  const [trackResult, setTrackResult] = useState<{
    type: 'registration' | 'repair';
    data: any;
  } | null>(null);
  const [trackError, setTrackError] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    await login(email, password || 'password');
    setIsSubmitting(false);
  };

  const handleQuickLogin = async (userEmail: string) => {
    setIsSubmitting(true);
    await login(userEmail, 'password');
    setIsSubmitting(false);
  };

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackTicket.trim()) return;

    const term = trackTicket.trim().toUpperCase();
    const foundReg = registrations.find(
      (r) =>
        r.ticket_number?.toUpperCase() === term ||
        r.customer_number?.toUpperCase() === term
    );

    if (foundReg) {
      setTrackResult({ type: 'registration', data: foundReg });
      setTrackError(false);
      return;
    }

    const foundRep = repairOrders.find(
      (r) =>
        r.ticket_number?.toUpperCase() === term ||
        r.customer_number?.toUpperCase() === term
    );

    if (foundRep) {
      setTrackResult({ type: 'repair', data: foundRep });
      setTrackError(false);
      return;
    }

    setTrackResult(null);
    setTrackError(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between text-slate-800 selection:bg-sky-500 selection:text-white">
      {/* Top Banner with TiDB Status */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-3 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight text-sm">
              {appSettings.company_name}
            </span>
            <span className="text-slate-400 text-xs hidden sm:inline ml-2">
              &bull; {appSettings.tagline}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-[11px] border border-slate-700">
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span>TiDB Cloud MySQL</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                tiDBConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'
              }`}
            />
            {tiDBConnected && <span className="text-emerald-400 font-mono text-[10px]">{tiDBLatency}ms</span>}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          
          {/* Left / Hero Column */}
          <div className="lg:col-span-5 bg-gradient-to-br from-sky-800 via-sky-700 to-cyan-800 text-white p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-6 shadow-inner">
                <Droplets className="w-7 h-7 text-white" />
              </div>
              <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-md mb-3 border border-white/20">
                Layanan Air Bersih Terpercaya
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                Portal Pelayanan Terpadu Aetra
              </h2>
              <p className="text-sky-100 text-xs sm:text-sm mt-3 leading-relaxed">
                Sistem pengelolaan sambungan air baru, pengaduan gangguan teknis, dan verifikasi alur kerja staf terpadu berbasis cloud TiDB MySQL.
              </p>
            </div>

            <div className="relative z-10 mt-8 pt-6 border-t border-white/20 space-y-3 text-xs">
              <div className="flex items-center gap-3 text-sky-100">
                <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Autentikasi Peran & Hak Akses (RBAC) Granular</span>
              </div>
              <div className="flex items-center gap-3 text-sky-100">
                <Clock className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Pelacakan SLA Respons Gangguan 24 Jam</span>
              </div>
              <div className="flex items-center gap-3 text-sky-100">
                <Phone className="w-4 h-4 text-cyan-300 shrink-0" />
                <span>Layanan Hotline: 021 598 5474 &bull; WA 24 Jam</span>
              </div>
            </div>
          </div>

          {/* Right / Interaction Column */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
            {/* Tabs */}
            <div>
              <div className="flex border-b border-slate-200 mb-6">
                <button
                  onClick={() => setActiveTab('login')}
                  className={`flex-1 pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'login'
                      ? 'border-sky-600 text-sky-700'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Masuk Staf Internal</span>
                </button>
                <button
                  onClick={() => setActiveTab('track')}
                  className={`flex-1 pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'track'
                      ? 'border-sky-600 text-sky-700'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>Lacak Tiket Layanan</span>
                </button>
              </div>

              {/* TAB 1: Internal Staff Login */}
              {activeTab === 'login' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Masuk ke Sistem SIGAP</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Silakan pilih akun simulasi demo atau masukkan email resmi staf Anda.
                    </p>
                  </div>

                  {/* 1-Click Quick Demo Accounts */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Pilihan Masuk Cepat (Akun Demo Staf):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {availableUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleQuickLogin(u.email)}
                          className="p-2.5 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50 text-left transition-all group"
                        >
                          <p className="font-bold text-xs text-slate-800 group-hover:text-sky-700 truncate">
                            {u.name.split(' ')[0]}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {u.role_name}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-4 text-slate-400 text-[11px] font-medium">
                      atau gunakan kredensial manual
                    </span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  {/* Manual Form */}
                  <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Email Resmi Staf
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@aetra.demo"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Kata Sandi
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all active:scale-98 flex items-center justify-center gap-2"
                    >
                      <span>{isSubmitting ? 'Memproses...' : 'Masuk ke Portal Staf'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 2: Customer Public Tracking */}
              {activeTab === 'track' && (
                <div className="space-y-5 animate-fade-in">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      Lacak Progres Sambungan / Keluhan Air
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pelanggan dapat memantau status secara langsung tanpa memerlukan akun login.
                    </p>
                  </div>

                  <form onSubmit={handleTrackSubmit} className="space-y-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        required
                        value={trackTicket}
                        onChange={(e) => setTrackTicket(e.target.value)}
                        placeholder="Masukkan Nomor Tiket (Contoh: REG-2026-1001 atau REP-2026-1001)"
                        className="w-full pl-9 pr-24 py-3 rounded-xl border border-slate-200 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                      <button
                        type="submit"
                        className="absolute right-2 top-2 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Lacak
                      </button>
                    </div>
                  </form>

                  {/* Result Box */}
                  {trackResult && (
                    <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200 animate-slide-up text-xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-sky-100">
                        <div>
                          <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md font-mono">
                            {trackResult.data.ticket_number}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm mt-1">
                            {trackResult.type === 'registration'
                              ? trackResult.data.customer_name
                              : trackResult.data.title || trackResult.data.repair_category}
                          </h4>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-sky-600 text-white font-bold text-[11px]">
                          {trackResult.data.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px]">
                        <div>
                          <p className="text-slate-400 text-[10px]">Tipe Layanan</p>
                          <p className="font-semibold text-slate-800">
                            {trackResult.data.service_type || trackResult.data.repair_category}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-[10px]">Alamat / Lokasi</p>
                          <p className="font-semibold text-slate-800 truncate">
                            {trackResult.data.address || trackResult.data.location_address}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-sky-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Status tersinkronisasi ke TiDB Cloud</span>
                        <span className="text-sky-700 font-bold">PT Aetra Air Tangerang</span>
                      </div>
                    </div>
                  )}

                  {trackError && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        Nomor tiket tidak ditemukan di basis data TiDB. Pastikan format nomor sudah tepat.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer copyright */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>&copy; {new Date().getFullYear()} PT Aetra Air Tangerang</span>
              <a
                href="https://aetratangerang.co.id"
                target="_blank"
                rel="noreferrer"
                className="hover:text-sky-600 flex items-center gap-1 font-medium"
              >
                <span>Situs Resmi</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
