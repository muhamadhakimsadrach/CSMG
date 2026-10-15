import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/utils/cn";

/**
 * ToastContext - notifikasi global (sukses / galat / info) dengan animasi masuk
 * dan auto-dismiss. Tersedia juga `confirmDialog` untuk konfirmasi berbahaya.
 */
const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const TONES = {
  success: "border-l-emerald-500",
  error: "border-l-rose-500",
  warning: "border-l-amber-500",
  info: "border-l-brand-600",
};

const ICON_TONES = {
  success: "text-emerald-600",
  error: "text-rose-600",
  warning: "text-amber-600",
  info: "text-brand-600",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const seq = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (variant, message, options = {}) => {
      seq.current += 1;
      const id = seq.current;
      const entry = {
        id,
        variant,
        message: String(message ?? ""),
        title: options.title ?? null,
        duration: options.duration ?? (variant === "error" ? 7000 : 4200),
      };
      setToasts((prev) => [...prev.slice(-3), entry]);
      if (entry.duration > 0) {
        window.setTimeout(() => dismiss(id), entry.duration);
      }
      return id;
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (m, o) => push("success", m, o),
      error: (m, o) => push("error", m, o),
      warning: (m, o) => push("warning", m, o),
      info: (m, o) => push("info", m, o),
      dismiss,
    }),
    [push, dismiss]
  );

  /** Konfirmasi modal; mengembalikan Promise<boolean>. */
  const confirm = useCallback(
    (options = {}) =>
      new Promise((resolve) => {
        setConfirmState({
          title: options.title ?? "Konfirmasi Tindakan",
          message: options.message ?? "Apakah Anda yakin ingin melanjutkan tindakan ini?",
          confirmLabel: options.confirmLabel ?? "Ya, Lanjutkan",
          cancelLabel: options.cancelLabel ?? "Batal",
          tone: options.tone ?? "danger",
          resolve,
        });
      }),
    []
  );

  const closeConfirm = useCallback(
    (result) => {
      setConfirmState((prev) => {
        prev?.resolve?.(result);
        return null;
      });
    },
    []
  );

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="print-hide pointer-events-none fixed inset-x-3 bottom-3 z-[90] flex flex-col gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[368px]">
        {toasts.map((t) => {
          const Icon = ICONS[t.variant] ?? Info;
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                "pointer-events-auto animate-slide-up rounded-lg border border-slate-200 border-l-4 bg-white p-3.5 shadow-lg shadow-slate-900/10",
                TONES[t.variant]
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", ICON_TONES[t.variant])} aria-hidden />
                <div className="min-w-0 flex-1">
                  {t.title ? <p className="text-sm font-semibold text-slate-900">{t.title}</p> : null}
                  <p className="text-sm leading-relaxed text-slate-600">{t.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Tutup notifikasi"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {confirmState ? (
        <div className="print-hide fixed inset-0 z-[95] flex items-end justify-center bg-slate-900/45 p-4 backdrop-blur-[2px] sm:items-center">
          <div className="w-full max-w-md animate-slide-up rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-10 w-10 place-items-center rounded-full bg-rose-50 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900">{confirmState.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{confirmState.message}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                {confirmState.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => closeConfirm(true)}
                className={cn(
                  "h-10 rounded-lg px-4 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-px",
                  confirmState.tone === "danger" ? "bg-rose-600 hover:bg-rose-700" : "bg-brand-600 hover:bg-brand-700"
                )}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast harus dipakai di dalam ToastProvider.");
  return ctx.toast;
}

export function useConfirm() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useConfirm harus dipakai di dalam ToastProvider.");
  return ctx.confirm;
}
