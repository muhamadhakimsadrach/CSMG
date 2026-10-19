// ============================================================================
// Adapter basis data lokal (Supabase Mock / LocalStorage Mode).
// Memulihkan tampilan dan fitur lengkap persis seperti sebelum integrasi TiDB.
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
  "custom_forms",
  "customer_ratings",
];

let dbCache: any = null;
let authCache: any = null;
const authListeners = new Set();

function readJson(key: string) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("[sigap] gagal membaca penyimpanan lokal", error);
    return null;
  }
}

function writeJson(key: string, value: any) {
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

  const initial = seedRows();
  writeJson(DB_KEY, initial);
  dbCache = { __files: {}, ...initial };
  return dbCache;
}

function saveDb() {
  if (!dbCache) return;
  const toStore: any = {};
  TABLES.forEach((t) => {
    toStore[t] = dbCache[t];
  });
  writeJson(DB_KEY, toStore);
}

function loadAuth() {
  if (authCache) return authCache;
  const stored = readJson(AUTH_KEY);
  if (Array.isArray(stored)) {
    authCache = stored;
    return authCache;
  }
  const initial = seedAuthUsers();
  writeJson(AUTH_KEY, initial);
  authCache = initial;
  return authCache;
}

function saveAuth(users: any[]) {
  authCache = users;
  writeJson(AUTH_KEY, users);
}

function getSession() {
  const s = readJson(SESSION_KEY);
  if (s) return s;
  const users = loadAuth();
  const defaultUser = users[0];
  const session = {
    access_token: "mock-token-aetra-v2",
    token_type: "bearer",
    user: defaultUser,
  };
  writeJson(SESSION_KEY, session);
  return session;
}

function setSession(session: any) {
  if (!session) {
    window.localStorage.removeItem(SESSION_KEY);
  } else {
    writeJson(SESSION_KEY, session);
  }
  authListeners.forEach((cb) => {
    try {
      cb(session ? "SIGNED_IN" : "SIGNED_OUT", session);
    } catch (e) {
      console.error(e);
    }
  });
}

class LocalQueryBuilder {
  private table: string;
  private op: string = 'select';
  private selectQuery: string = '*';
  private filters: Array<{ col: string; op: string; val: any }> = [];
  private orderCol: string | null = null;
  private orderAsc: boolean = true;
  private limitCount: number | null = null;
  private insertData: any = null;
  private updateData: any = null;

  constructor(table: string) {
    this.table = table;
  }

  select(query = '*') {
    this.op = 'select';
    this.selectQuery = query;
    return this;
  }

  insert(data: any) {
    this.op = 'insert';
    this.insertData = data;
    return this;
  }

  update(data: any) {
    this.op = 'update';
    this.updateData = data;
    return this;
  }

  delete() {
    this.op = 'delete';
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push({ col, op: 'eq', val });
    return this;
  }

