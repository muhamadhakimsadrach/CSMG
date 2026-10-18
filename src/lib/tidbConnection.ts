import mysql, { Pool } from 'mysql2/promise';

let tidbConfig = {
  host: process.env.TIDB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  port: Number(process.env.TIDB_PORT || 4000),
  user: process.env.TIDB_USER || '2CMVuLUg9k63iXm.root',
  password: process.env.TIDB_PASSWORD || 'Zk31xGHxEbyBGlXn',
  database: process.env.TIDB_DATABASE || 'sys',
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
  },
  connectTimeout: 10000,
};

let poolInstance: Pool | null = null;

export function getTiDBPool(): Pool {
  if (!poolInstance) {
    poolInstance = mysql.createPool(tidbConfig);
  }
  return poolInstance;
}

export function getTiDBSanitizedConfig() {
  return {
    host: tidbConfig.host,
    port: tidbConfig.port,
    user: tidbConfig.user,
    database: tidbConfig.database,
    hasPassword: Boolean(tidbConfig.password),
  };
}

export async function updateTiDBConfig(updates: Partial<{ host: string; port: number; user: string; password: string; database: string }>) {
  if (poolInstance) {
    try {
      await poolInstance.end();
    } catch {
      // ignore
    }
    poolInstance = null;
  }
  tidbConfig = {
    ...tidbConfig,
    ...updates,
    port: updates.port ? Number(updates.port) : tidbConfig.port,
  };
}

export async function testTiDBConnection() {
  try {
    const pool = getTiDBPool();
    const [rows]: any = await pool.query('SELECT 1 as connected, NOW() as server_time');
    return {
      success: true,
      data: Array.isArray(rows) ? rows[0] : rows,
      message: 'Berhasil terhubung ke TiDB Cloud MySQL!',
      config: getTiDBSanitizedConfig(),
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Koneksi TiDB gagal',
      code: err.code,
      config: getTiDBSanitizedConfig(),
    };
  }
}
