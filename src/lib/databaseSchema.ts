export const TIDB_MYSQL_SCHEMA = `-- ==============================================================================
-- SKEMA RELASIONAL DATABASE TIDB MYSQL
-- Aplikasi: Portal Layanan Terpusat PT Aetra Air Tangerang
-- Kompatibel: TiDB Cloud, TiDB Serverless, MySQL 8.0+
-- ==============================================================================

-- 1. TABEL PENGATURAN APLIKASI (app_settings)
CREATE TABLE IF NOT EXISTS app_settings (
    id VARCHAR(36) PRIMARY KEY,
    app_name VARCHAR(120) NOT NULL DEFAULT 'Aetra Tangerang',
    company_name VARCHAR(150) NOT NULL DEFAULT 'PT Aetra Air Tangerang',
    company_tagline VARCHAR(255) DEFAULT 'Air bersih, kehidupan lebih baik.',
    logo_url TEXT,
    login_hero_image TEXT,
    support_email VARCHAR(100) DEFAULT 'care@aetra.co.id',
    support_phone VARCHAR(50) DEFAULT '+62 21 590 8888',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABEL PERAN & HAK AKSES (roles)
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(36) PRIMARY KEY,
    role_name VARCHAR(80) NOT NULL UNIQUE,
    division VARCHAR(80) NOT NULL,
    description TEXT,
    is_admin TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABEL MATRIKS IZIN MODUL (permissions)
CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(36) PRIMARY KEY,
    role_id VARCHAR(36) NOT NULL,
    module VARCHAR(60) NOT NULL,
    can_read TINYINT(1) DEFAULT 0,
    can_create TINYINT(1) DEFAULT 0,
    can_update TINYINT(1) DEFAULT 0,
    can_delete TINYINT(1) DEFAULT 0,
    INDEX idx_permissions_role (role_id),
    CONSTRAINT fk_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABEL PENGGUNA & STAF (profiles)
CREATE TABLE IF NOT EXISTS profiles (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(120) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    role_id VARCHAR(36) NOT NULL,
    phone VARCHAR(30),
    customer_id VARCHAR(50),
    avatar_url TEXT,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_profiles_customer_id (customer_id),
    CONSTRAINT fk_profiles_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABEL TAHAPAN ALUR KERJA (workflow_statuses)
CREATE TABLE IF NOT EXISTS workflow_statuses (
    id VARCHAR(36) PRIMARY KEY,
    workflow_type VARCHAR(40) NOT NULL DEFAULT 'registration',
    step_order INT NOT NULL,
    label VARCHAR(100) NOT NULL,
    color VARCHAR(30) DEFAULT 'blue',
    requires_approval TINYINT(1) DEFAULT 0,
    assigned_division VARCHAR(60),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_workflow_type_order (workflow_type, step_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABEL PENDAFTARAN SAMBUNGAN AIR (registrations)
CREATE TABLE IF NOT EXISTS registrations (
    id VARCHAR(36) PRIMARY KEY,
    registration_number VARCHAR(60) NOT NULL UNIQUE,
    customer_number VARCHAR(60) UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    identity_no VARCHAR(40) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(120),
    address TEXT NOT NULL,
    category VARCHAR(40) DEFAULT 'Rumah Tangga',
    status VARCHAR(80) NOT NULL DEFAULT 'Draft Pendaftaran',
    current_status_id VARCHAR(36),
    assigned_surveyor VARCHAR(120),
    assigned_technician VARCHAR(120),
    survey_date DATETIME,
    pipe_distance_meters DECIMAL(8,2) DEFAULT 0,
    connection_type VARCHAR(40) DEFAULT 'Reguler',
    initial_payment_status VARCHAR(30) DEFAULT 'pending',
    initial_payment_amount DECIMAL(12,2) DEFAULT 1500000.00,
    initial_paid_at DATETIME,
    non_regular_payment_status VARCHAR(30) DEFAULT 'unbilled',
    non_regular_payment_amount DECIMAL(12,2) DEFAULT 0.00,
    non_regular_paid_at DATETIME,
    meter_serial_number VARCHAR(80),
    installed_at DATETIME,
    csat_rating INT,
    csat_feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_reg_customer_number (customer_number),
    INDEX idx_reg_identity_no (identity_no),
    INDEX idx_reg_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABEL TIKET GANGGUAN & PERBAIKAN (repair_orders)
CREATE TABLE IF NOT EXISTS repair_orders (
    id VARCHAR(36) PRIMARY KEY,
    order_number VARCHAR(60) NOT NULL UNIQUE,
    customer_number VARCHAR(60),
    customer_name VARCHAR(120) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    address TEXT NOT NULL,
    issue_type VARCHAR(80) NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(60) NOT NULL DEFAULT 'Laporan Diterima CS',
    sla_hours INT DEFAULT 24,
    assigned_technician VARCHAR(120),
    materials_used JSON,
    completion_notes TEXT,
    csat_score INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_repair_customer_number (customer_number),
    INDEX idx_repair_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TABEL RIWAYAT STATUS & AUDIT LOG (status_history)
CREATE TABLE IF NOT EXISTS status_history (
    id VARCHAR(36) PRIMARY KEY,
    entity_type VARCHAR(40) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    from_status VARCHAR(80),
    to_status VARCHAR(80) NOT NULL,
    actor_name VARCHAR(120) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_history_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export const SUPABASE_SQL_SCHEMA = TIDB_MYSQL_SCHEMA;
