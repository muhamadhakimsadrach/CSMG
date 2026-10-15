// ============================================================================
// Adapter basis data lokal.
//
// Implementasi ini meniru permukaan API @supabase/supabase-js yang dipakai
// aplikasi (from/select/insert/update/delete, auth, storage) sehingga aplikasi
// tetap berfungsi penuh tanpa project Supabase (MODE DEMO). Ketika
// VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY diisi, kode aplikasi tidak perlu
// berubah sama sekali karena klien cloud yang akan dipakai.
// ============================================================================

import { seedRows, seedAuthUsers } from "./seedData";

const DB_KEY = "aetra.db.v2";
const AUTH_KEY = "aetra.auth.v2";
const SESSION_KEY = "aetra.session.v2";
const TABLES = [
  "roles",
  "permissions",
  "profiles",
  "app_settings",
  "workflow_statuses",
  "registrations",
  "repair_orders",
  "status_history",
  "activity_logs",
];
const TIMESTAMPS = ["registrations", "repair_orders", "profiles", "app_settings"];
const UNIQUE_TICKET = ["registrations", "repair_orders"];

let dbCache = null;
let authCache = null;
const authListeners = new Set();

function readJson(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("[sigap] gagal membaca penyimpanan lokal", error);
    return null;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn("[sigap] penyimpanan lokal penuh / tidak tersedia", error);
    return false;
  }
}

function loadDb() {
  if (dbCache) return dbCache;
  const stored = readJson(DB_KEY);
  if (stored && TABLES.every((t) => Array.isArray(stored[t]))) {
    dbCache = { __files: {}, ...stored };
    return dbCache;
  }
  dbCache = seedRows();
  const legacy = readJson("sigap.db.v1");
  if (legacy) {
    // Preserve user-created records when replacing the old generic demo dataset.
    TABLES.forEach((table) => {
      const created = (legacy[table] ?? []).filter((row) => !String(row.id).startsWith("00000000-0000-4000-8000-"));
      dbCache[table] = [...dbCache[table], ...created];
    });
  }
  writeJson(DB_KEY, serializeDb(dbCache));
  return dbCache;
}

function serializeDb(db) {
  const out = { __files: db.__files ?? {} };
  TABLES.forEach((t) => {
    out[t] = db[t] ?? [];
  });
  return out;
}

function persist() {
  if (dbCache && !writeJson(DB_KEY, serializeDb(dbCache))) throw new Error("Penyimpanan demo penuh. Gunakan berkas lebih kecil atau proyek Supabase untuk menyimpan data.");
}

function loadAuth() {
  if (authCache) return authCache;
  const stored = readJson(AUTH_KEY);
  authCache = Array.isArray(stored) && stored.length ? stored : seedAuthUsers();
  if (!stored) {
    const legacy = readJson("sigap.auth.v1") ?? [];
    authCache.push(...legacy.filter((row) => !String(row.id).startsWith("00000000-0000-4000-8000-")));
  }
  writeJson(AUTH_KEY, authCache);
  return authCache;
}

function cloneRow(row) {
  return row == null ? row : JSON.parse(JSON.stringify(row));
}

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function likeToRegExp(pattern, caseSensitive = false) {
  const escaped = String(pattern)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/%/g, ".*")
    .replace(/_/g, ".");
  return new RegExp(`^${escaped}$`, caseSensitive ? "i" : "i");
}

function valueOf(row, col) {
  return col.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), row);
}

function cmp(a, b) {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && typeof a !== "string") return na - nb;
  const da = typeof a === "string" && !Number.isNaN(Date.parse(a)) ? Date.parse(a) : null;
  const dbb = typeof b === "string" && !Number.isNaN(Date.parse(b)) ? Date.parse(b) : null;
  if (da !== null && dbb !== null) return da - dbb;
  return String(a).localeCompare(String(b), "id", { numeric: true });
}

