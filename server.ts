import express from 'express';
import { createServer as createViteServer } from 'vite';
import { getTiDBPool, testTiDBConnection, updateTiDBConfig, getTiDBSanitizedConfig } from './src/lib/tidbConnection.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json());

  // Helper function to auto-create table if needed
  async function ensureTables() {
    try {
      const pool = getTiDBPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS registrations (
          id VARCHAR(255) PRIMARY KEY,
          ticket_number VARCHAR(100),
          customer_name VARCHAR(255),
          phone_number VARCHAR(100),
          address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (err: any) {
      console.warn('Auto table check warning:', err.message);
    }
  }

  // API Endpoints
  app.get('/api/tidb/status', async (req, res) => {
    const result = await testTiDBConnection();
    if (result.success) {
      await ensureTables();
    }
    res.json(result);
  });

  app.post('/api/tidb/configure', async (req, res) => {
    try {
      const { host, port, user, password, database } = req.body;
      await updateTiDBConfig({
        ...(host ? { host } : {}),
        ...(port ? { port: Number(port) } : {}),
        ...(user ? { user } : {}),
        ...(password ? { password } : {}),
        ...(database ? { database } : {}),
      });
      const status = await testTiDBConnection();
      if (status.success) {
        await ensureTables();
      }
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get('/api/registrations', async (req, res) => {
    try {
      const pool = getTiDBPool();
      const [rows] = await pool.query('SELECT * FROM registrations ORDER BY created_at DESC');
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/registrations', async (req, res) => {
    try {
      const pool = getTiDBPool();
      const { id, ticket_number, registration_no, customer_name, phone_number, address } = req.body;
      const ticketNo = ticket_number || registration_no || `REG-${Date.now()}`;
      await pool.query(
        'INSERT INTO registrations (id, ticket_number, customer_name, phone_number, address) VALUES (?, ?, ?, ?, ?)',
        [id || `reg_${Date.now()}`, ticketNo, customer_name || '', phone_number || '', address || '']
      );
      res.status(201).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
