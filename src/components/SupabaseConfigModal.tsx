import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Database, CheckCircle2, AlertCircle, X, ExternalLink, RefreshCw, Unplug } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const {
    supabaseConfig,
    updateSupabaseCredentials,
    disconnectSupabase,
    syncWithSupabase,
    isSyncing,
    setActiveView,
  } = useApp();

  const [url, setUrl] = useState(supabaseConfig.url);
  const [anonKey, setAnonKey] = useState(supabaseConfig.anonKey);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setFeedback(null);
    try {
      const res = await updateSupabaseCredentials(url, anonKey);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectSupabase();
    setUrl('');
    setAnonKey('');
    setFeedback({ type: 'success', message: 'Koneksi Supabase diputus. Berada di Mode Demo Lokal.' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Koneksi Database Supabase</h3>
              <p className="text-xs text-slate-500">Hubungkan database cloud atau gunakan Mode Demo aktif</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Indicator */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-medium">Status Koneksi:</span>
            {supabaseConfig.isConnected ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Terhubung ke Supabase Cloud
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium bg-slate-200/80 px-2.5 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                Mode Demo Aktif (Local Storage)
              </span>
            )}
          </div>

          {supabaseConfig.isConnected && (
            <button
              onClick={() => syncWithSupabase()}
              disabled={isSyncing}
              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sinkronisasi...' : 'Sinkronkan'}
            </button>
          )}
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-6 mt-4 p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{feedback.type === 'success' ? 'Berhasil' : 'Perhatian'}</p>
              <p className="mt-0.5 leading-relaxed">{feedback.message}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleTestAndSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supabase Project URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Dapat ditemukan di Supabase Dashboard → Project Settings → API → Project URL.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supabase Anon / Public Key
            </label>
            <input
              type="text"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Kunci akses publik anon (aman digunakan di browser client).
            </p>
          </div>

          {/* Quick Info Box */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span>Belum menjalankan skema tabel Supabase?</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setActiveView('database_schema');
                }}
                className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                Buka Generator Skema SQL
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Tersedia kode SQL lengkap (tabel, foreign keys, RLS per divisi, dan storage bucket). Salin dan jalankan sekali di Supabase SQL Editor.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2">
            {supabaseConfig.isConnected ? (
              <button
                type="button"
                onClick={handleDisconnect}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-700 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <Unplug className="w-3.5 h-3.5" />
                Putus Koneksi
              </button>
            ) : (
              <div></div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={testing}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {testing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {testing ? 'Menguji Koneksi...' : 'Uji & Simpan Koneksi'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
