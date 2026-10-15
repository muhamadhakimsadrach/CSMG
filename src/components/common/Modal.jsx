import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";
import { IconButton } from "./Button";

const SIZES = {
  sm: "sm:max-w-md",
  md: "sm:max-w-xl",
  lg: "sm:max-w-3xl",
  xl: "sm:max-w-5xl",
};

/**
 * Modal responsif: dialog terpusat di layar besar, bottom-sheet yang
 * dapat diusap ditutup di layar ponsel.
 */
export function Modal({ open, onClose, title, subtitle, icon: Icon, size = "md", footer, children, closeOnBackdrop = true }) {
  const sheetRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const focusTimer = window.setTimeout(() => sheetRef.current?.querySelector("input:not([type=file]), select, textarea, button")?.focus(), 50);
    const onKey = (e) => {
      if (e.key === "Escape") closeRef.current?.();
      if (e.key === "Tab" && sheetRef.current) {
        const focusable = [...sheetRef.current.querySelectorAll("button:not(:disabled), input:not(:disabled):not([type=file]), select:not(:disabled), textarea:not(:disabled), a[href]")];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
      previousFocus?.focus?.();
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="print-hide fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-[3px]"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl",
          "animate-slide-up sm:animate-fade-up sm:rounded-xl",
          SIZES[size] ?? SIZES.md
        )}
      >
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          {Icon ? (
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <Icon className="h-[18px] w-[18px]" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-semibold tracking-tight text-slate-900 sm:text-lg">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{subtitle}</p> : null}
          </div>
          <IconButton icon={X} label="Tutup" size="sm" onClick={onClose} />
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-end sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default Modal;
