import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, CheckCheck, ChevronDown, ClipboardList, Clock3, Download, Droplets, Ellipsis, FileCheck2, Plus, Wrench } from "lucide-react";
import { Button } from "@/components/common/Button";
import { StatusBadge } from "@/components/common/Badge";
import { EmptyState, ErrorState, Skeleton } from "@/components/common/LoadingSpinner";
import { Reveal, useCountUp } from "@/components/common/Reveal";
import { WaterStatusChart, WaterTrendChart } from "@/components/common/WaterCharts";
import { Modal } from "@/components/common/Modal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useWorkflow } from "@/context/WorkflowContext";
import { supabase, parseError, isDemoMode } from "@/lib/supabaseClient";
import { navigate } from "@/lib/router";
import { isActiveConnection } from "@/lib/waterDomain";
import { formatDate, hoursBetween, initials, timeAgo, toInputDate } from "@/lib/utils";
import { cn } from "@/utils/cn";

const DAY = 86400000;
const PERIODS = [{ key: "month", label: "Bulan ini" }, { key: "previous", label: "Bulan lalu" }, { key: "week", label: "7 hari terakhir" }];
const chartGroups = [
  { label: "Verifikasi", color: "#8999DF", match: /terima|verifikasi|menunggu verifikasi/i },
  { label: "Survei jaringan", color: "#49A5D9", match: /survei/i },
  { label: "Pembayaran", color: "#EAC17A", match: /pembayaran/i },
  { label: "Pemasangan", color: "#49BCBE", match: /pemasangan/i },
  { label: "Sambungan aktif", color: "#62BAA3", match: /aktif|disetujui/i },
  { label: "Tidak dilayani", color: "#E8A3A3", match: /ditolak|tidak dapat/i },
];

