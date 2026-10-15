import { Check, CircleDot, Clock3 } from "lucide-react";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { cn } from "@/utils/cn";

/**
 * Timeline - visualisasi progres alur kerja real-time.
 * Menampilkan tahap selesai / berjalan / menunggu beserta nama petugas
 * dan catatan verifikasi pada tiap perpindahan status.
 */
export function Timeline({ steps, progressLabel, className }) {
  const doneCount = steps.filter((s) => s.state === "done").length;
  const currentCount = steps.some((step) => step.state === "current") ? 0.5 : 0;
  const percent = steps.length ? Math.round(((doneCount + currentCount) / steps.length) * 100) : 0;
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className={className}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Progres Penanganan</p>
          <p className="font-display text-2xl font-semibold tracking-tight text-slate-900">
            {progressLabel ?? `${doneCount}/${steps.length} tahap`}
          </p>
        </div>
        <span className="rounded-md bg-brand-50 px-2 py-1 text-[12px] font-bold text-brand-700">{clamped}%</span>
      </div>
      <div className="mb-7 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/70">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-600 to-emerald-500 transition-[width] duration-700 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>

      <ol className="relative space-y-1">
        <span className="absolute bottom-4 left-[13px] top-4 w-px bg-slate-200" aria-hidden />
        {steps.map((step, index) => {
          const color = step.status?.color_code ?? "#64748B";
          const isDone = step.state === "done";
          const isCurrent = step.state === "current";
          return (
            <li key={step.key ?? index} className={cn("relative flex gap-4 rounded-lg p-2 pl-0 transition-colors", isCurrent && "bg-brand-50/40")}>
              <span
                className={cn(
                  "relative z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 bg-white transition-all",
                  isDone && "border-emerald-500 bg-emerald-500 text-white",
                  isCurrent && "border-brand-600 text-brand-600 animate-pulse-ring",
                  !isDone && !isCurrent && "border-slate-200 text-slate-300"
                )}
                style={isCurrent ? { borderColor: color, color } : undefined}
              >
                {isDone ? <Check className="h-3.5 w-3.5" aria-hidden /> : isCurrent ? <CircleDot className="h-3.5 w-3.5" aria-hidden /> : <Clock3 className="h-3.5 w-3.5" aria-hidden />}
              </span>
              <div className="min-w-0 flex-1 pb-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p
                    className={cn(
                      "font-display text-[13.5px] font-semibold tracking-tight",
                      isDone || isCurrent ? "text-slate-900" : "text-slate-400"
                    )}
                  >
                    {step.status?.status_name ?? step.label ?? "Tahap tanpa status"}
                  </p>
                  {isCurrent ? (
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, white)`, color: `color-mix(in srgb, ${color} 80%, #0f172a)` }}
                    >
                      Berjalan
                    </span>
                  ) : null}
                </div>
                {step.note ? <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">{step.note}</p> : null}
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11.5px] text-slate-400">
                  {step.actorName ? (
                    <>
                      <span className="font-semibold text-slate-500">{step.actorName}</span>
                      <span aria-hidden>·</span>
                    </>
                  ) : null}
                  {step.at ? <span title={formatDateTime(step.at)}>{timeAgo(step.at)}</span> : <span>Menunggu antrean</span>}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default Timeline;
