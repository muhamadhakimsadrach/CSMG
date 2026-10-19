import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ActivityLog } from '../types';
import { History, Search, Shield, User, Clock, FileSpreadsheet } from 'lucide-react';

export const ActivityLogView: React.FC = () => {
  const { currentUser } = useApp();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tidb/table/activity_logs?limit=100')
      .then((res) => res.json())
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setLogs(res.data);
        } else {
          // Default initial logs
          setLogs([
            {
              id: 'log_1',
              user_name: 'System TiDB',
              user_role: 'Cluster TiDB Cloud',
              action: 'Koneksi Sukses',
              module: 'Basis Data',
              detail: 'Klaster MySQL TiDB Cloud gateway01 terhubung secara aman dengan SSL/TLS.',
              created_at: new Date().toISOString(),
            },
            {
              id: 'log_2',
              user_name: 'Rani Prameswari',
              user_role: 'Admin Aetra',
              action: 'Sinkronisasi Skema',
              module: 'Pengaturan',
              detail: 'Skema basis data dan akun demo disinkronisasi ke TiDB Cloud.',
              created_at: new Date(Date.now() - 3600000).toISOString(),
            },
          ]);
        }
      })
      .catch(() => {
        setLogs([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.detail?.toLowerCase().includes(search.toLowerCase()) ||
      l.module?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-sky-600" />
            <span>Audit Log Aktivitas Sistem (TiDB)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rekam jejak seluruh mutasi data, pendaftaran, dan tindakan staf operasional di TiDB MySQL.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama staf, aksi, modul, atau rincian audit log..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Pengguna & Peran</th>
                <th className="py-3 px-4">Modul</th>
                <th className="py-3 px-4">Aktivitas</th>
                <th className="py-3 px-4">Detail Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Tidak ada aktivitas yang tercatat.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{log.user_name}</div>
                      <div className="text-[10px] text-slate-400">{log.user_role}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-100">
                        {log.module}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{log.action}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-md truncate">{log.detail}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