function buildPredicate(filter) {
  const { kind, col, val, negate } = filter;
  let test;
  switch (kind) {
    case "eq":
      test = (row) => {
        const v = valueOf(row, col);
        if (v === val) return true;
        if (Array.isArray(v)) return v.includes(val);
        return String(v) === String(val);
      };
      break;
    case "gt":
      test = (row) => cmp(valueOf(row, col), val) > 0;
      break;
    case "gte":
      test = (row) => cmp(valueOf(row, col), val) >= 0;
      break;
    case "lt":
      test = (row) => cmp(valueOf(row, col), val) < 0;
      break;
    case "lte":
      test = (row) => cmp(valueOf(row, col), val) <= 0;
      break;
    case "like":
    case "ilike": {
      const re = likeToRegExp(val);
      test = (row) => re.test(String(valueOf(row, col) ?? ""));
      break;
    }
    case "in":
      test = (row) => {
        const v = valueOf(row, col);
        return (val ?? []).some((item) => String(item) === String(v));
      };
      break;
    case "is":
      test = (row) => {
        const v = valueOf(row, col);
        if (val === null) return v === null || v === undefined;
        return v === val;
      };
      break;
    case "contains":
      test = (row) => {
        const v = valueOf(row, col);
        const list = Array.isArray(v) ? v : [];
        const wanted = Array.isArray(val) ? val : [val];
        return wanted.every((w) => list.some((x) => String(x) === String(w)));
      };
      break;
    default:
      test = () => true;
  }
  return negate ? (row) => !test(row) : test;
}

function parseFilterString(input) {
  return input
    .split(",")
    .map((clause) => clause.trim())
    .filter(Boolean)
    .map((clause) => {
      const first = clause.indexOf(".");
      const second = clause.indexOf(".", first + 1);
      if (first === -1 || second === -1) return null;
      const col = clause.slice(0, first);
      const kind = clause.slice(first + 1, second);
      const rawVal = clause.slice(second + 1);
      let val = rawVal;
      if (kind === "in") val = rawVal.replace(/[()]/g, "").split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
      if (kind === "is") val = rawVal === "null" ? null : rawVal;
      return { kind, col, val };
    })
    .filter(Boolean);
}

class LocalQuery {
  constructor(table) {
    this.table = table;
    this.mode = "select";
    this.filters = [];
    this.orders = [];
    this._payload = null;
    this._returning = false;
    this._single = false;
    this._maybe = false;
    this._limit = null;
    this._range = null;
    this._count = null;
  }

  select(_cols, options) {
    this._returning = true;
    if (options && options.count) this._count = options.count;
    if (!["insert", "update", "delete", "upsert"].includes(this.mode)) this.mode = "select";
    return this;
  }

  insert(payload) {
    this.mode = "insert";
    this._payload = payload;
    return this;
  }

  update(payload) {
    this.mode = "update";
    this._payload = payload;
    return this;
  }

