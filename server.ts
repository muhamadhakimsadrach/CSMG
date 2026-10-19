import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTiDBPool, initTiDBSchema, testConnection } from './src/server/tidb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_TABLES = new Set([
  'app_settings',
  'roles',
  'profiles',
  'permissions',
  'registrations',
  'repair_orders',
  'workflow_statuses',
  'activity_logs',
  'status_history',
]);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Initialize TiDB tables in background
  initTiDBSchema().catch((err) => {
    console.error('[TiDB Init Warning]:', err.message);
  });

  // Health check & TiDB status
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  app.get('/api/tidb/status', async (req, res) => {
    const status = await testConnection();
    res.json(status);
  });

  // Login via TiDB
  app.post('/api/tidb/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email dan kata sandi wajib diisi' });
      }

      const pool = getTiDBPool();
      const [rows]: any = await pool.query(
        'SELECT id, email, full_name, role_id, role_name, department, phone_number, is_active FROM profiles WHERE LOWER(email) = LOWER(?) AND password = ? LIMIT 1',
        [email.trim(), password]
      );

      if (!rows || rows.length === 0) {
        return res.status(401).json({ error: 'Email atau kata sandi tidak sesuai.' });
      }

      const user = rows[0];
      if (!user.is_active) {
        return res.status(403).json({ error: 'Akun Anda dinonaktifkan. Hubungi Administrator.' });
      }

      const session = {
        access_token: `tidb.${user.id}.${Date.now()}`,
        token_type: 'bearer',
        user: {
          id: user.id,
          email: user.email,
          user_metadata: { full_name: user.full_name },
        },
      };

      res.json({ data: { user, session }, error: null });
    } catch (err: any) {
      console.error('[TiDB Auth Login Error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Fetch rows from TiDB table
  app.get('/api/tidb/table/:table', async (req, res) => {
    const { table } = req.params;
    if (!VALID_TABLES.has(table)) {
      return res.status(400).json({ error: `Tabel '${table}' tidak diizinkan.` });
    }

    try {
      const pool = getTiDBPool();
      const { orderBy, orderDir, limit, id, col, val } = req.query;

      let sql = `SELECT * FROM \`${table}\``;
      const params: any[] = [];

      if (id) {
        sql += ' WHERE id = ?';
        params.push(id);
      } else if (col && val !== undefined) {
        sql += ` WHERE \`${col}\` = ?`;
        params.push(val);
      }

      if (orderBy) {
        const dir = String(orderDir).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        sql += ` ORDER BY \`${orderBy}\` ${dir}`;
      } else if (table === 'registrations' || table === 'repair_orders' || table === 'activity_logs') {
        sql += ' ORDER BY created_at DESC';
      }

      if (limit) {
        const l = Math.min(Math.max(Number(limit) || 100, 1), 5000);
        sql += ` LIMIT ${l}`;
      }

      const [rows] = await pool.query(sql, params);
      res.json({ data: rows, error: null });
    } catch (err: any) {
      console.error(`[TiDB Select ${table} Error]:`, err.message);
      res.status(500).json({ data: null, error: err.message });
    }
  });

  // Insert or Upsert into TiDB table
  app.post('/api/tidb/table/:table', async (req, res) => {
    const { table } = req.params;
    if (!VALID_TABLES.has(table)) {
      return res.status(400).json({ error: `Tabel '${table}' tidak diizinkan.` });
    }

    try {
      const pool = getTiDBPool();
      const payload = req.body;
      const items = Array.isArray(payload) ? payload : [payload];
      if (items.length === 0) {
        return res.json({ data: [], error: null });
      }

      const results = [];
      for (const item of items) {
        if (!item.id) {
          item.id = `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        if (!item.created_at) {
          item.created_at = new Date().toISOString();
        }

        const keys = Object.keys(item);
        const values = Object.values(item).map((v) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : v));
        const placeholders = keys.map(() => '?').join(', ');
        const updateAssignments = keys
          .filter((k) => k !== 'id' && k !== 'created_at')
          .map((k) => `\`${k}\`=VALUES(\`${k}\`)`)
          .join(', ');

        const sql = `INSERT INTO \`${table}\` (${keys.map((k) => `\`${k}\``).join(', ')})
                     VALUES (${placeholders})
                     ${updateAssignments ? `ON DUPLICATE KEY UPDATE ${updateAssignments}` : ''}`;

        await pool.query(sql, values);
        results.push(item);
      }

      res.json({ data: Array.isArray(payload) ? results : results[0], error: null });
    } catch (err: any) {
      console.error(`[TiDB Insert ${table} Error]:`, err.message);
      res.status(500).json({ data: null, error: err.message });
    }
  });

  // Update in TiDB table
  app.patch('/api/tidb/table/:table', async (req, res) => {
    const { table } = req.params;
    if (!VALID_TABLES.has(table)) {
      return res.status(400).json({ error: `Tabel '${table}' tidak diizinkan.` });
    }

    try {
      const pool = getTiDBPool();
      const { id, updates } = req.body;

      if (!id || !updates || typeof updates !== 'object') {
        return res.status(400).json({ error: 'id dan updates wajib disertakan.' });
      }

      updates.updated_at = new Date().toISOString();

      const keys = Object.keys(updates);
      const values = Object.values(updates).map((v) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : v));
      const setClause = keys.map((k) => `\`${k}\` = ?`).join(', ');

      await pool.query(`UPDATE \`${table}\` SET ${setClause} WHERE id = ?`, [...values, id]);

      const [updatedRows]: any = await pool.query(`SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`, [id]);
      res.json({ data: updatedRows[0] || updates, error: null });
    } catch (err: any) {
      console.error(`[TiDB Update ${table} Error]:`, err.message);
      res.status(500).json({ data: null, error: err.message });
    }
  });

  // Delete from TiDB table
  app.delete('/api/tidb/table/:table', async (req, res) => {
    const { table } = req.params;
    if (!VALID_TABLES.has(table)) {
      return res.status(400).json({ error: `Tabel '${table}' tidak diizinkan.` });
    }

    try {
      const pool = getTiDBPool();
      const { id } = req.body || req.query;

      if (!id) {
        return res.status(400).json({ error: 'id wajib disertakan untuk penghapusan.' });
      }

      await pool.query(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
      res.json({ data: { id }, error: null });
    } catch (err: any) {
      console.error(`[TiDB Delete ${table} Error]:`, err.message);
      res.status(500).json({ data: null, error: err.message });
    }
  });

  // Sync entire initial state for fast initial app render
  app.get('/api/tidb/sync-all', async (req, res) => {
    try {
      const pool = getTiDBPool();
      const tables = ['profiles', 'roles', 'permissions', 'app_settings', 'registrations', 'repair_orders', 'workflow_statuses', 'activity_logs'];
      const data: Record<string, any[]> = {};

      for (const t of tables) {
        try {
          const [rows]: any = await pool.query(`SELECT * FROM \`${t}\` LIMIT 2000`);
          data[t] = rows;
        } catch {
          data[t] = [];
        }
      }

      res.json({ data, error: null });
    } catch (err: any) {
      res.status(500).json({ data: null, error: err.message });
    }
  });

  // Mount Vite dev server in development or serve built assets in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] running on port ${PORT} with TiDB Cloud MySQL`);
  });
}

startServer();