  order(col: string, options?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAsc = options?.ascending ?? true;
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  async then(resolve: any, reject: any) {
    try {
      const result = this.execute();
      resolve(result);
    } catch (e) {
      reject(e);
    }
  }

  async maybeSingle() {
    const res = this.execute();
    if (res.error) return { data: null, error: res.error };
    const arr = res.data;
    return { data: Array.isArray(arr) && arr.length > 0 ? arr[0] : null, error: null };
  }

  async single() {
    return this.maybeSingle();
  }

  execute() {
    const db = loadDb();
    if (!db[this.table]) {
      db[this.table] = [];
    }
    const tableData = db[this.table];

    if (this.op === 'select') {
      let results = [...tableData];
      for (const f of this.filters) {
        if (f.op === 'eq') {
          results = results.filter((item) => String(item[f.col]) === String(f.val));
        }
      }
      if (this.orderCol) {
        const col = this.orderCol;
        const asc = this.orderAsc;
        results.sort((a, b) => {
          if (a[col] < b[col]) return asc ? -1 : 1;
          if (a[col] > b[col]) return asc ? 1 : -1;
          return 0;
        });
      }
      if (this.limitCount !== null) {
        results = results.slice(0, this.limitCount);
      }
      return { data: results, error: null };
    }

    if (this.op === 'insert') {
      const items = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
      const inserted = [];
      for (const item of items) {
        const newItem = {
          id: item.id || `id_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          created_at: new Date().toISOString(),
          ...item,
        };
        tableData.unshift(newItem);
        inserted.push(newItem);
      }
      saveDb();
      return { data: Array.isArray(this.insertData) ? inserted : inserted[0], error: null };
    }

    if (this.op === 'update') {
      let updatedCount = 0;
      let lastUpdated = null;
      for (let i = 0; i < tableData.length; i++) {
        let match = true;
        for (const f of this.filters) {
          if (String(tableData[i][f.col]) !== String(f.val)) {
            match = false;
            break;
          }
        }
        if (match) {
          tableData[i] = {
            ...tableData[i],
            ...this.updateData,
            updated_at: new Date().toISOString(),
          };
          lastUpdated = tableData[i];
          updatedCount++;
        }
      }
      saveDb();
      return { data: lastUpdated || this.updateData, error: null };
    }

    if (this.op === 'delete') {
      const beforeLen = tableData.length;
      db[this.table] = tableData.filter((item: any) => {
        for (const f of this.filters) {
          if (String(item[f.col]) === String(f.val)) {
            return false;
          }
        }
        return true;
      });
      saveDb();
      return { data: null, error: null };
    }

    return { data: null, error: { message: 'Operasi tidak dikenal' } };
  }
}

export const supabase = {
  from: (table: string) => new LocalQueryBuilder(table),
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const users = loadAuth();
      const found = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
      if (found) {
        const session = { access_token: `token_${Date.now()}`, token_type: 'bearer', user: found };
        setSession(session);
        return { data: { session, user: found }, error: null };
      }
      return { data: null, error: { message: 'Email atau kata sandi salah.' } };
    },
    getSession: async () => {
      const session = getSession();
      return { data: { session }, error: null };
    },
    signUp: async ({ email, password }: { email: string; password: string }) => {
      const users = loadAuth();
      const newUser = { id: `usr_${Date.now()}`, email, password };
      users.push(newUser);
      saveAuth(users);
      const session = { access_token: `token_${Date.now()}`, token_type: 'bearer', user: newUser };
      setSession(session);
      return { data: { session, user: newUser }, error: null };
    },
    signOut: async () => {
      setSession(null);
      return { error: null };
    },
    onAuthStateChange: (callback: any) => {
      authListeners.add(callback);
      const session = getSession();
      try {
        callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
      } catch (e) {
        console.error(e);
      }
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authListeners.delete(callback);
            },
          },
        },
      };
    },
  },
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: File) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const url = String(reader.result);
            const db = loadDb();
            if (!db.__files) db.__files = {};
            db.__files[path] = url;
            saveDb();
            resolve({ data: { path }, error: null });
          };
          reader.readAsDataURL(file);
        });
      },
      getPublicUrl: (path: string) => {
        const db = loadDb();
        const url = db.__files && db.__files[path] ? db.__files[path] : `https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&q=80&w=800`;
        return { data: { publicUrl: url } };
      },
    }),
  },
};

export const dbClient = supabase;
export const isDemoMode = true;

export function resetDemoData() {
  window.localStorage.removeItem(DB_KEY);
  window.localStorage.removeItem(AUTH_KEY);
  window.localStorage.removeItem(SESSION_KEY);
  window.location.reload();
}

export async function uploadFileToStorage(file: File, bucketName = 'app-assets'): Promise<{ url: string; isCloud: boolean }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ url: String(reader.result), isCloud: false });
    reader.onerror = () => reject(new Error('Gagal membaca berkas'));
    reader.readAsDataURL(file);
  });
}

export function parseError(error: any, fallback = 'Terjadi kesalahan sistem.') {
  if (!error) return fallback;
  return error.message || String(error) || fallback;
}
