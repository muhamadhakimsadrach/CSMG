export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- SKEMA BASIS DATA SUPABASE CLOUD (POSTGRESQL REALTIME)
-- Aplikasi: Portal Layanan Terpadu PT Aetra Air Tangerang
-- ==============================================================================

-- 1. TABEL PENGATURAN APLIKASI
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_name TEXT NOT NULL DEFAULT 'Aetra Tangerang',
    company_name TEXT NOT NULL DEFAULT 'PT Aetra Air Tangerang',
    tagline TEXT DEFAULT 'Portal Layanan Pelanggan',
    logo_url TEXT,
    favicon_url TEXT,
    accent_color TEXT DEFAULT '#0077BD',
    login_title TEXT DEFAULT 'Portal Layanan Terpadu',
    login_subtitle TEXT DEFAULT 'Akses staf internal, pendaftaran mandiri sambungan baru, dan pelacakan keluhan pelanggan.',
    login_badge TEXT DEFAULT 'Layanan Air Terpadu PT Aetra',
    login_hero_image TEXT,
    support_email TEXT,
    support_phone TEXT DEFAULT '021 598 5474',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL PENDAFTARAN SAMBUNGAN BARU
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT UNIQUE NOT NULL,
    customer_number TEXT,
    customer_name TEXT NOT NULL,
    id_card_number TEXT,
    phone_number TEXT,
    email TEXT,
    service_type TEXT DEFAULT 'Rumah tangga',
    district TEXT,
    address TEXT,
    rt_rw TEXT,
    postal_code TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Pendaftaran Diterima',
    current_status_id TEXT,
    initial_payment_status TEXT DEFAULT 'pending',
    initial_payment_amount NUMERIC(12,2),
    non_regular_payment_status TEXT DEFAULT 'pending',
    non_regular_payment_amount NUMERIC(12,2),
    assigned_sales_id TEXT,
    assigned_sales_name TEXT,
    survey_result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL GANGGUAN & PERBAIKAN (REPAIR ORDERS)
CREATE TABLE IF NOT EXISTS public.repair_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT UNIQUE NOT NULL,
    customer_number TEXT,
    customer_name TEXT,
    phone_number TEXT,
    location_address TEXT,
    repair_category TEXT,
    title TEXT,
    issue_description TEXT,
    priority TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'Tiket Dibuat',
    current_status_id TEXT,
    assigned_technician TEXT,
    assigned_division TEXT DEFAULT 'Minor Repair',
    sla_hours INT DEFAULT 24,
    sla_deadline TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL AUDIT LOG AKTIVITAS
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name TEXT,
    user_role TEXT,
    action TEXT,
    module TEXT,
    detail TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AKTIFKAN FITUR REALTIME SUPABASE UNTUK SETIAP TABEL
ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.repair_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;

-- Nonaktifkan RLS untuk kemudahan integrasi awal
ALTER TABLE public.registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
`;
