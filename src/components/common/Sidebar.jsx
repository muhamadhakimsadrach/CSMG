import { Activity, ArrowUpRight, ChevronLeft, ClipboardList, Droplets, FileSpreadsheet, Headphones, LayoutDashboard, LogOut, Settings, UsersRound, Workflow, Wrench, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";
import { COMPANY } from "@/lib/waterDomain";
import { cn } from "@/utils/cn";
import { BrandMark, BrandWordmark } from "./BrandMark";

export const NAV_ITEMS = [
  { to: "/dashboard", label: "Dasbor", icon: LayoutDashboard, group: "MENU UTAMA", module: null },
  { to: "/registrations", label: "Pendaftaran air", icon: ClipboardList, group: "MENU UTAMA", module: "pendaftaran" },
  { to: "/repairs", label: "Gangguan & perbaikan", icon: Wrench, group: "MENU UTAMA", module: "repair" },
  { to: "/forms", label: "Manajemen Form", icon: FileSpreadsheet, group: "ADMINISTRASI", module: "pengaturan" },
  { to: "/users", label: "Pengguna & akses", icon: UsersRound, group: "ADMINISTRASI", module: "pengguna" },
  { to: "/workflow", label: "Alur layanan", icon: Workflow, group: "ADMINISTRASI", module: "workflow" },
  { to: "/logs", label: "Log aktivitas", icon: Activity, group: "ADMINISTRASI", module: "log_aktivitas" },
  { to: "/settings", label: "Pengaturan", icon: Settings, group: "ADMINISTRASI", module: "pengaturan" },
];

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile, activePath, onNavigate }) {
  const { can, isAdmin, signOut, isDemoMode } = useAuth();
  const { settings } = useBranding();
  const items = NAV_ITEMS.filter((item) => !item.module || can(item.module, "read") || isAdmin);
  return (
    <>
      <div className={cn("print-hide fixed inset-0 z-40 bg-slate-900/35 transition-opacity lg:hidden", mobileOpen ? "opacity-100" : "pointer-events-none opacity-0")} onClick={onCloseMobile} aria-hidden />
      <aside className={cn("print-hide fixed inset-y-0 left-0 z-50 flex w-[248px] shrink-0 flex-col border-r border-[#e7ecf2] bg-white transition-[width,transform] duration-300 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0", mobileOpen ? "translate-x-0" : "-translate-x-full", collapsed ? "lg:w-[78px]" : "lg:w-[242px]")}>
        <button type="button" onClick={() => { onNavigate("/dashboard"); onCloseMobile(); }} aria-label="Aetra Tangerang - kembali ke dasbor" className={cn("flex h-[100px] shrink-0 items-center justify-start px-6", collapsed && "lg:justify-center lg:px-2")}>
          {collapsed ? <BrandMark /> : <BrandWordmark />}
        </button>
        <button type="button" onClick={onCloseMobile} aria-label="Tutup navigasi" className="absolute right-3 top-4 rounded-lg p-2 text-slate-500 lg:hidden"><X size={18} /></button>
        {!collapsed && <div className="mx-5 mb-7 border-b border-slate-100 pb-5"><p className="text-[13px] font-semibold text-[#203a57]">{settings.tagline || "Portal Layanan Pelanggan"}</p><p className="mt-1 text-[11px] text-slate-400">{settings.app_name}</p></div>}
        <nav aria-label="Navigasi utama" className="no-scrollbar flex-1 overflow-y-auto px-4">
          {[...new Set(items.map((item) => item.group))].map((group) => (
            <div key={group} className="mb-8">
              {!collapsed && <p className="mb-3 px-3 text-[9.5px] font-semibold tracking-[0.13em] text-[#a0a9b6]">{group}</p>}
              <ul className="space-y-1.5">
                {items.filter((item) => item.group === group).map((item) => {
                  const active = activePath === item.to || activePath.startsWith(`${item.to}/`);
                  const Icon = item.icon;
                  return <li key={item.to}><button type="button" title={collapsed ? item.label : undefined} aria-current={active ? "page" : undefined} onClick={() => { onNavigate(item.to); onCloseMobile(); }} className={cn("group flex h-[43px] w-full items-center gap-3 rounded-lg px-3 text-left text-[12px] transition-all duration-200", active ? "bg-[#eaf5fc] font-semibold text-[#0077bd]" : "font-medium text-[#7b8798] hover:bg-slate-50 hover:text-[#193754]", collapsed && "lg:justify-center lg:px-0")}><Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 1.9 : 1.65} aria-hidden />{!collapsed && <span className="flex-1 whitespace-nowrap">{item.label}</span>}{active && !collapsed && <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />}</button></li>;
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="mt-auto px-5 pb-5">
          {!collapsed && <a href={COMPANY.informationUrl} target="_blank" rel="noreferrer" className="mb-5 block rounded-xl bg-[#f4f8fc] p-4 transition-colors hover:bg-brand-50"><div className="flex items-center justify-between"><Headphones size={20} strokeWidth={1.5} className="text-[#4385b1]" /><ArrowUpRight size={14} className="text-slate-400" /></div><p className="mt-2.5 text-[12px] font-semibold text-[#28415d]">Butuh bantuan?</p><p className="mt-1 text-[10.5px] leading-relaxed text-slate-400">Informasi dan panduan<br />layanan pelanggan Aetra.</p><span className="mt-2.5 inline-block text-[11px] font-semibold text-brand-600">Pusat bantuan <span aria-hidden>&rarr;</span></span></a>}
          <div className={cn("flex items-center justify-between border-t border-slate-100 pt-4", collapsed && "flex-col gap-3")}>
            {!collapsed && <span title={isDemoMode ? "Data simulasi disimpan di perangkat ini, bukan data pelanggan Aetra." : "Terhubung ke proyek Supabase Anda."} className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{isDemoMode ? "Data simulasi" : "Sistem terhubung"}</span>}
            <button type="button" onClick={signOut} title="Keluar dari akun" aria-label="Keluar dari akun" className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"><LogOut size={15} /></button>
            <button type="button" onClick={onToggleCollapse} className="hidden rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800 lg:block" title={collapsed ? "Bentangkan bilah sisi" : "Ciutkan bilah sisi"} aria-label={collapsed ? "Bentangkan bilah sisi" : "Ciutkan bilah sisi"}><ChevronLeft size={15} className={cn("transition-transform", collapsed && "rotate-180")} /></button>
          </div>
        </div>
      </aside>
    </>
  );
}
export default Sidebar;
