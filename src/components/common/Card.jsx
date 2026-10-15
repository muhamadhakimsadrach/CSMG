import { cn } from "@/utils/cn";

/** Kontainer dasar seluruh konten aplikasi: kertas putih di atas kanvas slate. */
export function Card({ as: Tag = "div", className, hover = false, padded = false, children, ...props }) {
  return (
    <Tag
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]",
        hover && "transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/[0.06]",
        padded && "p-5",
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ title, subtitle, action, icon: Icon, className }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="font-display text-[15px] font-semibold leading-tight tracking-tight text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, children }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export function CardFooter({ className, children }) {
  return <div className={cn("border-t border-slate-100 bg-slate-50/60 px-5 py-3", className)}>{children}</div>;
}

/** Judul halaman: tipografi display tegas + konteks di bawahnya. */
export function PageHeader({ eyebrow, title, description, actions, className }) {
  return (
    <div className={cn("flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0 animate-fade-up">
        {eyebrow ? (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">{eyebrow}</p>
        ) : null}
        <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[28px]">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 print-hide">{actions}</div> : null}
    </div>
  );
}

export default Card;
