import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  user: '3Km63GXw5WDRMuG.root',
  password: '78ghQ4N9AmRKg2PD',
  database: 'sys',
  port: 4000,
  ssl: {
    rejectUnauthorized: true,
  },
};

const pool = mysql.createPool(dbConfig);

export const BUCKETS = {
  assets: "app-assets",
  attachments: "attachments",
};

export const db = {
  from: (table) => ({
    select: (query = '*') => ({
      order: (col, options) => ({
        limit: async (n) => {
          const [rows] = await pool.query(`SELECT ${query} FROM ${table} ORDER BY ${col} ${options?.ascending === false ? 'DESC' : 'ASC'} LIMIT ${n}`);
          return { data: rows, error: null };
        },
        maybeSingle: async () => {
          const [rows] = await pool.query(`SELECT ${query} FROM ${table} ORDER BY ${col} LIMIT 1`);
          return { data: rows[0] || null, error: null };
        }
      }),
      maybeSingle: async () => {
        const [rows] = await pool.query(`SELECT ${query} FROM ${table} LIMIT 1`);
        return { data: rows[0] || null, error: null };
      }
    }),
    insert: async (data) => {
      const keys = Object.keys(data).join(', ');
      const values = Object.values(data).map(v => typeof v === 'string' ? `'${v}'` : v).join(', ');
      const [result] = await pool.query(`INSERT INTO ${table} (${keys}) VALUES (${values})`);
      return { data: result, error: null };
    },
    update: (data) => ({
      eq: async (col, val) => {
        const setClause = Object.entries(data).map(([k, v]) => `${k} = '${v}'`).join(', ');
        const [result] = await pool.query(`UPDATE ${table} SET ${setClause} WHERE ${col} = '${val}'`);
        return { data: result, error: null };
      }
    }),
    delete: () => ({
      eq: async (col, val) => {
        const [result] = await pool.query(`DELETE FROM ${table} WHERE ${col} = '${val}'`);
        return { data: result, error: null };
      }
    }),
    eq: (col, val) => ({
      select: async (query = '*') => {
        const [rows] = await pool.query(`SELECT ${query} FROM ${table} WHERE ${col} = '${val}'`);
        return { data: rows, error: null };
      }
    })
  }),
  auth: {
    signInWithPassword: async ({ email, password }) => {
      // Logic auth disesuaikan dengan skema tabel user Anda di TiDB
      const [rows] = await pool.query(`SELECT * FROM profiles WHERE email = '${email}' AND password = '${password}'`);
      if (rows.length > 0) return { data: { session: { user: rows[0] } }, error: null };
      return { data: null, error: { message: "Login gagal" } };
    },
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signUp: async () => ({ data: null, error: { message: "Not implemented" } }),
    signOut: async () => ({ error: null })
  }
};

export const supabase = db;
export const isDemoMode = false;
export function resetDemoData() {}
export async function uploadFileToStorage(file, bucketName = "app-assets") { return { url: '', isCloud: false }; }
export function parseError(error) { return error.message; }
