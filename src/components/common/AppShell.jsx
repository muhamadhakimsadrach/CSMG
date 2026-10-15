import { useState } from "react";
import { Menu } from "lucide-react";
import { Navbar } from "./Navbar";
import { NAV_ITEMS, Sidebar } from "./Sidebar";
import { useAuth } from "@/context/AuthContext";
import { useRoute } from "@/lib/router";
import { cn } from "@/utils/cn";

export function AppShell({ title, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { path, navigate } = useRoute();
  const { can, isAdmin } = useAuth();
  const mobileItems = NAV_ITEMS.filter((item) => ["/dashboard", "/registrations", "/repairs"].includes(item.to) && (!item.module || can(item.module, "read") || isAdmin));
  return (
    <div className="flex min-h-dvh w-full bg-[#f7f9fc]">
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} activePath={path} onNavigate={navigate} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar onOpenMobile={() => setMobileOpen(true)} title={title} />
        <main id="main-content" className="min-w-0 flex-1 px-4 pb-8 pt-6 sm:px-6 lg:px-8 lg:pt-7 xl:px-9"><div className="mx-auto max-w-[1450px]">{children}</div></main>
        <footer className="print-hide mx-4 mb-20 flex flex-wrap justify-between gap-2 border-t border-[#e7ecf2] py-5 text-[10px] text-[#9aa5b5] sm:mx-6 lg:mx-8 lg:mb-0"><p>&copy; {new Date().getFullYear()} PT Aetra Air Tangerang. Seluruh hak dilindungi.</p><span>Portal Layanan Pelanggan <span className="mx-1">/</span> v2.0</span></footer>
      </div>
      <nav aria-label="Navigasi seluler" className="print-hide fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {mobileItems.map((item) => { const active = path === item.to || path.startsWith(`${item.to}/`); const Icon = item.icon; return <button key={item.to} type="button" onClick={() => navigate(item.to)} className={cn("flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium", active ? "text-brand-600" : "text-slate-400")}><Icon size={19} />{item.to === "/repairs" ? "Gangguan" : item.to === "/registrations" ? "Pendaftaran" : "Dasbor"}</button>; })}
        <button type="button" onClick={() => setMobileOpen(true)} className="flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium text-slate-400"><Menu size={19} />Lainnya</button>
      </nav>
    </div>
  );
}
export default AppShell;
