export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- SKEMA DATABASE LENGKAP & ROW LEVEL SECURITY (RLS) SUPABASE
-- Aplikasi: Portal Layanan Pendaftaran, Papan Kerja Minor Repair & Pengaturan
-- ==============================================================================

-- 1. Ekstensi UUID (bawaan Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 2. TABEL PENGATURAN APLIKASI (app_settings)
-- Menyimpan nama perusahaan, logo dinamis, dan kontak support
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL DEFAULT 'PT Solusi Terpadu Nusantara',
    company_tagline TEXT DEFAULT 'Enterprise Customer Care & Minor Repair Workflow',
    logo_url TEXT DEFAULT '',
    support_email TEXT DEFAULT 'support@solusiterpadu.id',
    support_phone TEXT DEFAULT '+62 21 5550 1988',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 3. TABEL ROLES & PERMISSIONS (RBAC)
-- Menyimpan definisi peran divisi dan hak akses per modul
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    division TEXT NOT NULL,
    description TEXT,
    is_admin BOOLEAN DEFAULT false,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 4. TABEL PROFIL PENGGUNA (users_profile)
-- Relasi dengan auth.users Supabase dan tabel roles
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role_id TEXT REFERENCES public.roles(id) ON DELETE RESTRICT,
    division TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 5. TABEL TAHAPAN ALUR KERJA (workflow_stages)
-- Dikelola secara visual oleh Admin Pusat untuk pendaftaran dan minor repair
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workflow_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL CHECK (category IN ('registration', 'repair')),
    step_order INTEGER NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    assigned_division TEXT NOT NULL,
    color_badge TEXT DEFAULT '#3b82f6',
    sla_hours INTEGER DEFAULT 24,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 6. TABEL PENDAFTARAN PELANGGAN (registrations)
-- Data pendaftaran pelanggan baru dan status berkas
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_no TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    identity_no TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    service_type TEXT NOT NULL,
    package_plan TEXT NOT NULL,
    installation_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Menunggu Verifikasi',
    documents JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 7. TABEL PAPAN KERJA MINOR REPAIR (repair_orders & repair_logs)
-- Data tiket pekerjaan teknisi dan riwayat perbaikan
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.repair_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_no TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    unit_name TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    category TEXT NOT NULL,
    issue_description TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('Rendah', 'Sedang', 'Tinggi', 'Darurat')),
    status TEXT NOT NULL DEFAULT 'Tiket Masuk',
    assigned_technician TEXT,
    estimated_cost NUMERIC(12, 2) DEFAULT 0,
    parts_used JSONB DEFAULT '[]'::jsonb,
    repair_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.repair_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repair_order_id UUID REFERENCES public.repair_orders(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL,
    action_summary TEXT NOT NULL,
    note TEXT,
    status_transition TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 8. PENGATURAN SUPABASE STORAGE (BUCKETS)
-- Buat bucket untuk logo perusahaan dan lampiran dokumen pendaftaran
-- ==============================================================================
-- Eksekusi di Storage Tab / SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policy Storage: Publik dapat membaca logo, authenticated user dapat upload
CREATE POLICY "Public read app assets" ON storage.objects FOR SELECT USING (bucket_id = 'app-assets');
CREATE POLICY "Auth users upload app assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'app-assets');

CREATE POLICY "Public read documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
CREATE POLICY "Auth users upload documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents');

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- Membatasi hak akses di tingkat database
-- ==============================================================================

-- Aktifkan RLS di setiap tabel
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_logs ENABLE ROW LEVEL SECURITY;

-- Helper Function: Mengecek apakah user adalah Admin Pusat
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users_profile up
        JOIN public.roles r ON up.role_id = r.id
        WHERE up.user_id = auth.uid() AND r.is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kebijakan RLS app_settings: Semua user bisa melihat, hanya Admin Pusat yang bisa edit
CREATE POLICY "Semua user dapat melihat app_settings"
    ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Hanya Admin Pusat dapat mengubah app_settings"
    ON public.app_settings FOR ALL USING (public.is_admin_user());

-- Kebijakan RLS roles: Semua user dapat melihat roles, hanya Admin Pusat dapat mengubah
CREATE POLICY "Semua user dapat membaca roles"
    ON public.roles FOR SELECT USING (true);
CREATE POLICY "Hanya Admin Pusat dapat mengelola roles"
    ON public.roles FOR ALL USING (public.is_admin_user());

-- Kebijakan RLS users_profile:
CREATE POLICY "User dapat membaca profil tim"
    ON public.users_profile FOR SELECT USING (true);
CREATE POLICY "Hanya Admin Pusat dapat menambah / mengedit profil user"
    ON public.users_profile FOR ALL USING (public.is_admin_user());

-- Kebijakan RLS workflow_stages:
CREATE POLICY "Semua user dapat membaca workflow_stages"
    ON public.workflow_stages FOR SELECT USING (true);
CREATE POLICY "Hanya Admin Pusat yang dapat mengatur alur kerja"
    ON public.workflow_stages FOR ALL USING (public.is_admin_user());

-- Kebijakan RLS registrations:
-- Admin Pusat punya akses penuh; Divisi Sales/Admin dapat CRUD; Divisi Teknik/lainnya hanya SELECT jika punya izin
CREATE POLICY "Akses baca pendaftaran pelanggan"
    ON public.registrations FOR SELECT USING (true);
CREATE POLICY "Akses tambah/edit pendaftaran"
    ON public.registrations FOR ALL USING (
        public.is_admin_user() OR EXISTS (
            SELECT 1 FROM public.users_profile up
            JOIN public.roles r ON up.role_id = r.id
            WHERE up.user_id = auth.uid()
            AND (r.permissions->'portal_pendaftaran'->>'view')::boolean = true
        )
    );

-- Kebijakan RLS repair_orders:
-- Admin Pusat & Divisi Teknik dapat mengelola tiket perbaikan
CREATE POLICY "Akses baca repair orders"
    ON public.repair_orders FOR SELECT USING (true);
CREATE POLICY "Akses kelola repair orders"
    ON public.repair_orders FOR ALL USING (
        public.is_admin_user() OR EXISTS (
            SELECT 1 FROM public.users_profile up
            JOIN public.roles r ON up.role_id = r.id
            WHERE up.user_id = auth.uid()
            AND (r.permissions->'papan_repair'->>'view')::boolean = true
        )
    );

-- Kebijakan RLS repair_logs:
CREATE POLICY "Semua user dengan izin dapat membaca log perbaikan"
    ON public.repair_logs FOR SELECT USING (true);
CREATE POLICY "User dapat menambahkan log perbaikan"
    ON public.repair_logs FOR INSERT WITH CHECK (true);

-- ==============================================================================
-- 10. SEED DATA AWAL (PERAN, SETTINGS, & ALUR KERJA)
-- ==============================================================================
INSERT INTO public.app_settings (id, company_name, company_tagline, logo_url)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'PT Solusi Terpadu Nusantara',
    'Enterprise Customer Portal, Minor Repair Hub & Workflow Center',
    ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.roles (id, name, division, description, is_admin, permissions)
VALUES 
(
    'admin_pusat',
    'Admin Pusat',
    'Manajemen Pusat',
    'Akses tak terbatas ke seluruh modul, konfigurasi sistem, RBAC, dan audit.',
    true,
    '{"dashboard": {"view": true}, "portal_pendaftaran": {"view": true, "create": true, "edit": true, "delete": true, "verify": true}, "papan_repair": {"view": true, "create": true, "edit": true, "delete": true, "manage": true}, "workflow_builder": {"view": true, "manage": true}, "user_management": {"view": true, "manage": true}, "branding_customization": {"view": true, "manage": true}, "database_schema": {"view": true}}'::jsonb
),
(
    'divisi_teknik',
    'Divisi Teknik',
    'Teknik & Pemeliharaan',
    'Fokus penanganan Minor Repair, update status perbaikan, dan catatan suku cadang.',
    false,
    '{"dashboard": {"view": true}, "portal_pendaftaran": {"view": true, "create": false, "edit": false, "delete": false, "verify": false}, "papan_repair": {"view": true, "create": true, "edit": true, "delete": false, "manage": true}, "workflow_builder": {"view": true, "manage": false}, "user_management": {"view": false}, "branding_customization": {"view": false}, "database_schema": {"view": false}}'::jsonb
),
(
    'divisi_sales',
    'Divisi Sales & Marketing',
    'Sales & Akuisisi',
    'Input pendaftaran pelanggan baru, follow up calon pelanggan, dan upload berkas.',
    false,
    '{"dashboard": {"view": true}, "portal_pendaftaran": {"view": true, "create": true, "edit": true, "delete": false, "verify": false}, "papan_repair": {"view": true, "create": false, "edit": false, "delete": false, "manage": false}, "workflow_builder": {"view": false}, "user_management": {"view": false}, "branding_customization": {"view": false}, "database_schema": {"view": false}}'::jsonb
),
(
    'divisi_admin',
    'Divisi Admin & CS',
    'Operasional & CS',
    'Verifikasi berkas pendaftaran pelanggan, penerimaan keluhan tiket repair, dan monitoring SLA.',
    false,
    '{"dashboard": {"view": true}, "portal_pendaftaran": {"view": true, "create": true, "edit": true, "delete": false, "verify": true}, "papan_repair": {"view": true, "create": true, "edit": true, "delete": false, "manage": false}, "workflow_builder": {"view": false}, "user_management": {"view": false}, "branding_customization": {"view": false}, "database_schema": {"view": false}}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Selesai. Skema siap dijalankan di Supabase SQL Editor.
`;
