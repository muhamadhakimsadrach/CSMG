import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

const VARIANTS = {
  primary:
    "bg-brand-600 text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 active:translate-y-px disabled:hover:bg-brand-600",
  secondary:
    "bg-white text-slate-700 border border-slate-200 shadow-sm hover:border-slate-300 hover:bg-slate-50 active:translate-y-px",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:translate-y-px",
  danger: "bg-rose-600 text-white shadow-sm shadow-rose-600/20 hover:bg-rose-700 active:translate-y-px",
  success: "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 active:translate-y-px",
  dark: "bg-ink-800 text-white shadow-sm hover:bg-ink-900 active:translate-y-px",
  outlineLight: "border border-white/15 text-slate-200 hover:bg-white/10",
};

const SIZES = {
  xs: "h-7 px-2.5 text-xs gap-1 rounded-md",
  sm: "h-9 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-lg",
};

/** Tombol serbaguna dengan state loading & ikon. */
export const Button = forwardRef(function Button(
  { variant = "primary", size = "md", icon: Icon, iconRight: IconRight, loading = false, className, children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center font-semibold transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/45 focus-visible:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-55",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : Icon ? (
        <Icon className={cn(size === "xs" ? "h-3.5 w-3.5" : "h-4 w-4", "shrink-0")} aria-hidden />
      ) : null}
      {children ? <span className="truncate">{children}</span> : null}
      {IconRight && !loading ? <IconRight className={cn(size === "xs" ? "h-3.5 w-3.5" : "h-4 w-4", "shrink-0")} aria-hidden /> : null}
    </button>
  );
});

/** Tombol ikon bundar untuk aksi ringkas di dalam baris/card. */
export function IconButton({ icon: Icon, label, tone = "default", className, size = "md", ...props }) {
  const tones = {
    default: "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
    brand: "text-brand-600 hover:bg-brand-50",
    danger: "text-rose-600 hover:bg-rose-50",
    light: "text-white/80 hover:bg-white/10 hover:text-white",
  };
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        "inline-grid place-items-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40",
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        tones[tone],
        className
      )}
      {...props}
    >
      {Icon ? <Icon className={size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]"} aria-hidden /> : null}
    </button>
  );
}

export default Button;