export function DashboardPage() {
  const { can, profile, profiles } = useAuth();
  const { statusOf } = useWorkflow();
  const toast = useToast();
  const [data, setData] = useState({ registrations: [], repairs: [], logs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState("month");
  const [granularity, setGranularity] = useState("weekly");
  const [reportOpen, setReportOpen] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reg, repair, activity] = await Promise.all([
        can("pendaftaran", "read") ? supabase.from("registrations").select("*").order("created_at", { ascending: false }).limit(2000) : { data: [] },
        can("repair", "read") ? supabase.from("repair_orders").select("*").order("created_at", { ascending: false }).limit(2000) : { data: [] },
        can("log_aktivitas", "read") ? supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(5) : { data: [] },
      ]);
      if (reg.error || repair.error || activity.error) throw new Error(parseError(reg.error || repair.error || activity.error));
      setData({ registrations: reg.data ?? [], repairs: repair.data ?? [], logs: activity.data ?? [] }); setError(null);
    } catch (err) { setError(err.message); toast.error(err.message, { title: "Dasbor tidak dapat dimuat" }); }
    finally { setLoading(false); }
  }, [can, toast]);
  useEffect(() => { load(); }, [load]);

  const range = useMemo(() => {
    const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === "previous") return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(), end: start.getTime(), label: new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" }) };
    if (period === "week") return { start: Date.now() - 7 * DAY, end: Date.now() + 1, label: "7 hari terakhir" };
    return { start: start.getTime(), end: Date.now() + 1, label: now.toLocaleDateString("id-ID", { month: "long", year: "numeric" }) };
  }, [period]);
  const registrations = useMemo(() => data.registrations.filter((record) => { const at = new Date(record.created_at).getTime(); return at >= range.start && at < range.end; }), [data.registrations, range]);
  const metrics = useMemo(() => {
    const previousStart = period === "week" ? range.start - 7 * DAY : new Date(new Date(range.start).getFullYear(), new Date(range.start).getMonth() - 1, 1).getTime();
    const prior = data.registrations.filter((r) => new Date(r.created_at).getTime() >= previousStart && new Date(r.created_at).getTime() < range.start).length;
    const pending = registrations.filter((r) => /terima|verifikasi/i.test(statusOf(r.current_status_id)?.status_name ?? ""));
    const active = registrations.filter((r) => isActiveConnection(statusOf(r.current_status_id)));
    const repairs = data.repairs.filter((r) => !statusOf(r.current_status_id)?.is_final && !r.resolved_at);
    const finished = data.repairs.filter((r) => r.resolved_at);
    const within = finished.filter((r) => hoursBetween(r.created_at, r.resolved_at) <= (r.sla_hours ?? 48));
    return { total: registrations.length, growth: prior ? ((registrations.length - prior) / prior) * 100 : null, pending: pending.length, active: active.length, repairs: repairs.length, sla: finished.length ? (within.length / finished.length) * 100 : 0, resolved: finished.length, avg: finished.length ? finished.reduce((sum, r) => sum + (hoursBetween(r.created_at, r.resolved_at) ?? 0), 0) / finished.length : 0 };
  }, [registrations, data, period, range, statusOf]);
  const distribution = useMemo(() => chartGroups.map((group) => ({ ...group, count: registrations.filter((r) => group.match.test(statusOf(r.current_status_id)?.status_name ?? "")).length })), [registrations, statusOf]);
  const chart = useMemo(() => {
    const span = granularity === "weekly" ? 7 * DAY : DAY;
    const count = granularity === "weekly" ? 8 : 14;
    const end = new Date(); end.setHours(23, 59, 59, 999);
    return Array.from({ length: count }, (_, index) => {
      const from = end.getTime() - (count - index) * span;
      const to = from + span;
      const records = data.registrations.filter((r) => new Date(r.created_at).getTime() > from && new Date(r.created_at).getTime() <= to);
      return { label: new Date(to).toLocaleDateString("id-ID", { day: "numeric", month: "short" }), registrations: records.length, connections: records.filter((r) => isActiveConnection(statusOf(r.current_status_id))).length };
    });
  }, [data.registrations, granularity, statusOf]);
  const people = useMemo(() => new Map(profiles.map((person) => [person.id, person.full_name])), [profiles]);
  const hour = new Date().getHours();
  const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";
  const exportReport = () => {
    try {
      const csv = ["Nomor pendaftaran,Nama pelanggan,Kelompok pelanggan,Kecamatan,Status,Tanggal", ...registrations.map((record) => [record.ticket_number, record.customer_name, record.service_type, record.district, statusOf(record.current_status_id)?.status_name ?? "Belum ditentukan", formatDate(record.created_at)].map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
      const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `laporan-sambungan-air-${toInputDate(new Date())}.csv`; anchor.click(); URL.revokeObjectURL(url);
      toast.success(`Laporan ${registrations.length} permohonan berhasil diunduh.`); setReportOpen(false);
    } catch { toast.error("Laporan tidak dapat diunduh. Coba kembali."); }
  };
  const detail = (record) => navigate(`/registrations/${record.id}`);
  const registrationPath = (stage) => {
    const params = new URLSearchParams({ dateFrom: toInputDate(range.start), dateTo: toInputDate(range.end - 1) });
    if (stage) params.set("stage", stage);
    return `/registrations?${params.toString()}`;
  };

  return <div className="space-y-5">
    <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="animate-fade-up"><div className="mb-2 flex items-center gap-2"><h1 className="text-[25px] font-semibold leading-tight tracking-[-0.9px] text-[#223951]">{greeting}, {profile?.full_name?.split(" ")[0] || "Rekan"}<span className="font-normal text-brand-600">.</span></h1><span aria-hidden className="ml-1 inline-block h-2 w-2 rounded-full bg-[#deb672]" /></div><p className="text-[12.5px] text-[#8a97a8]">Mari hadirkan layanan air yang lebih baik untuk pelanggan hari ini.</p></div>
      <div className="flex items-center gap-2.5"><label className="relative flex h-[38px] items-center rounded-lg border border-[#e1e8ef] bg-white px-3 text-[12.5px] text-[#62738a]"><CalendarDays size={14} strokeWidth={1.7} className="mr-2.5 text-slate-400" /><select aria-label="Periode ringkasan" value={period} onChange={(event) => setPeriod(event.target.value)} className="cursor-pointer appearance-none bg-transparent pr-5 outline-none">{PERIODS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select><ChevronDown size={12} className="pointer-events-none absolute right-3 text-slate-400" /></label>{can("pendaftaran", "create") && <Button size="sm" icon={Plus} className="h-[38px] rounded-lg px-3.5 text-[12.5px] font-medium shadow-none" onClick={() => navigate("/registrations?new=1")}>Pendaftaran baru</Button>}</div>
    </section>

    <section className="water-banner animate-fade-up rounded-xl px-7 py-6 text-white sm:px-8 sm:py-6" style={{ animationDelay: "60ms" }}>
      <p className="text-[9.5px] font-medium tracking-[0.2em] text-[#a5d6ec]">PT AETRA AIR TANGERANG</p>
      <h2 className="mt-2.5 text-[24px] font-semibold leading-tight tracking-[-0.75px] sm:text-[27px]">Air bersih, kehidupan lebih baik.</h2>
      <p className="mt-2 max-w-[410px] text-[12px] leading-[1.8] text-[#b8d4e5]">Kelola sambungan baru dan perbaikan air dalam satu portal.<br className="hidden sm:block" /> Pelayanan hebat, untuk setiap pelanggan.</p>
      <div aria-hidden className="absolute right-7 top-1/2 hidden -translate-y-1/2 flex-col items-end text-white/70 sm:flex"><svg viewBox="0 0 85 100" className="h-[94px] w-20 fill-none"><path d="M42 6C34 19 15 37 15 57a27 27 0 0054 0C69 37 50 19 42 6z" stroke="currentColor" strokeWidth="1" opacity=".8" /><path d="M28 60a14 14 0 0014 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></div>
    </section>

    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
      <Metric label="Total pendaftaran" value={metrics.total} icon={ClipboardList} color="blue" loading={loading} detail={metrics.growth == null ? "Belum ada pembanding" : `${Math.abs(metrics.growth).toFixed(1)}% dari periode sebelumnya`} direction={metrics.growth == null ? null : metrics.growth >= 0 ? "up" : "down"} onClick={() => navigate(registrationPath())} />
      <Metric label="Menunggu verifikasi" value={metrics.pending} icon={FileCheck2} color="amber" loading={loading} detail="Permohonan perlu ditinjau" onClick={() => navigate(registrationPath("verification"))} />
      <Metric label="Sambungan aktif" value={metrics.active} icon={Droplets} color="teal" loading={loading} detail="Pemasangan telah selesai" onClick={() => navigate(registrationPath("active"))} />
      <Metric label="Perbaikan aktif" value={metrics.repairs} icon={Wrench} color="purple" loading={loading} detail="Gangguan dalam penanganan" onClick={() => navigate("/repairs")} />
    </div>

    <div className="grid gap-4 xl:grid-cols-[1.72fr_1fr]">
      <Reveal className="min-w-0"><section className="aetra-panel h-full min-h-[300px] p-5 pb-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-[14px] font-semibold text-[#2b405a]">Tren pendaftaran</h2><p className="mt-1.5 text-[11px] text-slate-400">Perkembangan permohonan sambungan air pelanggan.</p></div><div className="flex rounded-md bg-[#f5f7fa] p-0.5">{[{ key: "weekly", label: "Mingguan" }, { key: "daily", label: "Harian" }].map((item) => <button type="button" key={item.key} onClick={() => setGranularity(item.key)} className={cn("rounded px-2.5 py-1.5 text-[10.5px] transition-all", granularity === item.key ? "bg-white font-medium text-[#486480] shadow-sm" : "text-slate-400")}>{item.label}</button>)}</div></div><div className="mb-2 mt-5 flex items-center gap-5"><span className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="h-[5px] w-[5px] rounded-full bg-[#1485c5]" />Pendaftaran baru</span><span className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="h-[5px] w-[5px] rounded-full bg-[#39b8a9]" />Sambungan aktif</span></div><div className="relative h-[188px] min-w-0">{loading ? <Skeleton className="h-full w-full" /> : <WaterTrendChart labels={chart.map((item) => item.label)} registrations={chart.map((item) => item.registrations)} connections={chart.map((item) => item.connections)} />}</div></section></Reveal>
      <Reveal delay={90}><section className="aetra-panel h-full min-h-[300px] p-5"><div className="flex items-center justify-between"><h2 className="text-[14px] font-semibold text-[#2b405a]">Status pendaftaran</h2><span className="text-[10.5px] capitalize text-slate-400">{range.label}</span></div><div className="mb-5 mt-5">{loading ? <Skeleton className="mx-auto h-[150px] w-[150px] rounded-full" /> : <WaterStatusChart items={distribution} total={metrics.total} />}</div><div className="grid grid-cols-2 gap-x-6 gap-y-2.5">{distribution.map((item) => <div key={item.label} className="flex items-center gap-1.5 text-[10px]"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} /><span className="flex-1 whitespace-nowrap text-[#8c98aa]">{item.label}</span><span className="text-[11px] font-semibold tabular-nums text-[#51647b]">{item.count}</span></div>)}</div></section></Reveal>
    </div>

    <div className="grid gap-4 xl:grid-cols-[1.72fr_1fr]">
      <Reveal className="min-w-0"><section className="aetra-panel h-full overflow-hidden"><div className="flex items-center justify-between gap-3 px-5 py-[19px]"><div><h2 className="text-[14px] font-semibold text-[#2b405a]">Pendaftaran terbaru</h2><p className="mt-1.5 text-[11px] text-slate-400">Permohonan sambungan air yang baru diterima.</p></div><button type="button" onClick={() => navigate(registrationPath())} className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-brand-600 hover:underline">Lihat semua<ArrowRight size={12} /></button></div><div className="overflow-x-auto"><table className="dashboard-table hidden w-full text-left sm:table"><thead className="border-y border-[#eef1f5] bg-[#fafbfd] text-[10px] font-normal text-[#9aa5b4]"><tr><th className="font-medium">Pelanggan</th><th className="font-medium">Wilayah</th><th className="font-medium">Status</th><th className="w-7" /></tr></thead><tbody>{loading ? Array.from({ length: 4 }, (_, index) => <tr key={index}><td colSpan={4}><Skeleton className="h-8 w-full" /></td></tr>) : registrations.slice(0, 4).map((record, index) => <tr key={record.id} onClick={() => detail(record)} className="group cursor-pointer border-b border-[#f1f4f7] transition-colors last:border-0 hover:bg-[#f8fbfd]"><td><div className="flex items-center gap-2.5"><span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-medium", ["bg-[#eaf2fb] text-[#6591b8]", "bg-[#f2edfa] text-[#a08aba]", "bg-[#edf5f0] text-[#84a295]", "bg-[#fff3e8] text-[#c8a17c]"][index])}>{initials(record.customer_name)}</span><span><span className="block whitespace-nowrap text-[11.5px] font-semibold text-[#485e77]">{record.customer_name}</span><span className="mt-1 block font-mono text-[9px] text-[#a3acb8]">{record.ticket_number}</span></span></div></td><td><span className="whitespace-nowrap text-[11px] text-[#738399]">{record.district}</span><span className="mt-1 block text-[9px] text-slate-400">{record.service_type}</span></td><td><StatusBadge size="sm" status={statusOf(record.current_status_id)} className="rounded-full px-2 py-1 text-[9px] font-medium ring-0" /></td><td><button type="button" aria-label={`Buka pendaftaran ${record.customer_name}`} onClick={() => detail(record)} className="text-slate-300 group-hover:text-brand-600"><ChevronDown className="-rotate-90" size={13} /></button></td></tr>)}</tbody></table></div><div className="divide-y divide-slate-100 sm:hidden">{registrations.slice(0, 4).map((record) => <button type="button" key={record.id} onClick={() => detail(record)} className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left"><span><span className="block text-xs font-semibold text-slate-700">{record.customer_name}</span><span className="mt-1 block text-[11px] text-slate-400">{record.district}</span></span><StatusBadge size="sm" status={statusOf(record.current_status_id)} /></button>)}</div>{!loading && !registrations.length && <EmptyState title="Belum ada permohonan" description="Pendaftaran baru akan ditampilkan di sini." />}</section></Reveal>
      <Reveal delay={90}><section className="aetra-panel h-full px-5 py-[19px]"><div className="mb-5 flex items-center justify-between"><h2 className="text-[14px] font-semibold text-[#2b405a]">Aktivitas terbaru</h2><button type="button" aria-label="Lihat log aktivitas" onClick={() => navigate("/logs")} className="rounded p-1 text-slate-400 hover:bg-slate-100"><Ellipsis size={17} /></button></div><ol className="space-y-[19px]">{data.logs.slice(0, 4).map((log, index) => { const Icon = [ClipboardList, FileCheck2, CheckCheck, Wrench][index % 4]; return <li key={log.id} className="relative flex gap-3">{index < 3 && <span className="absolute bottom-[-21px] left-[13px] top-7 w-px bg-[#edf1f5]" />}<span className={cn("relative grid h-7 w-7 shrink-0 place-items-center rounded-full", index === 2 ? "bg-[#edf8f3] text-[#6bb394]" : "bg-[#eef5fc] text-[#6e9bc4]")}><Icon size={12} strokeWidth={1.6} /></span><div className="min-w-0 pt-0.5"><p className="text-[11px] font-medium leading-relaxed text-[#64768d]">{log.action}</p><p className="mt-0.5 truncate text-[10px] text-[#9aa6b6]">{log.details?.customer_name || log.details?.title || people.get(log.user_id) || "Petugas layanan"}</p><p className="mt-1 text-[9px] text-[#b2bac6]">{timeAgo(log.created_at)}</p></div></li>; })}</ol>{!loading && !data.logs.length && <p className="py-10 text-center text-xs text-slate-400">Belum ada aktivitas yang dapat ditampilkan.</p>}<button type="button" onClick={() => navigate("/logs")} className="mt-5 flex w-full items-center justify-center gap-1.5 border-t border-slate-100 pt-3 text-[11px] font-medium text-brand-600 hover:text-brand-700">Lihat seluruh aktivitas<ArrowRight size={12} /></button></section></Reveal>
    </div>

    <Reveal><section className="flex flex-col items-start justify-between gap-4 rounded-xl border border-[#e2edf5] bg-[#f0f7fc] px-5 py-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-[#72a4c7]"><Download size={17} strokeWidth={1.5} /></span><div><h2 className="text-[12.5px] font-semibold text-[#476581]">Ringkasan layanan, siap dilaporkan.</h2><p className="mt-1 text-[11px] text-[#8b9fb4]">Unduh data pendaftaran dan tinjau kinerja penanganan layanan air.</p></div></div><button type="button" onClick={() => setReportOpen(true)} className="flex h-8 items-center gap-2 rounded-lg border border-[#d6e5f0] bg-white px-3 text-[11px] font-medium text-[#5484a8] transition-colors hover:border-brand-400"><Download size={12} />Unduh laporan</button></section></Reveal>
    {error && <ErrorState message={error} onRetry={load} />}
    <div className="flex items-center justify-between gap-3 text-[10px] text-[#a1adbc]"><span className="flex items-center gap-1.5"><Check size={11} className="text-[#87b5a5]" />{isDemoMode ? "Data simulasi untuk pratinjau, bukan data operasional Aetra." : "Data dimuat dari Supabase sesuai hak akses akun."}</span><span className="hidden sm:inline">Terakhir diperbarui {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} WIB</span></div>
    <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Laporan layanan air" subtitle={`Periode ${range.label}`} icon={Download} size="sm"><dl className="divide-y divide-slate-100 text-sm">{[["Pendaftaran sambungan baru", metrics.total], ["Sambungan aktif", metrics.active], ["Gangguan aktif (seluruh periode)", metrics.repairs], ["Pemenuhan SLA perbaikan", `${metrics.sla.toFixed(1)}%`], ["Rata-rata penanganan", `${metrics.avg.toFixed(1)} jam`]].map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-3"><dt className="text-slate-500">{label}</dt><dd className="font-semibold text-slate-800">{value}</dd></div>)}</dl><p className="mt-4 text-xs leading-relaxed text-slate-400">CSV memuat permohonan pada periode terpilih. SLA merupakan target internal yang dapat dikonfigurasi, bukan janji layanan resmi.</p><Button icon={Download} className="mt-5 w-full" onClick={exportReport}>Unduh data pendaftaran (CSV)</Button></Modal>
  </div>;
}

