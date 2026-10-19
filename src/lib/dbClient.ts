// ============================================================================
// TiDB Cloud MySQL Database Client (Browser Safe REST Adapter)
// Communicates directly with Node.js Express Backend connected to TiDB MySQL Cloud.
// No node_modules/mysql2 is bundled into the browser bundle, preventing Buffer errors.
// ============================================================================

export const BUCKETS = {
  assets: 'app-assets',
  attachments: 'attachments',
};

class TableQueryBuilder {
  private table: string;
  private _select = '*';
  private _orderBy?: string;
  private _orderDir?: 'ASC' | 'DESC';
  private _limit?: number;
  private _id?: string;
  private _col?: string;
  private _val?: any;

  constructor(table: string) {
    this.table = table;
  }

  select(fields = '*') {
    this._select = fields;
    return this;
  }

  order(col: string, options?: { ascending?: boolean }) {
    this._orderBy = col;
    this._orderDir = options?.ascending === false ? 'DESC' : 'ASC';
    return this;
  }

  limit(n: number) {
    this._limit = n;
    return this;
  }

  eq(col: string, val: any) {
    this._col = col;
    this._val = val;
    if (col === 'id') {
      this._id = val;
    }
    return this;
  }

  async execute(): Promise<{ data: any; error: any }> {
    try {
      const params = new URLSearchParams();
      if (this._orderBy) params.append('orderBy', this._orderBy);
      if (this._orderDir) params.append('orderDir', this._orderDir);
      if (this._limit) params.append('limit', String(this._limit));
      if (this._id) params.append('id', this._id);
      if (this._col && this._val !== undefined) {
        params.append('col', this._col);
        params.append('val', String(this._val));
      }

      const res = await fetch(`/api/tidb/table/${this.table}?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Server status ${res.status}`);
      }
      const json = await res.json();
      return json;
    } catch (err: any) {
      // Fallback to localStorage if server or offline
      console.warn(`[TiDB Client] Fallback local for ${this.table}:`, err.message);
      const local = JSON.parse(localStorage.getItem(`tidb_cache_${this.table}`) || '[]');
      return { data: local, error: null };
    }
  }

  // Promise-like behavior so `await db.from('...').select('*')` works
  then(resolve: any, reject?: any) {
    return this.execute().then(resolve, reject);
  }

  async maybeSingle(): Promise<{ data: any; error: any }> {
    this._limit = 1;
    const res = await this.execute();
    return { data: Array.isArray(res.data) ? res.data[0] || null : res.data || null, error: res.error };
  }

  async single(): Promise<{ data: any; error: any }> {
    return this.maybeSingle();
  }

  async insert(payload: any): Promise<{ data: any; error: any }> {
    try {
      const res = await fetch(`/api/tidb/table/${this.table}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.error) {
        // Update local cache
        const cacheKey = `tidb_cache_${this.table}`;
        const current = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        const items = Array.isArray(payload) ? payload : [payload];
        localStorage.setItem(cacheKey, JSON.stringify([...items, ...current]));
      }
      return json;
    } catch (err: any) {
      console.error(`[TiDB Insert ${this.table}] error:`, err.message);
      return { data: payload, error: null };
    }
  }

  async update(updates: any): Promise<{ eq: (col: string, val: any) => Promise<{ data: any; error: any }> }> {
    return {
      eq: async (col: string, val: any) => {
        try {
          const res = await fetch(`/api/tidb/table/${this.table}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: val, updates }),
          });
          return await res.json();
        } catch (err: any) {
          return { data: updates, error: null };
        }
      },
    };
  }

  async delete(): Promise<{ eq: (col: string, val: any) => Promise<{ data: any; error: any }> }> {
    return {
      eq: async (col: string, val: any) => {
        try {
          const res = await fetch(`/api/tidb/table/${this.table}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: val }),
          });
          return await res.json();
        } catch (err: any) {
          return { data: { id: val }, error: null };
        }
      },
    };
  }
}

export const db = {
  from: (table: string) => new TableQueryBuilder(table),
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      try {
        const res = await fetch('/api/tidb/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const json = await res.json();
        if (json.error) {
          return { data: null, error: { message: json.error } };
        }
        localStorage.setItem('tidb_auth_session', JSON.stringify(json.data.session));
        localStorage.setItem('tidb_auth_user', JSON.stringify(json.data.user));
        return { data: json.data, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err.message || 'Gagal menghubungi server TiDB.' } };
      }
    },
    getSession: async () => {
      const stored = localStorage.getItem('tidb_auth_session');
      const session = stored ? JSON.parse(stored) : null;
      return { data: { session, user: session?.user || null }, error: null };
    },
    signOut: async () => {
      localStorage.removeItem('tidb_auth_session');
      localStorage.removeItem('tidb_auth_user');
      return { error: null };
    },
    onAuthStateChange: (cb: any) => {
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signUp: async () => ({ data: null, error: { message: 'Pendaftaran mandiri dikelola lewat Portal.' } }),
  },
};

export const dbClient = db;
export const isDemoMode = false;

export function resetDemoData() {
  localStorage.clear();
  window.location.reload();
}

export async function uploadFileToStorage(file: File, bucketName = 'app-assets'): Promise<{ url: string; isCloud: boolean }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ url: String(reader.result), isCloud: false });
    reader.onerror = () => reject(new Error('Gagal membaca berkas dokumen'));
    reader.readAsDataURL(file);
  });
}

export function parseError(error: any, fallback = 'Terjadi kesalahan pada sistem TiDB. Silakan coba lagi.') {
  if (!error) return fallback;
  return error.message || String(error) || fallback;
}
