import { AlertOctagon, CheckCircle2, Clock3, XOctagon } from "lucide-react";
import { PRIORITY_META, slaState } from "@/lib/utils";
import { cn } from "@/utils/cn";

/** Penanda status generik dengan warna dari konfigurasi workflow (color_code). */
export function Badge({ children, className, tone = "neutral", size = "md", dot = false }) {
  const tones = {
    neutral: "bg-slate-100 text-slate-600 ring-slate-200",
    brand: "bg-brand-50 text-brand-700 ring-brand-200",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warning: "bg-amber-50 text-amber-700 ring-amber-200",
    danger: "bg-rose-50 text-rose-700 ring-rose-200",
    info: "bg-sky-50 text-sky-700 ring-sky-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-semibold ring-1 ring-inset",
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-[11px]",
        tones[tone] ?? tones.neutral,
        className
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" /> : null}
      {children}
    </span>
  );
}

export function StatusBadge({ status, size = "md", className }) {
  const color = status?.color_code ?? "#64748B";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-semibold ring-1 ring-inset",
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-[11px]",
        className
      )}
      style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, white)`, color: `color-mix(in srgb, ${color} 78%, #0f172a)`, borderColor: color, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 28%, transparent)` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {status?.status_name ?? "Tanpa Status"}
    </span>
  );
}

export function PriorityBadge({ priority, size = "md" }) {
  const meta = PRIORITY_META[priority] ?? PRIORITY_META.Medium;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-semibold ring-1 ring-inset",
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-[11px]",
        meta.className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

const SLA_ICONS = { done: CheckCircle2, breach: AlertOctagon, warning: Clock3, on_progress: Clock3 };
const SLA_TONES = {
  done: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  breach: "bg-rose-50 text-rose-700 ring-rose-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  on_progress: "bg-slate-100 text-slate-600 ring-slate-200",
};

/** Indikator SLA: sisa waktu / keterlambatan / penyelesaian. */
export function SlaBadge({ order, showIcon = true, className }) {
  const state = slaState(order);
  const Icon = SLA_ICONS[state.key] ?? Clock3;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold ring-1 ring-inset",
        SLA_TONES[state.key],
        state.key === "breach" && "animate-pulse-ring",
        className
      )}
    >
      {showIcon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
      {state.label}
    </span>
  );
}

export function RoleChip({ children, className }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md bg-ink-800/[0.06] px-2 py-1 text-[11px] font-semibold text-ink-700", className)}>
      <XOctagon className="h-3 w-3 opacity-0" aria-hidden />
      {children}
    </span>
  );
}

export default Badge;
