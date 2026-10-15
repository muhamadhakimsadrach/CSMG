import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "./Button";

export function LoadingSpinner({ label = "Memuat data…", className, size = "md" }) {
  const dimension = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-6 w-6";
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-8 text-slate-500", className)}>
      <Loader2 className={cn("animate-spin text-brand-600", dimension)} aria-hidden />
      {label ? <p className="text-[13px] font-medium">{label}</p> : null}
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn("skeleton rounded-md", className)} aria-hidden />;
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-5 py-3.5">
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className={cn("h-4", c === 0 ? "w-32" : c === cols - 1 ? "w-16" : "flex-1")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
        {Icon ? <Icon className="h-6 w-6" aria-hidden /> : null}
      </span>
      <h3 className="font-display text-[15px] font-semibold text-slate-800">{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="font-display text-[15px] font-semibold text-slate-800">Data tidak dapat dimuat</h3>
      <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-slate-500">{message}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" icon={RefreshCw} className="mt-4" onClick={onRetry}>
          Coba muat ulang
        </Button>
      ) : null}
    </div>
  );
}

export default LoadingSpinner;
