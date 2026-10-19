// ============================================================================
// Firebase Database & Auth Adapter (Real-time Firestore)
// ============================================================================

import { initializeApp, getApps } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  updatePassword,
  signInAnonymously
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot 
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { seedRows, seedAuthUsers, DEMO_ACCOUNTS } from "./seedData";

export const BUCKETS = {
  assets: "app-assets",
  attachments: "attachments",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const isDemoMode = false;

// Helper to make UUIDs
function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Ensure database has seed data on first boot
async function ensureSeedData() {
  try {
    const rolesSnap = await getDocs(collection(db, "roles"));
    if (rolesSnap.empty) {
      console.log("[Firebase] Seeding initial data...");
      const seeded = seedRows();
      // Seed roles
      for (const r of seeded.roles) {
        await setDoc(doc(db, "roles", r.id), r);
      }
      // Seed profiles
      for (const p of seeded.profiles) {
        await setDoc(doc(db, "profiles", p.id), p);
      }
      // Seed permissions
      for (const perm of seeded.permissions) {
        await setDoc(doc(db, "permissions", perm.id), perm);
      }
      // Seed app_settings
      for (const s of seeded.app_settings) {
        await setDoc(doc(db, "app_settings", s.id), s);
      }
      // Seed workflow_statuses
      for (const w of seeded.workflow_statuses) {
        await setDoc(doc(db, "workflow_statuses", w.id), w);
      }
      console.log("[Firebase] Seeding completed.");
    }
  } catch (err) {
    console.warn("[Firebase] Seed check warning:", err);
  }
}

// Run seed check
ensureSeedData();

// Firestore Query Builder mimicking Supabase API
class FirestoreQuery {
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
  }

  select(_cols, options) {
    this._returning = true;
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
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  eq(col, val) {
    this.filters.push({ col, op: "==", val });
    return this;
  }
  neq(col, val) {
    this.filters.push({ col, op: "!=", val });
    return this;
  }
  gt(col, val) {
    this.filters.push({ col, op: ">", val });
    return this;
  }
  gte(col, val) {
    this.filters.push({ col, op: ">=", val });
    return this;
  }
  lt(col, val) {
    this.filters.push({ col, op: "<", val });
    return this;
  }
  lte(col, val) {
    this.filters.push({ col, op: "<=", val });
    return this;
  }
  like(col, val) {
    return this;
  }
  ilike(col, val) {
    return this;
  }
  is(col, val) {
    this.filters.push({ col, op: "==", val });
    return this;
  }
  in(col, values) {
    this.filters.push({ col, op: "in", val: values });
    return this;
  }
  contains(col, values) {
    return this;
  }
  not(col, kind, val) {
    return this;
  }
  or(input) {
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

  async execute() {
    try {
      const colRef = collection(db, this.table);
      const nowIso = new Date().toISOString();

      if (this.mode === "insert" || this.mode === "upsert") {
        const payload = Array.isArray(this._payload) ? this._payload : [this._payload];
        const created = [];
        for (const item of payload) {
          const row = { ...item };
          const docId = row.id ? String(row.id) : makeId();
          row.id = docId;
          if (!row.created_at) row.created_at = nowIso;
          row.updated_at = nowIso;

          await setDoc(doc(db, this.table, docId), row, { merge: true });
          created.push(row);
        }
        if (!this._returning) return { data: null, error: null };
        if (this._single) return { data: created[0] ?? null, error: null };
        return { data: created, error: null };
      }

      if (this.mode === "update") {
        const qRef = this.buildQuery(colRef);
        const snapshot = await getDocs(qRef);
        const updatedRows = [];
        for (const dSnap of snapshot.docs) {
          const docRef = doc(db, this.table, dSnap.id);
          const patch = { ...this._payload, updated_at: nowIso };
          await updateDoc(docRef, patch);
          updatedRows.push({ ...dSnap.data(), ...patch });
        }
        if (!this._returning) return { data: null, error: null };
        if (this._single || this._maybe) return { data: updatedRows[0] ?? null, error: null };
        return { data: updatedRows, error: null };
      }

      if (this.mode === "delete") {
        const qRef = this.buildQuery(colRef);
        const snapshot = await getDocs(qRef);
        const deleted = [];
        for (const dSnap of snapshot.docs) {
          deleted.push(dSnap.data());
          await deleteDoc(doc(db, this.table, dSnap.id));
        }
        if (!this._returning) return { data: null, error: null };
        if (this._single) return { data: deleted[0] ?? null, error: null };
        return { data: deleted, error: null };
      }

      // SELECT with robust fallback
      let snapshot;
      try {
        let qRef = this.buildQuery(colRef);
        if (this.orders.length > 0) {
          const o = this.orders[0];
          try {
            qRef = query(qRef, orderBy(o.col, o.asc ? "asc" : "desc"));
          } catch (e) {}
        }
        if (this._limit != null) {
          qRef = query(qRef, limit(this._limit));
        }
        snapshot = await getDocs(qRef);
      } catch (queryErr) {
        console.warn("[Firebase] Query fallback to all docs:", queryErr);
        snapshot = await getDocs(colRef);
      }

      let rows = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));

      // In-memory filter
      if (this.filters.length > 0) {
        rows = rows.filter(row => {
          return this.filters.every(f => {
            const val = row[f.col];
            if (f.op === "==") return val === f.val;
            if (f.op === "!=") return val !== f.val;
            if (f.op === ">") return val > f.val;
            if (f.op === ">=") return val >= f.val;
            if (f.op === "<") return val < f.val;
            if (f.op === "<=") return val <= f.val;
            if (f.op === "in") return f.val?.includes(val);
            return true;
          });
        });
      }

      // In-memory sort
      if (this.orders.length > 0) {
        const o = this.orders[0];
        rows.sort((a, b) => {
          const av = a[o.col];
          const bv = b[o.col];
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          let cmp = 0;
          if (typeof av === "string") cmp = av.localeCompare(String(bv));
          else cmp = av - bv;
          return o.asc ? cmp : -cmp;
        });
      }

      if (this._limit != null && rows.length > this._limit) {
        rows = rows.slice(0, this._limit);
      }

      if (this._single) {
        if (!rows.length) return { data: null, error: { message: "Data tidak ditemukan.", code: "PGRST116" } };
        return { data: rows[0], error: null };
      }
      if (this._maybe) {
        return { data: rows[0] ?? null, error: null };
      }
      return { data: rows, error: null, count: rows.length };
    } catch (err) {
      console.error("[Firebase] Query execute error:", err);
      return { data: null, error: { message: err.message } };
    }
  }

  buildQuery(colRef) {
    let q = colRef;
    // Firestore allows limited where clauses without complex index requirements
    const simpleFilters = this.filters.slice(0, 2);
    for (const f of simpleFilters) {
      try {
        q = query(q, where(f.col, f.op, f.val));
      } catch (e) {
        console.warn("[Firebase] Filter index warning:", e);
      }
    }
    return q;
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

// Supabase compatibility object
export const supabase = {
  __firebase: true,
  from(table) {
    return new FirestoreQuery(table);
  },
  auth: {
    async getSession() {
      const user = auth.currentUser;
      if (!user) {
        // Default demo login fallback if none signed in
        return { data: { session: null, user: null }, error: null };
      }
      const session = {
        access_token: `firebase.${user.uid}`,
        token_type: "bearer",
        user: {
          id: user.uid,
          email: user.email,
          user_metadata: { full_name: user.displayName || user.email?.split("@")[0] },
          last_sign_in_at: new Date().toISOString(),
        },
      };
      return { data: { session, user: session.user }, error: null };
    },
    async signInWithPassword({ email, password }) {
      try {
        const cleanEmail = email.trim().toLowerCase();
        let userCred;
        try {
          userCred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        } catch (authErr) {
          // If demo account doesn't exist in Firebase Auth yet, create it automatically!
          const demoAcc = DEMO_ACCOUNTS.find(a => a.email.toLowerCase() === cleanEmail);
          if (demoAcc) {
            userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          } else {
            throw authErr;
          }
        }
        const user = userCred.user;
        const session = {
          access_token: `firebase.${user.uid}`,
          token_type: "bearer",
          user: {
            id: user.uid,
            email: user.email,
            user_metadata: { full_name: user.displayName || user.email?.split("@")[0] },
            last_sign_in_at: new Date().toISOString(),
          },
        };
        return { data: { session, user: session.user }, error: null };
      } catch (err) {
        return { data: null, error: { message: err.message || "Gagal masuk. Periksa kredensial Anda." } };
      }
    },
    async signUp({ email, password, options }) {
      try {
        const cleanEmail = email.trim().toLowerCase();
        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const user = userCred.user;
        return { data: { user: { id: user.uid, email: user.email }, session: null }, error: null };
      } catch (err) {
        return { data: null, error: { message: err.message || "Gagal mendaftarkan akun." } };
      }
    },
    async signOut() {
      await fbSignOut(auth);
      return { error: null };
    },
    async updateUser({ password }) {
      const user = auth.currentUser;
      if (!user) return { data: null, error: { message: "Sesi tidak ditemukan." } };
      if (password) {
        await updatePassword(user, password);
      }
      return { data: { user }, error: null };
    },
    onAuthStateChange(callback) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (!user) {
          callback("SIGNED_OUT", null);
        } else {
          const session = {
            access_token: `firebase.${user.uid}`,
            token_type: "bearer",
            user: {
              id: user.uid,
              email: user.email,
              user_metadata: { full_name: user.displayName || user.email?.split("@")[0] },
            },
          };
          callback("SIGNED_IN", session);
        }
      });
      return {
        data: {
          subscription: {
            unsubscribe,
            remove: unsubscribe,
          },
        },
      };
    },
  },
  storage: {
    from(bucket) {
      return {
        async upload(path, file) {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ data: { path, bucket, url: String(reader.result) }, error: null });
            reader.onerror = () => reject({ data: null, error: { message: "Gagal membaca berkas." } });
            reader.readAsDataURL(file);
          });
        },
        async remove(paths) {
          return { data: paths, error: null };
        },
        getPublicUrl(path) {
          return { data: { publicUrl: path } };
        },
      };
    },
  },
};

export const dbClient = supabase;
export const dbAdapter = supabase;

export async function resetDemoData() {
  try {
    const collectionsToClear = ["registrations", "repair_orders", "activity_logs", "status_history", "custom_forms", "customer_ratings"];
    for (const cName of collectionsToClear) {
      const snap = await getDocs(collection(db, cName));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, cName, d.id));
      }
    }
  } catch (err) {
    console.warn("Reset Firestore error:", err);
  }
  window.localStorage.clear();
  window.setTimeout(() => window.location.reload(), 500);
  return true;
}

export async function uploadFileToStorage(file, bucketName = "app-assets") {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ url: String(reader.result), isCloud: true });
    reader.onerror = () => reject(new Error("Gagal membaca berkas dokumen"));
    reader.readAsDataURL(file);
  });
}

export function parseError(error, fallback = "Terjadi kesalahan pada sistem. Silakan coba lagi.") {
  if (!error) return fallback;
  const message = String(error.message ?? error ?? "");
  return message || fallback;
}
