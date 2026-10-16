import express from 'express';
import { getTiDBPool } from './src/lib/tidbConnection.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// API Endpoints
app.get('/api/registrations', async (req, res) => {
  try {
    const pool = getTiDBPool();
    const [rows] = await pool.query('SELECT * FROM registrations ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/registrations', async (req, res) => {
  try {
    const pool = getTiDBPool();
    // Simplified insert for demonstration
    const { ticket_number, customer_name, phone_number, address } = req.body;
    await pool.query(
      'INSERT INTO registrations (ticket_number, customer_name, phone_number, address) VALUES (?, ?, ?, ?)',
      [ticket_number, customer_name, phone_number, address]
    );
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
