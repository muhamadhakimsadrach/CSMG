import mysql from 'mysql2/promise';

const TIDB_CONNECTION_URL = process.env.DATABASE_URL || 
  'mysql://3Km63GXw5WDRMuG.root:78ghQ4N9AmRKg2PD@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/aetra?ssl={"rejectUnauthorized":true}';

let pool: mysql.Pool | null = null;
let isConnected = false;
let lastError: string | null = null;

export function getTiDBPool(): mysql.Pool {
  if (!pool) {
    try {
      pool = mysql.createPool({
        uri: TIDB_CONNECTION_URL,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        ssl: {
          rejectUnauthorized: true,
        },
      });
      console.log('[TiDB] Connection pool created for TiDB Cloud MySQL');
    } catch (err: any) {
      console.error('[TiDB] Failed to create pool:', err.message);
      lastError = err.message;
      throw err;
    }
  }
  return pool;
}

export async function testConnection(): Promise<{ ok: boolean; message: string; latency?: number }> {
  const start = Date.now();
  try {
    const p = getTiDBPool();
    const [rows]: any = await p.query('SELECT 1 as connected, NOW() as server_time');
    isConnected = true;
    lastError = null;
    const latency = Date.now() - start;
    return { ok: true, message: `Terhubung ke TiDB Cloud MySQL (${latency}ms)`, latency };
  } catch (err: any) {
    isConnected = false;
    lastError = err.message;
    console.error('[TiDB Connection Test Failed]:', err.message);
    return { ok: false, message: err.message };
  }
}

