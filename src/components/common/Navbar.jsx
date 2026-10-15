import { useEffect, useRef, useState } from "react";
import { ArrowRight, Bell, ChevronDown, ChevronRight, CircleHelp, ClipboardList, Headphones, LogOut, Menu, Search, Settings, Wrench, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";
import { COMPANY } from "@/lib/waterDomain";
import { supabase } from "@/lib/supabaseClient";
import { navigate } from "@/lib/router";
import { initials, timeAgo } from "@/lib/utils";
import { DEMO_ACCOUNTS } from "@/lib/seedData";
import { Modal } from "./Modal";
import { cn } from "@/utils/cn";

export function Navbar({ onOpenMobile, title }) {
  const { profile, roleName, signOut, signIn, can } = useAuth();
  const { settings } = useBranding();
  const [popover, setPopover] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logError, setLogError] = useState(null);
  const regionRef = useRef(null);

  useEffect(() => {
    const onOutside = (event) => { if (regionRef.current && !regionRef.current.contains(event.target)) setPopover(null); };
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") { event.preventDefault(); setSearchOpen((v) => !v); }
      if (event.key === "Escape") { setSearchOpen(false); setPopover(null); }
    };
    document.addEventListener("pointerdown", onOutside); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onOutside); document.removeEventListener("keydown", onKey); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const query = term.replace(/[,%()]/g, "").trim();
      if (!query) { setResults([]); setSearchError(null); return; }
      setLoading(true);
      try {
        const [registrations, repairs] = await Promise.all([
          can("pendaftaran", "read") ? supabase.from("registrations").select("*").or(`customer_name.ilike.%${query}%,ticket_number.ilike.%${query}%,district.ilike.%${query}%`).limit(5) : { data: [] },
          can("repair", "read") ? supabase.from("repair_orders").select("*").or(`title.ilike.%${query}%,ticket_number.ilike.%${query}%`).limit(3) : { data: [] },
        ]);
        if (registrations.error || repairs.error) throw new Error("Pencarian tidak dapat dimuat. Silakan coba kembali.");
        if (!cancelled) { setResults([...(registrations.data ?? []).map((r) => ({ ...r, kind: "registration" })), ...(repairs.data ?? []).map((r) => ({ ...r, kind: "repair" }))]); setSearchError(null); }
      } catch (error) { if (!cancelled) setSearchError(error.message); }
      finally { if (!cancelled) setLoading(false); }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [term, can]);

  useEffect(() => {
    if (popover !== "notifications") return;
    let cancelled = false;
    if (!can("log_aktivitas", "read")) { setLogError("Peran Anda tidak memiliki akses ke log aktivitas."); return; }
    supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(4).then(({ data, error }) => {
      if (!cancelled) { setLogs(data ?? []); setLogError(error ? "Aktivitas tidak dapat dimuat." : null); }
    }).catch(() => { if (!cancelled) setLogError("Aktivitas tidak dapat dimuat."); });
    return () => { cancelled = true; };
  }, [popover, can]);

  const openResult = (result) => {
    navigate(result.kind === "registration" ? `/registrations/${result.id}` : `/repairs?ticket=${result.id}`);
    setSearchOpen(false); setTerm("");
  };

  return (
    <>
      <header className="print-hide sticky top-0 z-30 h-[74px] shrink-0 border-b border-[#e7ecf2] bg-white">
        <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 xl:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Buka navigasi" onClick={onOpenMobile} className="rounded-md p-1.5 text-slate-500 lg:hidden"><Menu size={20} /></button>
            <div className="flex items-center gap-2.5 truncate text-[13px]"><span className="hidden text-slate-400 sm:inline">Portal Layanan</span><ChevronRight size={13} className="hidden text-slate-300 sm:inline" /><span className="truncate font-medium text-[#465871]">{title}</span></div>
          </div>
          <div ref={regionRef} className="relative flex h-full items-center gap-2 sm:gap-4">
            {/* Quick Role Switcher for Admin & Demo */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs">
              <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wide">Tinjau Role:</span>
              <select
                aria-label="Tinjau tampilan peran pengguna"
                value={profile?.email || ""}
                onChange={async (e) => {
                  const acc = DEMO_ACCOUNTS.find((a) => a.email === e.target.value);
                  if (acc) {
                    await signIn({ email: acc.email, password: acc.password });
                    navigate("/dashboard");
                  }
                }}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                {DEMO_ACCOUNTS.map((acc) => (
                  <option key={acc.email} value={acc.email}>
                    {acc.label}
                  </option>
                ))}
              </select>
            </div>

            <button type="button" onClick={() => setSearchOpen(true)} aria-label="Cari pendaftaran atau tiket" className="flex h-9 items-center gap-2 rounded-lg px-1 text-slate-400 transition-colors hover:bg-slate-50 sm:w-44 sm:px-3"><Search size={16} strokeWidth={1.7} /><span className="hidden flex-1 text-left text-[12.5px] sm:inline">Cari...</span><kbd className="hidden rounded border border-slate-200 px-1 text-[10px] text-slate-400 sm:inline">Ctrl K</kbd></button>
            <button type="button" aria-label="Bantuan layanan" onClick={() => setHelpOpen(true)} className="hidden p-1 text-slate-400 transition-colors hover:text-brand-600 sm:block"><CircleHelp size={18} strokeWidth={1.65} /></button>
            <button type="button" aria-label="Aktivitas terbaru" aria-expanded={popover === "notifications"} onClick={() => setPopover(popover === "notifications" ? null : "notifications")} className="relative p-1 text-slate-400 transition-colors hover:text-brand-600"><Bell size={18} strokeWidth={1.65} /><span className="absolute right-1 top-0.5 h-1.5 w-1.5 rounded-full bg-[#ef967b] ring-2 ring-white" /></button>
            <span className="h-7 w-px bg-slate-100" />
            <button type="button" aria-label="Menu akun" aria-expanded={popover === "account"} onClick={() => setPopover(popover === "account" ? null : "account")} className="flex items-center gap-2.5 text-left">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e9f3f2] text-[13px] font-semibold text-[#578e88]">{initials(profile?.full_name)}</span>
              <span className="hidden sm:block"><span className="block text-[12.5px] font-semibold text-[#2c405b]">{profile?.full_name}</span><span className="mt-0.5 block text-[11px] text-slate-400">{roleName}</span></span>
              <ChevronDown size={13} className="ml-1 hidden text-slate-400 sm:block" />
            </button>
            {popover === "account" && (
              <div className="absolute right-0 top-16 z-50 w-64 animate-fade-up rounded-xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/5">
                <div className="mb-1 border-b border-slate-100 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-700">{profile?.full_name}</p>
                  <p className="mt-1 text-[12px] text-slate-400">{profile?.email} &middot; <span className="font-medium text-brand-600">{roleName}</span></p>
                </div>
                <div className="py-1">
                  <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Ganti Peran Demo (1-Klik)</p>
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={async () => {
                        try {
                          await signIn({ email: acc.email, password: acc.password });
                          setPopover(null);
                          navigate("/dashboard");
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-left transition-colors", profile?.email === acc.email ? "bg-brand-50 font-semibold text-brand-700" : "text-slate-600 hover:bg-slate-50")}
                    >
                      <span>{acc.label}</span>
                      {profile?.email === acc.email && <span className="text-[10px] font-bold text-brand-600">Aktif</span>}
                    </button>
                  ))}
                </div>
                <div className="mt-1 border-t border-slate-100 pt-1">
                  {can("pengaturan", "read") && (
                    <button type="button" onClick={() => { navigate("/settings"); setPopover(null); }} className="flex w-full items-center gap-2 rounded-lg p-2.5 text-xs text-slate-600 hover:bg-slate-50">
                      <Settings size={14} />Pengaturan aplikasi
                    </button>
                  )}
                  <button type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-lg p-2.5 text-xs text-rose-600 hover:bg-rose-50">
                    <LogOut size={14} />Keluar dari akun
                  </button>
                </div>
              </div>
            )}
            {popover === "notifications" && <div className="absolute right-0 top-16 z-50 w-[min(330px,85vw)] animate-fade-up overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5"><p className="border-b border-slate-100 px-4 py-3 text-xs font-semibold text-slate-800">Aktivitas terbaru</p>{logError ? <p className="p-4 text-xs text-slate-500">{logError}</p> : logs.length ? logs.map((log) => <button key={log.id} type="button" onClick={() => { navigate(log.entity_name === "pendaftaran" ? `/registrations/${log.entity_id}` : "/logs"); setPopover(null); }} className="block w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50"><p className="text-xs font-medium text-slate-700">{log.action}</p><p className="mt-1 text-[11px] text-slate-400">{log.details?.ticket_number} &middot; {timeAgo(log.created_at)}</p></button>) : <p className="p-4 text-xs text-slate-400">Belum ada aktivitas terbaru.</p>}</div>}
          </div>
        </div>
      </header>
      <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Pencarian layanan" subtitle="Cari nama pelanggan, kecamatan, nomor pendaftaran, atau gangguan." icon={Search} size="md">
        <div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><input autoFocus value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Contoh: Budi Santoso atau Sepatan" className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-9 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />{term && <button aria-label="Kosongkan pencarian" type="button" onClick={() => setTerm("")} className="absolute right-3 top-3 text-slate-400"><X size={17} /></button>}</div>
        <div aria-live="polite" className="mt-3 min-h-20">{loading ? <p className="py-5 text-center text-xs text-slate-400">Mencari data layanan...</p> : searchError ? <p className="py-5 text-center text-xs text-rose-600">{searchError}</p> : results.length ? <ul className="space-y-1">{results.map((result) => { const Icon = result.kind === "registration" ? ClipboardList : Wrench; return <li key={result.id}><button type="button" onClick={() => openResult(result)} className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-slate-50"><Icon size={17} className="text-brand-600" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-700">{result.customer_name || result.title}</span><span className="mt-1 block text-[11px] text-slate-400">{result.ticket_number} &middot; {result.district || "Gangguan air"}</span></span><ArrowRight size={15} className="text-slate-400" /></button></li>; })}</ul> : <p className="py-6 text-center text-xs text-slate-400">{term ? "Tidak ada data yang cocok dengan pencarian Anda." : "Mulai mengetik untuk menelusuri layanan pelanggan."}</p>}</div>
      </Modal>
      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Bantuan layanan Aetra" subtitle={settings.app_name} icon={Headphones} size="sm">
        <p className="text-sm leading-relaxed text-slate-500">Pendaftaran sambungan air memerlukan KTP, KK, PBB terakhir, dan dokumen usaha untuk pelanggan komersial. Kelayakan jaringan dan biaya ditentukan setelah survei.</p>
        <a href={`tel:${COMPANY.contactPhone.replace(/\s/g, "")}`} className="mt-5 block rounded-lg border border-slate-200 p-3 text-sm font-semibold text-brand-600">Contact Center: {COMPANY.contactPhone}</a>
        <a href={`https://wa.me/${COMPANY.contactWhatsapp}`} target="_blank" rel="noreferrer" className="mt-2 block rounded-lg border border-slate-200 p-3 text-sm font-semibold text-brand-600">Hubungi melalui WhatsApp <ArrowRight className="float-right" size={16} /></a>
        <a href={COMPANY.informationUrl} target="_blank" rel="noreferrer" className="mt-4 block text-xs text-slate-500 underline underline-offset-4">Informasi pelanggan pada situs Aetra Tangerang</a>
      </Modal>
    </>
  );
}
export default Navbar;
