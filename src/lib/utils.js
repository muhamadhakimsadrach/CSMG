// ============================================================================
// Utilitas umum aplikasi: format, validasi, dan generator nomor tiket.
// ============================================================================

const DATE_FMT = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" });
const DATETIME_FMT = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const TIME_FMT = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" });

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return DATE_FMT.format(d);
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return DATETIME_FMT.format(d).replace(",", "");
}

export function formatTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return TIME_FMT.format(d);
}

/** Rentang waktu relatif berbahasa Indonesia (mis. "3 jam lalu"). */
export function timeAgo(value) {
  if (!value) return "—";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Math.floor((Date.now() - then) / 1000);
  if (diff < 45) return "baru saja";
  const units = [
    ["hari", Math.floor(diff / 86400)],
    ["jam", Math.floor(diff / 3600)],
    ["menit", Math.floor(diff / 60)],
  ];
  for (const [label, amount] of units) {
    if (amount >= 1) return `${amount} ${label} lalu`;
  }
  return "baru saja";
}

/** Durasi dalam jam -> "2j 15m" / "3 hari 4 jam". */
export function formatDuration(hours, { long = false } = {}) {
  if (hours === null || hours === undefined || Number.isNaN(hours)) return "—";
  const totalMinutes = Math.max(0, Math.round(Math.abs(hours) * 60));
  const days = Math.floor(totalMinutes / 1440);
  const hrs = Math.floor((totalMinutes % 1440) / 60);
  const mins = totalMinutes % 60;
  if (!long) {
    if (days > 0) return `${days}h ${hrs}j`;
    if (hrs > 0) return `${hrs}j ${mins}m`;
    return `${mins}m`;
  }
  const parts = [];
  if (days) parts.push(`${days} hari`);
  if (hrs) parts.push(`${hrs} jam`);
  if (!days && mins) parts.push(`${mins} menit`);
  return parts.length ? parts.join(" ") : "0 menit";
}

export function hoursBetween(from, to) {
  if (!from) return null;
  const a = new Date(from).getTime();
  const b = new Date(to || Date.now()).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return (b - a) / 3_600_000;
}

export function initials(name = "") {
  const clean = String(name).trim();
  if (!clean) return "??";
  const parts = clean.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function toInputDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function uuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** REG-YYYYMMDD-XXXX —XXXX adalah urutan harian 4 digit. */
export function buildTicketNumber(prefix, existingNumbers = []) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const head = `${prefix}-${stamp}-`;
  const used = existingNumbers
    .filter((t) => typeof t === "string" && t.startsWith(head))
    .map((t) => Number.parseInt(t.slice(head.length), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (used.length ? Math.max(...used) : 0) + 1;
  return `${head}${String(next).padStart(4, "0")}`;
}

export function isValidNik(value) {
  return /^\d{16}$/.test(String(value || "").trim());
}

export function isValidEmail(value) {
  if (!value) return true; // email opsional pada formulir pendaftaran
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());
}

export function isValidPhone(value) {
  return /^(\+?62|0)8[1-9][0-9\s-]{6,14}$/.test(String(value || "").trim());
}

export const PRIORITY_META = {
  Urgent: { label: "Darurat", rank: 4, className: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  High: { label: "Tinggi", rank: 3, className: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  Medium: { label: "Sedang", rank: 2, className: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" },
  Low: { label: "Rendah", rank: 1, className: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
};

export const SLA_HOURS = { Urgent: 8, High: 24, Medium: 48, Low: 72 };

/** Status SLA: on_progress, warning, breach, done. */
export function slaState(order) {
  if (!order) return { key: "on_progress", label: "—" };
  if (order.resolved_at) {
    const used = hoursBetween(order.created_at, order.resolved_at);
    const within = used <= (order.sla_hours || 48);
    return {
      key: within ? "done" : "breach",
      label: within ? "SLA Terpenuhi" : "SLA Terlewat",
      hours: used,
    };
  }
  const due = order.due_at ? new Date(order.due_at).getTime() : null;
  if (!due) return { key: "on_progress", label: "Berjalan" };
  const remaining = (due - Date.now()) / 3_600_000;
  if (remaining < 0) return { key: "breach", label: `Terlambat ${formatDuration(remaining)}`, remaining };
  if (remaining <= 6) return { key: "warning", label: `Habis dalam ${formatDuration(remaining)}`, remaining };
  return { key: "on_progress", label: `Sisa ${formatDuration(remaining)}`, remaining };
}

export function hexToRgba(hex, alpha = 1) {
  const clean = String(hex || "").replace("#", "");
  if (clean.length !== 6) return `rgba(79,70,229,${alpha})`;
  const num = Number.parseInt(clean, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

export function sortBy(list, key, dir = "asc") {
  const factor = dir === "desc" ? -1 : 1;
  return [...list].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av === bv) return 0;
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
    return String(av).localeCompare(String(bv), "id") * factor;
  });
}

export function paginate(list, page, perPage) {
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), pages);
  const start = (safePage - 1) * perPage;
  return { rows: list.slice(start, start + perPage), total, pages, page: safePage, start };
}