export async function initTiDBSchema(): Promise<void> {
  const p = getTiDBPool();
  
  // 1. Ensure database exists
  try {
    await p.query('CREATE DATABASE IF NOT EXISTS aetra');
  } catch (e: any) {
    console.warn('[TiDB] DB create warning:', e.message);
  }

  // 2. Create tables
  const schemaQueries = [
    `CREATE TABLE IF NOT EXISTS app_settings (
      id VARCHAR(64) PRIMARY KEY,
      app_name VARCHAR(255) NOT NULL DEFAULT 'Aetra Tangerang',
      company_name VARCHAR(255) NOT NULL DEFAULT 'PT Aetra Air Tangerang',
      tagline VARCHAR(255) DEFAULT 'Portal Layanan Pelanggan',
      logo_url TEXT,
      favicon_url TEXT,
      accent_color VARCHAR(32) DEFAULT '#0077BD',
      login_title VARCHAR(255) DEFAULT 'Portal Layanan Terpadu',
      login_subtitle TEXT,
      login_badge VARCHAR(255) DEFAULT 'Layanan Air Terpadu PT Aetra',
      login_hero_image TEXT,
      support_email VARCHAR(255),
      support_phone VARCHAR(64) DEFAULT '021 598 5474',
      created_at VARCHAR(64),
      updated_at VARCHAR(64)
    )`,

    `CREATE TABLE IF NOT EXISTS roles (
      id VARCHAR(64) PRIMARY KEY,
      role_name VARCHAR(255) NOT NULL,
      description TEXT,
      created_at VARCHAR(64)
    )`,

    `CREATE TABLE IF NOT EXISTS profiles (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255) UNIQUE,
      full_name VARCHAR(255) NOT NULL,
      role_id VARCHAR(64),
      role_name VARCHAR(255),
      department VARCHAR(255),
      phone_number VARCHAR(64),
      avatar_url TEXT,
      password VARCHAR(255) DEFAULT 'Admin123!',
      is_active TINYINT(1) DEFAULT 1,
      created_at VARCHAR(64),
      updated_at VARCHAR(64)
    )`,

    `CREATE TABLE IF NOT EXISTS permissions (
      id VARCHAR(64) PRIMARY KEY,
      role_id VARCHAR(64) NOT NULL,
      module_name VARCHAR(64) NOT NULL,
      can_create TINYINT(1) DEFAULT 0,
      can_read TINYINT(1) DEFAULT 1,
      can_update TINYINT(1) DEFAULT 0,
      can_delete TINYINT(1) DEFAULT 0,
      created_at VARCHAR(64)
    )`,

    `CREATE TABLE IF NOT EXISTS registrations (
      id VARCHAR(64) PRIMARY KEY,
      ticket_number VARCHAR(100) UNIQUE NOT NULL,
      registration_no VARCHAR(100),
      customer_number VARCHAR(100),
      customer_name VARCHAR(255) NOT NULL,
      identity_number VARCHAR(64),
      identity_no VARCHAR(64),
      phone_number VARCHAR(64),
      phone VARCHAR(64),
      email VARCHAR(255),
      service_type VARCHAR(100) DEFAULT 'Sambungan Baru Reguler',
      package_plan VARCHAR(100) DEFAULT 'Standar Rumah Tangga',
      district VARCHAR(100),
      address TEXT,
      installation_address TEXT,
      rt_rw VARCHAR(64),
      postal_code VARCHAR(32),
      sales_code VARCHAR(64),
      assigned_sales_id VARCHAR(64),
      assigned_sales_name VARCHAR(255),
      status VARCHAR(100) DEFAULT 'Pendaftaran Diterima',
      current_status_id VARCHAR(64),
      initial_payment_status VARCHAR(64) DEFAULT 'pending',
      initial_payment_amount DECIMAL(12,2) DEFAULT 0,
      non_regular_payment_status VARCHAR(64) DEFAULT 'pending',
      non_regular_payment_amount DECIMAL(12,2) DEFAULT 0,
      notes TEXT,
      created_by VARCHAR(255) DEFAULT 'Pelanggan Mandiri',
      created_at VARCHAR(64),
      updated_at VARCHAR(64)
    )`,

    `CREATE TABLE IF NOT EXISTS repair_orders (
      id VARCHAR(64) PRIMARY KEY,
      ticket_number VARCHAR(100) UNIQUE NOT NULL,
      customer_number VARCHAR(100),
      customer_name VARCHAR(255),
      phone_number VARCHAR(64),
      location_address TEXT,
      repair_category VARCHAR(100),
      title VARCHAR(255),
      issue_description TEXT,
      priority VARCHAR(64) DEFAULT 'Medium',
      status VARCHAR(100) DEFAULT 'Tiket Dibuat',
      current_status_id VARCHAR(64),
      assigned_technician VARCHAR(255),
      assigned_division VARCHAR(100) DEFAULT 'Minor Repair',
      sla_hours INT DEFAULT 24,
      sla_deadline VARCHAR(64),
      resolved_at VARCHAR(64),
      created_at VARCHAR(64),
      updated_at VARCHAR(64)
    )`,

    `CREATE TABLE IF NOT EXISTS workflow_statuses (
      id VARCHAR(64) PRIMARY KEY,
      workflow_type VARCHAR(64) NOT NULL,
      step_order INT NOT NULL,
      status_name VARCHAR(255) NOT NULL,
      color_code VARCHAR(32) DEFAULT '#3b82f6',
      sla_hours INT DEFAULT 12,
      is_initial TINYINT(1) DEFAULT 0,
      is_final TINYINT(1) DEFAULT 0,
      created_at VARCHAR(64),
      updated_at VARCHAR(64)
    )`,

    `CREATE TABLE IF NOT EXISTS activity_logs (
      id VARCHAR(64) PRIMARY KEY,
      user_name VARCHAR(255),
      user_role VARCHAR(255),
      action VARCHAR(255),
      module VARCHAR(100),
      detail TEXT,
      created_at VARCHAR(64)
    )`,

    `CREATE TABLE IF NOT EXISTS status_history (
      id VARCHAR(64) PRIMARY KEY,
      entity_type VARCHAR(64) NOT NULL,
      entity_id VARCHAR(64) NOT NULL,
      old_status VARCHAR(255),
      new_status VARCHAR(255),
      changed_by VARCHAR(255),
      notes TEXT,
      created_at VARCHAR(64)
    )`
  ];

  for (const q of schemaQueries) {
    try {
      await p.query(q);
    } catch (err: any) {
      console.error('[TiDB Schema Error on query]:', err.message);
    }
  }

  // 3. Seed initial users and demo settings if empty
  try {
    const [countRows]: any = await p.query('SELECT COUNT(*) as count FROM profiles');
    if (countRows[0]?.count === 0) {
      console.log('[TiDB] Seeding default demo accounts into TiDB...');
      const defaultProfiles = [
        ['usr_admin_01', 'admin@aetra.demo', 'Rani Prameswari (Admin)', 'role_admin', 'Admin Aetra', 'Manajemen Pusat & Pengaturan', '081200001001', 'Admin123!'],
        ['usr_cs_01', 'cs@aetra.demo', 'Intan Permatasari (CS)', 'role_cs', 'Customer Service', 'Pintu Masuk Pendaftaran & Complain', '081200001002', 'CS123!'],
        ['usr_spv_sales_01', 'spv.sales@aetra.demo', 'Bagas Adhi Nugroho', 'role_spv_sales', 'SPV Sales', 'Supervisor Divisi Sales', '081200001003', 'SpvSales123!'],
        ['usr_spv_tech_01', 'spv.technical@aetra.demo', 'Fikri Maulana', 'role_spv_tech', 'SPV Technical', 'Supervisor Divisi Teknik', '081200001004', 'SpvTech123!'],
        ['usr_sales_01', 'sales@aetra.demo', 'Sarah Wijaya', 'role_sales', 'Sales', 'Petugas Survey & Pendaftaran', '081200001005', 'Sales123!'],
        ['usr_nc_01', 'nc@aetra.demo', 'Joko Susilo', 'role_nc', 'NC (New Connection)', 'Tim Instalasi Sambungan Baru', '081200001006', 'Nc123!'],
        ['usr_repair_01', 'repair@aetra.demo', 'Dedi Kurniawan', 'role_repair', 'Minor Repair', 'Tim Perbaikan & Material', '081200001007', 'Repair123!'],
        ['usr_plg_01', 'pelanggan@aetra.demo', 'Warga Pengguna', 'role_pelanggan', 'Pelanggan', 'Portal Pemohon & Pengadu', '081200001008', 'Pelanggan123!'],
      ];

      for (const row of defaultProfiles) {
        await p.query(
          `INSERT INTO profiles (id, email, full_name, role_id, role_name, department, phone_number, password, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
           ON DUPLICATE KEY UPDATE email=VALUES(email)`,
          row
        );
      }
      console.log('[TiDB] Profiles seeded successfully');
    }
  } catch (e: any) {
    console.warn('[TiDB] Seeding warning:', e.message);
  }

  console.log('[TiDB] Database schema and initial data verified successfully!');
}