  upsert(payload, options) {
    this.mode = "upsert";
    this._payload = payload;
    this._onConflict = options && options.onConflict ? String(options.onConflict).split(",") : null;
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  eq(col, val) {
    this.filters.push({ kind: "eq", col, val });
    return this;
  }
  neq(col, val) {
    this.filters.push({ kind: "eq", col, val, negate: true });
    return this;
  }
  gt(col, val) {
    this.filters.push({ kind: "gt", col, val });
    return this;
  }
  gte(col, val) {
    this.filters.push({ kind: "gte", col, val });
    return this;
  }
  lt(col, val) {
    this.filters.push({ kind: "lt", col, val });
    return this;
  }
  lte(col, val) {
    this.filters.push({ kind: "lte", col, val });
    return this;
  }
  like(col, val) {
    this.filters.push({ kind: "like", col, val });
    return this;
  }
  ilike(col, val) {
    this.filters.push({ kind: "ilike", col, val });
    return this;
  }
  is(col, val) {
    this.filters.push({ kind: "is", col, val });
    return this;
  }
  in(col, values) {
    this.filters.push({ kind: "in", col, val: values });
    return this;
  }
  contains(col, values) {
    this.filters.push({ kind: "contains", col, val: values });
    return this;
  }
  not(col, kind, val) {
    this.filters.push({ kind, col, val, negate: true });
    return this;
  }
  or(input) {
    parseFilterString(input).forEach((f) => this.filters.push({ ...f, orGroup: true }));
    return this;
  }
  order(col, options) {
    this.orders.push({ col, asc: !(options && options.ascending === false) });
    return this;
  }
  limit(n) {
    this._limit = n;
    return this;
  }
  range(from, to) {
    this._range = [from, to];
    return this;
  }
  single() {
    this._single = true;
    this._returning = true;
    return this;
  }
  maybeSingle() {
    this._maybe = true;
    this._returning = true;
    return this;
  }

  applyFilters(rows) {
    if (!this.filters.length) return rows;
    const ands = this.filters.filter((f) => !f.orGroup).map(buildPredicate);
    const ors = this.filters.filter((f) => f.orGroup).map(buildPredicate);
    return rows.filter((row) => {
      const passAnd = ands.every((fn) => fn(row));
      const passOr = ors.length === 0 || ors.some((fn) => fn(row));
      return passAnd && passOr;
    });
  }

  async execute() {
    const db = loadDb();
    const table = db[this.table];
    if (!Array.isArray(table)) {
      return { data: null, error: { message: `Tabel "${this.table}" tidak ditemukan. Jalankan skema SQL lalu muat ulang aplikasi.` } };
    }
    const error = null;
    const nowIso = new Date().toISOString();

    if (this.mode === "insert" || this.mode === "upsert") {
      const payload = Array.isArray(this._payload) ? this._payload : [this._payload];
      const created = [];
      for (const item of payload) {
        const row = { ...item };
        if (!row.id) row.id = makeId();
        if (TIMESTAMPS.includes(this.table)) {
          if (!row.created_at) row.created_at = nowIso;
          row.updated_at = nowIso;
        }
        if (UNIQUE_TICKET.includes(this.table) && row.ticket_number) {
          const clash = table.find((r) => r.ticket_number === row.ticket_number);
          if (clash) {
            return { data: null, error: { message: `Nomor tiket ${row.ticket_number} sudah terdaftar.`, code: "23505" } };
          }
        }
        if (this.mode === "upsert") {
          const keys = this._onConflict && this._onConflict.length ? this._onConflict : ["id"];
          const idx = table.findIndex((r) =>
            keys.every((key) => {
              const a = r[key];
              const b = row[key];
              if (b === undefined || b === null) return false;
              return Array.isArray(a) || Array.isArray(b) ? String(a) === String(b) : String(a) === String(b);
            })
          );
          if (idx >= 0) {
            table[idx] = { ...table[idx], ...row };
            created.push(table[idx]);
            continue;
          }
        }
        table.push(row);
        created.push(row);
      }
      persist();
      if (!this._returning) return { data: null, error };
      if (this._single) return { data: cloneRow(created[0] ?? null), error };
      return { data: created.map(cloneRow), error };
    }

    if (this.mode === "update") {
      const matched = this.applyFilters(table);
      if (!matched.length && this._single) {
        return { data: null, error: { message: "Data yang ingin diperbarui tidak ditemukan.", code: "PGRST116" } };
      }
      matched.forEach((row) => {
        const idx = table.findIndex((r) => String(r.id) === String(row.id));
        if (idx >= 0) {
          table[idx] = { ...table[idx], ...this._payload };
          if (TIMESTAMPS.includes(this.table)) table[idx].updated_at = nowIso;
        }
      });
      persist();
      const out = matched.map((row) => table.find((r) => String(r.id) === String(row.id)));
      if (!this._returning) return { data: null, error };
      if (this._single || this._maybe) return { data: cloneRow(out[0] ?? null), error };
      return { data: out.map(cloneRow), error };
    }

    if (this.mode === "delete") {
      const matched = this.applyFilters(table);
      matched.forEach((row) => {
        const idx = table.findIndex((r) => String(r.id) === String(row.id));
        if (idx >= 0) table.splice(idx, 1);
      });
      persist();
      if (!this._returning) return { data: null, error };
      if (this._single) return { data: cloneRow(matched[0] ?? null), error };
      return { data: matched.map(cloneRow), error };
    }

    // ---- SELECT -------------------------------------------------------------
    let rows = this.applyFilters(table);
    const total = rows.length;
    this.orders.forEach(({ col, asc }) => {
      rows = [...rows].sort((a, b) => {
        const av = valueOf(a, col);
        const bv = valueOf(b, col);
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const res = cmp(av, bv);
        return asc ? res : -res;
      });
    });
    if (this._range) rows = rows.slice(this._range[0], this._range[1] + 1);
    if (this._limit != null) rows = rows.slice(0, this._limit);
    const data = rows.map(cloneRow);

    if (this._single) {
      if (!data.length) return { data: null, error: { message: "Data tidak ditemukan.", code: "PGRST116" } };
      return { data: data[0], error, count: this._count ? total : null };
    }
    if (this._maybe) return { data: data[0] ?? null, error, count: this._count ? total : null };
    return { data, error, count: this._count ? total : null };
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

function emit(event, session) {
  authListeners.forEach((cb) => {
    try {
      cb(event, session);
    } catch (err) {
      console.warn("[sigap] listener auth error", err);
    }
  });
}

function currentSession() {
  const stored = readJson(SESSION_KEY);
  if (!stored) return null;
  const db = loadDb();
  const profile = db.profiles.find((p) => p.id === stored.user.id);
  if (!profile || profile.is_active === false) return null;
  return stored;
}

export function createLocalSupabase() {
  const bucketKey = "sigap.files.v1";
  let fileCache = null;
  const loadFiles = () => {
    if (fileCache) return fileCache;
    fileCache = readJson(bucketKey) ?? {};
    return fileCache;
  };
  const saveFiles = () => writeJson(bucketKey, fileCache);

  return {
    __local: true,
    from(table) {
      return new LocalQuery(table);
    },
    auth: {
      async getSession() {
        return { data: { session: currentSession(), user: currentSession()?.user ?? null }, error: null };
      },
      async signInWithPassword({ email, password }) {
        await new Promise((r) => setTimeout(r, 420));
        const users = loadAuth();
        const user = users.find((u) => u.email.toLowerCase() === String(email || "").toLowerCase());
        if (!user) {
          return { data: null, error: { message: "Email belum terdaftar pada sistem.", status: 400 } };
        }
        if (user.password !== password) {
          return { data: null, error: { message: "Kata sandi tidak sesuai. Periksa kembali dan coba lagi.", status: 400 } };
        }
        const db = loadDb();
        const profile = db.profiles.find((p) => p.id === user.id);
        if (!profile || profile.is_active === false) {
          return { data: null, error: { message: "Akun Anda dinonaktifkan. Silakan hubungi Admin Pusat.", status: 403 } };
        }
        const session = {
          access_token: `demo.${user.id}`,
          token_type: "bearer",
          user: {
            id: user.id,
            email: user.email,
            user_metadata: { full_name: profile?.full_name ?? user.email.split("@")[0] },
            last_sign_in_at: new Date().toISOString(),
          },
        };
        writeJson(SESSION_KEY, session);
        emit("SIGNED_IN", session);
        return { data: { session, user: session.user }, error: null };
      },
      async signUp({ email, password, options }) {
        await new Promise((r) => setTimeout(r, 380));
        const users = loadAuth();
        const clean = String(email || "").trim().toLowerCase();
        if (!clean || !/@/.test(clean)) return { data: null, error: { message: "Format email tidak valid.", status: 400 } };
        if (users.some((u) => u.email.toLowerCase() === clean)) {
          return { data: null, error: { message: "Email sudah digunakan akun lain.", status: 422 } };
        }
        if (String(password || "").length < 8) {
          return { data: null, error: { message: "Kata sandi minimal 8 karakter.", status: 422 } };
        }
        const newUser = { id: makeId(), email: clean, password };
        users.push(newUser);
        writeJson(AUTH_KEY, users);
        const db = loadDb();
        db.profiles.push({
          id: newUser.id,
          email: clean,
          full_name: options?.data?.full_name || clean.split("@")[0],
          role_id: options?.data?.role_id ?? null,
          avatar_url: null,
          phone_number: options?.data?.phone_number ?? null,
          department: options?.data?.department ?? null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        persist();
        return { data: { user: { id: newUser.id, email: clean }, session: null }, error: null };
      },
      async signOut() {
        window.localStorage.removeItem(SESSION_KEY);
        emit("SIGNED_OUT", null);
        return { error: null };
      },
      async updateUser({ password }) {
        const session = currentSession();
        if (!session) return { data: null, error: { message: "Sesi tidak ditemukan." } };
        const users = loadAuth();
        const u = users.find((x) => x.id === session.user.id);
        if (u && password) u.password = password;
        writeJson(AUTH_KEY, users);
        emit("USER_UPDATED", session);
        return { data: { user: session.user }, error: null };
      },
      onAuthStateChange(callback) {
        authListeners.add(callback);
        return { data: { subscription: { remove: () => authListeners.delete(callback) } } };
      },
    },
    storage: {
      from(bucket) {
        return {
          async upload(path, file) {
            try {
              const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(new Error("Gagal membaca berkas."));
                reader.readAsDataURL(file);
              });
              const files = loadFiles();
              files[`${bucket}/${path}`] = dataUrl;
              if (!saveFiles()) {
                delete files[`${bucket}/${path}`];
                throw new Error("Penyimpanan dokumen demo penuh. Gunakan berkas lebih kecil atau hubungkan Supabase.");
              }
              return { data: { path, bucket }, error: null };
            } catch (err) {
              return { data: null, error: { message: err.message ?? "Gagal mengunggah berkas." } };
            }
          },
          async remove(paths) {
            const files = loadFiles();
            (paths ?? []).forEach((p) => delete files[`${bucket}/${p}`]);
            saveFiles();
            return { data: paths, error: null };
          },
          getPublicUrl(path) {
            const files = loadFiles();
            return { data: { publicUrl: files[`${bucket}/${path}`] ?? "" } };
          },
        };
      },
    },
  };
}

export function resetLocalDatabase() {
  dbCache = seedRows();
  authCache = seedAuthUsers();
  writeJson(DB_KEY, serializeDb(dbCache));
  writeJson(AUTH_KEY, authCache);
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem("sigap.files.v1");
  return true;
}
