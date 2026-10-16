import mysql.promise from 'mysql2';

const tidbConfig = {
  host: process.env.TIDB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  port: Number(process.env.TIDB_PORT || 4000),
  user: process.env.TIDB_USER || '2CMVuLuG9k63iXm.root',
  password: process.env.TIDB_PASSWORD || 'OFBMKXukDxXav86B',
  database: process.env.TIDB_DATABASE || 'sys',
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
  },
  connectTimeout: 10000,
};

let poolInstance = null;

export function getTiDBPool() {
  if (!poolInstance) {
    poolInstance = mysql.createPool(tidbConfig);
  }
  return poolInstance;
}

export async function testTiDBConnection() {
  try {
    const pool = getTiDBPool();
    const [rows] = await pool.query('SELECT 1 as connected, NOW() as server_time');
    return { success: true, data: rows[0], message: 'Berhasil terhubung ke TiDB Cloud MySQL!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Koneksi TiDB gagal' };
  }
}
