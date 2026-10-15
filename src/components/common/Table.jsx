import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";

/**
 * Table - tabel data responsif.
 * >= md : tabel lengkap dengan header yang dapat diurutkan.
 * <  md : otomatis bertransformasi menjadi daftar kartu (rowCard).
 */
export function Table({
  columns = [],
  rows = [],
  keyField = "id",
  onRowClick,
  sort,
  onSortChange,
  loading = false,
  emptyState = null,
  rowCard,
  dense = false,
  className,
}) {
  const handleSort = (col) => {
    if (!col.sortable || !onSortChange) return;
    const dir = sort?.column === col.key && sort?.dir === "asc" ? "desc" : "asc";
    onSortChange({ column: col.key, dir });
  };

  if (!loading && !rows.length && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }

  return (
    <div className={cn("w-full", className)}>
      {/* ---- Desktop ---- */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500",
                    col.sortable && "cursor-pointer select-none transition-colors hover:text-brand-600",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.thClassName
                  )}
                  onClick={() => handleSort(col)}
                >
                  <span className={cn("inline-flex items-center gap-1", col.align === "right" && "flex-row-reverse")}>
                    {col.header}
                    {col.sortable ? (
                      sort?.column === col.key ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="h-3 w-3 text-brand-600" aria-hidden />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-brand-600" aria-hidden />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden />
                      )
                    ) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {columns.map((col, c) => (
                      <td key={col.key} className="px-4 py-3.5">
                        <span className="skeleton block h-4 rounded" style={{ width: `${45 + ((c * 17) % 45)}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row, index) => (
                  <tr
                    key={row[keyField] ?? index}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "group border-b border-slate-100 transition-colors last:border-0",
                      onRowClick && "cursor-pointer hover:bg-brand-50/40",
                      index % 2 === 1 && "bg-slate-50/40"
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 align-middle text-slate-600",
                          dense ? "py-2.5" : "py-3.5",
                          col.align === "right" && "text-right",
                          col.align === "center" && "text-center",
                          col.tdClassName
                        )}
                      >
                        {col.render ? col.render(row, index) : row[col.key] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* ---- Mobile: kartu ---- */}
      <div className="divide-y divide-slate-100 md:hidden">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2 px-4 py-4">
                <span className="skeleton block h-4 w-1/3 rounded" />
                <span className="skeleton block h-3 w-2/3 rounded" />
                <span className="skeleton block h-3 w-1/2 rounded" />
              </div>
            ))
          : rows.map((row, index) => (
              <div
                key={row[keyField] ?? index}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn("px-4 py-3.5 transition-colors", onRowClick && "active:bg-slate-100")}
              >
                {rowCard ? (
                  rowCard(row, index)
                ) : (
                  <dl className="space-y-1.5">
                    {columns.map((col) => (
                      <div key={col.key} className="flex items-start justify-between gap-3">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{col.header}</dt>
                        <dd className="min-w-0 flex-1 text-right text-[13px] text-slate-700">
                          {col.render ? col.render(row, index) : row[col.key] ?? "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            ))}
      </div>
    </div>
  );
}

export function Pagination({ page, pages, total, perPage, onPageChange, className }) {
  if (pages <= 1) return null;
  const numbers = [];
  const from = Math.max(1, Math.min(page - 1, pages - 2));
  for (let i = from; i < from + 4 && i <= pages; i += 1) numbers.push(i);
  return (
    <div className={cn("flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5", className)}>
      <p className="text-[12.5px] text-slate-500">
        Menampilkan <span className="font-semibold text-slate-700">{total === 0 ? 0 : (page - 1) * perPage + 1}</span>–
        <span className="font-semibold text-slate-700">{Math.min(page * perPage, total)}</span> dari{" "}
        <span className="font-semibold text-slate-700">{total}</span> data
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40"
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {numbers.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPageChange(n)}
            className={cn(
              "h-8 min-w-8 rounded-md px-2 text-[13px] font-semibold transition-colors",
              n === page ? "bg-ink-800 text-white" : "border border-slate-200 text-slate-500 hover:bg-slate-50"
            )}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40"
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default Table;