function Metric({ label, value, icon: Icon, color, loading, detail, direction, onClick }) {
  const animated = useCountUp(value, { duration: 850 });
  const tones = { blue: "bg-[#eaf5fc] text-[#4e98c2]", amber: "bg-[#fff6e9] text-[#d2ad72]", teal: "bg-[#eaf7f3] text-[#71b39c]", purple: "bg-[#f2effb] text-[#a294cd]" };
  return <Reveal><button type="button" onClick={onClick} className="aetra-panel group h-full w-full px-4 py-4 text-left transition-all duration-200 hover:border-brand-200 hover:shadow-sm sm:px-5"><div className="flex items-center justify-between gap-2"><p className="text-[11.5px] font-medium text-[#8390a3]">{label}</p><span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg", tones[color])}><Icon size={14} strokeWidth={1.6} /></span></div>{loading ? <Skeleton className="mb-2 mt-2 h-8 w-16" /> : <p className="mt-1.5 text-[30px] font-semibold leading-tight tracking-[-1px] tabular-nums text-[#2c405b]">{animated}</p>}<p className={cn("mt-2 flex items-center gap-1 text-[9.5px] sm:text-[10px]", direction ? "text-[#5ba68c]" : "text-[#a4aebc]")}>{direction === "up" ? <ArrowUpRight size={11} /> : direction === "down" ? <ArrowDownLeft size={11} /> : null}{detail}</p></button></Reveal>;
}
export default DashboardPage;
