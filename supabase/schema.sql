-- ============================================================================
-- AETRA TANGERANG - PORTAL LAYANAN AIR
-- Skema database Supabase (PostgreSQL) LENGKAP & EXECUTION READY
-- Cara pakai: Supabase Dashboard -> SQL Editor -> New query -> tempel -> RUN
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ROLES & GRANULAR PERMISSIONS
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    module_name VARCHAR(50) NOT NULL,
    can_create BOOLEAN DEFAULT FALSE,
    can_read BOOLEAN DEFAULT FALSE,
    can_update BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    UNIQUE(role_id, module_name)
);

-- 3. PROFILES (terhubung 1-1 dengan auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    avatar_url TEXT,
    phone_number VARCHAR(20),
    department VARCHAR(80),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SYSTEM APP SETTINGS (BRANDING)
CREATE TABLE public.app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_name VARCHAR(100) DEFAULT 'Aetra Tangerang',
    tagline TEXT,
    logo_url TEXT,
    favicon_url TEXT,
    accent_color VARCHAR(9) DEFAULT '#0077BD',
    support_email VARCHAR(120),
    support_phone VARCHAR(40),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id IS NOT NULL)
);

-- 5. WORKFLOW STATUSES (VISUAL BUILDER)
CREATE TABLE public.workflow_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_type VARCHAR(30) NOT NULL CHECK (workflow_type IN ('REGISTRATION','REPAIR')),
    step_order INT NOT NULL,
    status_name VARCHAR(50) NOT NULL,
    color_code VARCHAR(10) DEFAULT '#64748B',
    allowed_role_ids UUID[] DEFAULT '{}',
    is_initial BOOLEAN DEFAULT FALSE,
    is_final BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (workflow_type, step_order)
);

-- 6. REGISTRATIONS (MODUL A)
CREATE TABLE public.registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(30) UNIQUE NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    identity_number VARCHAR(30) NOT NULL,          -- NIK 16 digit
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    service_type VARCHAR(60),
    property_ownership VARCHAR(40),
    building_area NUMERIC(10,2),
    occupants INTEGER,
    meter_diameter VARCHAR(40),
    customer_number VARCHAR(40),
    consent_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    attachment_labels TEXT[] DEFAULT '{}',
    province VARCHAR(60),
    city VARCHAR(60),
    district VARCHAR(60),
    village VARCHAR(60),
    address TEXT NOT NULL,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    attachment_urls TEXT[] DEFAULT '{}',
    current_status_id UUID REFERENCES public.workflow_statuses(id) ON DELETE SET NULL,
    verification_note TEXT,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. REPAIR ORDERS (MODUL B)
CREATE TABLE public.repair_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(30) UNIQUE NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High','Urgent')),
    sla_hours INT DEFAULT 48,
    customer_number VARCHAR(40),
    location_address TEXT,
    service_category VARCHAR(60),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_division VARCHAR(80),
    current_status_id UUID REFERENCES public.workflow_statuses(id) ON DELETE SET NULL,
    proof_image_url TEXT,
    technician_notes TEXT,
    materials_used JSONB DEFAULT '[]'::jsonb,
    due_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. STATUS HISTORY (mesin Visual Timeline Pendaftaran & Repair)
CREATE TABLE public.status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('registration','repair')),
    entity_id UUID NOT NULL,
    from_status_id UUID REFERENCES public.workflow_statuses(id) ON DELETE SET NULL,
    to_status_id UUID REFERENCES public.workflow_statuses(id) ON DELETE SET NULL,
    note TEXT,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ACTIVITY LOGS (AUDIT)
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(80) NOT NULL,
    entity_name VARCHAR(50) NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. INDEX PERFORMA
CREATE INDEX idx_reg_status ON public.registrations (current_status_id);
CREATE INDEX idx_reg_created ON public.registrations (created_at DESC);
CREATE INDEX idx_reg_ticket ON public.registrations (ticket_number);
CREATE INDEX idx_rep_status ON public.repair_orders (current_status_id);
CREATE INDEX idx_rep_priority ON public.repair_orders (priority);
CREATE INDEX idx_rep_assigned ON public.repair_orders (assigned_to);
CREATE INDEX idx_rep_created ON public.repair_orders (created_at DESC);
CREATE INDEX idx_history_entity ON public.status_history (entity_type, entity_id, created_at);
CREATE INDEX idx_logs_created ON public.activity_logs (created_at DESC);
CREATE INDEX idx_perm_role ON public.permissions (role_id, module_name);

-- 11. FUNCTIONS PEMBANTU KEAMANAN
CREATE OR REPLACE FUNCTION public.is_admin_pusat()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.role_name = 'Admin Pusat' AND p.is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Matriks izin per modul: 'pendaftaran' | 'repair' | 'pengguna' |
-- 'workflow' | 'pengaturan' | 'log_aktivitas'  ;  aksi: create|read|update|delete
CREATE OR REPLACE FUNCTION public.has_module_permission(p_module TEXT, p_action TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  ok BOOLEAN;
BEGIN
  IF public.is_admin_pusat() THEN RETURN TRUE; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.permissions px
    JOIN public.profiles pr ON pr.role_id = px.role_id
    WHERE pr.id = auth.uid()
      AND pr.is_active = TRUE
      AND px.module_name = p_module
      AND CASE
            WHEN p_action = 'create' THEN px.can_create
            WHEN p_action = 'read'   THEN px.can_read
            WHEN p_action = 'update' THEN px.can_update
            WHEN p_action = 'delete' THEN px.can_delete
            ELSE FALSE
          END
  ) INTO ok;
  RETURN COALESCE(ok, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Pencetak nomor tiket otomatis: REG-YYYYMMDD-XXXX / RPR-YYYYMMDD-XXXX
CREATE OR REPLACE FUNCTION public.next_ticket_number(p_prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  stamp TEXT := to_char(NOW(), 'YYYYMMDD');
  seq   INT;
  tbl   TEXT;
BEGIN
  tbl := CASE WHEN p_prefix = 'REG' THEN 'registrations' ELSE 'repair_orders' END;
  EXECUTE format(
    'SELECT COUNT(*) + 1 FROM public.%I WHERE ticket_number LIKE $1', tbl
  ) INTO seq USING p_prefix || '-' || stamp || '-%';
  RETURN p_prefix || '-' || stamp || '-' || lpad(seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. TRIGGER
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_touch        BEFORE UPDATE ON public.profiles        FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_registrations_touch   BEFORE UPDATE ON public.registrations   FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_repairs_touch         BEFORE UPDATE ON public.repair_orders   FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_settings_touch        BEFORE UPDATE ON public.app_settings    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Profil otomatis saat akun Auth dibuat
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone_number, role_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone_number',
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Pencatatan audit log otomatis untuk dua tabel operasional
CREATE OR REPLACE FUNCTION public.log_entity_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (user_id, action, entity_name, entity_id, details)
    VALUES (auth.uid(), 'Membuat ' || TG_TABLE_NAME, TG_TABLE_NAME, NEW.id, to_jsonb(NEW) - 'attachment_urls');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_logs (user_id, action, entity_name, entity_id, details)
    VALUES (auth.uid(), 'Memperbarui ' || TG_TABLE_NAME, TG_TABLE_NAME, NEW.id, to_jsonb(NEW) - 'attachment_urls');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_logs (user_id, action, entity_name, entity_id, details)
    VALUES (auth.uid(), 'Menghapus ' || TG_TABLE_NAME, TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_registrations AFTER INSERT OR UPDATE OR DELETE ON public.registrations FOR EACH ROW EXECUTE FUNCTION public.log_entity_change();
CREATE TRIGGER trg_audit_repairs       AFTER INSERT OR UPDATE OR DELETE ON public.repair_orders FOR EACH ROW EXECUTE FUNCTION public.log_entity_change();

-- 13. SUPABASE STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('app-assets', 'app-assets', TRUE, 2097152, ARRAY['image/png','image/jpeg','image/svg+xml','image/webp'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('attachments', 'attachments', FALSE, 5242880, ARRAY['image/png','image/jpeg','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Aset publik dapat dibaca siapa pun" ON storage.objects
  FOR SELECT USING (bucket_id = 'app-assets');

CREATE POLICY "Admin pusat mengelola aset aplikasi" ON storage.objects
  FOR ALL USING (bucket_id = 'app-assets' AND public.is_admin_pusat())
  WITH CHECK (bucket_id = 'app-assets' AND public.is_admin_pusat());

CREATE POLICY "Pengguna terautentikasi membaca lampiran" ON storage.objects
  FOR SELECT USING (bucket_id = 'attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Pengguna terautentikasi mengunggah lampiran" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Pemilik lampiran dapat menghapusnya" ON storage.objects
  FOR DELETE USING (bucket_id = 'attachments' AND (public.is_admin_pusat() OR (auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::TEXT)));

-- 14. ROW LEVEL SECURITY
ALTER TABLE public.roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs    ENABLE ROW LEVEL SECURITY;

-- Roles
CREATE POLICY "roles_read_all" ON public.roles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "roles_admin_all" ON public.roles FOR ALL USING (public.is_admin_pusat()) WITH CHECK (public.is_admin_pusat());

-- Permissions
CREATE POLICY "perm_read_all" ON public.permissions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "perm_admin_all" ON public.permissions FOR ALL USING (public.is_admin_pusat()) WITH CHECK (public.is_admin_pusat());

-- Profiles
CREATE POLICY "Allow read access to authenticated users" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admin full access profiles" ON public.profiles FOR ALL USING (public.is_admin_pusat()) WITH CHECK (public.is_admin_pusat());

-- App settings: semua boleh membaca branding, hanya admin yang menulis
CREATE POLICY "settings_read_all" ON public.app_settings FOR SELECT USING (auth.role() = 'authenticated' OR auth.uid() IS NULL);
CREATE POLICY "settings_admin_all" ON public.app_settings FOR ALL USING (public.is_admin_pusat()) WITH CHECK (public.is_admin_pusat());

-- Workflow statuses: baca untuk semua user login, tulis via izin modul 'workflow'
CREATE POLICY "wf_read_all" ON public.workflow_statuses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "wf_write_perm" ON public.workflow_statuses FOR INSERT
  WITH CHECK (public.has_module_permission('workflow','create'));
CREATE POLICY "wf_update_perm" ON public.workflow_statuses FOR UPDATE
  USING (public.has_module_permission('workflow','update')) WITH CHECK (public.has_module_permission('workflow','update'));
CREATE POLICY "wf_delete_perm" ON public.workflow_statuses FOR DELETE
  USING (public.has_module_permission('workflow','delete'));

-- Registrations
CREATE POLICY "reg_read_perm" ON public.registrations FOR SELECT USING (public.has_module_permission('pendaftaran','read'));
CREATE POLICY "reg_create_perm" ON public.registrations FOR INSERT WITH CHECK (public.has_module_permission('pendaftaran','create'));
CREATE POLICY "reg_update_perm" ON public.registrations FOR UPDATE
  USING (public.has_module_permission('pendaftaran','update')) WITH CHECK (public.has_module_permission('pendaftaran','update'));
CREATE POLICY "reg_delete_perm" ON public.registrations FOR DELETE USING (public.has_module_permission('pendaftaran','delete'));
CREATE POLICY "Admin full access registrations" ON public.registrations FOR ALL USING (public.is_admin_pusat()) WITH CHECK (public.is_admin_pusat());

-- Repair orders
CREATE POLICY "rep_read_perm" ON public.repair_orders FOR SELECT USING (public.has_module_permission('repair','read'));
CREATE POLICY "rep_create_perm" ON public.repair_orders FOR INSERT WITH CHECK (public.has_module_permission('repair','create'));
CREATE POLICY "rep_update_perm" ON public.repair_orders FOR UPDATE
  USING (public.has_module_permission('repair','update')) WITH CHECK (public.has_module_permission('repair','update'));
CREATE POLICY "rep_delete_perm" ON public.repair_orders FOR DELETE USING (public.has_module_permission('repair','delete'));
CREATE POLICY "Admin full access repairs" ON public.repair_orders FOR ALL USING (public.is_admin_pusat()) WITH CHECK (public.is_admin_pusat());

-- Status history
CREATE POLICY "history_read" ON public.status_history FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "history_insert" ON public.status_history FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "history_admin" ON public.status_history FOR ALL USING (public.is_admin_pusat()) WITH CHECK (public.is_admin_pusat());

-- Activity logs (hanya baca sesuai izin, hanya sistem/admin yang menulis)
CREATE POLICY "logs_read" ON public.activity_logs FOR SELECT USING (public.has_module_permission('log_aktivitas','read'));
CREATE POLICY "logs_admin" ON public.activity_logs FOR ALL USING (public.is_admin_pusat()) WITH CHECK (public.is_admin_pusat());

-- 15. SEED DATA AWAL
INSERT INTO public.roles (id, role_name, description) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Admin Pusat', 'Akses absolut seluruh modul'),
  ('11111111-1111-4111-8111-111111111112', 'Divisi Sales', 'Penerimaan pendaftaran pelanggan baru'),
  ('11111111-1111-4111-8111-111111111113', 'Divisi Verifikasi', 'Verifikasi dokumen & kelayakan pasang'),
  ('11111111-1111-4111-8111-111111111114', 'Divisi Teknik', 'Eksekusi minor repair & penugasan teknisi'),
  ('11111111-1111-4111-8111-111111111115', 'Divisi Customer Service', 'Tracking tiket & komunikasi pelanggan')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.permissions (role_id, module_name, can_create, can_read, can_update, can_delete) VALUES
  ('11111111-1111-4111-8111-111111111112', 'pendaftaran', TRUE,  TRUE,  TRUE,  FALSE),
  ('11111111-1111-4111-8111-111111111112', 'repair',      TRUE,  TRUE,  FALSE, FALSE),
  ('11111111-1111-4111-8111-111111111112', 'log_aktivitas',FALSE, TRUE,  FALSE, FALSE),
  ('11111111-1111-4111-8111-111111111113', 'pendaftaran', FALSE, TRUE,  TRUE,  FALSE),
  ('11111111-1111-4111-8111-111111111113', 'log_aktivitas',FALSE, TRUE,  FALSE, FALSE),
  ('11111111-1111-4111-8111-111111111114', 'repair',      TRUE,  TRUE,  TRUE,  FALSE),
  ('11111111-1111-4111-8111-111111111114', 'pendaftaran', FALSE, TRUE,  TRUE,  FALSE),
  ('11111111-1111-4111-8111-111111111115', 'pendaftaran', TRUE,  TRUE,  FALSE, FALSE),
  ('11111111-1111-4111-8111-111111111115', 'repair',      TRUE,  TRUE,  TRUE,  FALSE),
  ('11111111-1111-4111-8111-111111111115', 'log_aktivitas',FALSE, TRUE,  FALSE, FALSE)
ON CONFLICT (role_id, module_name) DO NOTHING;

INSERT INTO public.app_settings (id, app_name, tagline, accent_color, support_email, support_phone)
VALUES (
  '22222222-2222-4222-8222-222222222222',
  'Aetra Tangerang',
  'Portal Layanan Pelanggan',
  '#0077BD', '', '021 598 5474'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.workflow_statuses (workflow_type, step_order, status_name, color_code, is_initial, is_final) VALUES
  ('REGISTRATION', 1, 'Pendaftaran diterima', '#E5A63E', TRUE, FALSE),
  ('REGISTRATION', 2, 'Verifikasi dokumen', '#7E8CE0', FALSE, FALSE),
  ('REGISTRATION', 3, 'Survei jaringan', '#39A2DB', FALSE, FALSE),
  ('REGISTRATION', 4, 'Menunggu pembayaran', '#E3AA5B', FALSE, FALSE),
  ('REGISTRATION', 5, 'Pemasangan meter', '#13A6A4', FALSE, FALSE),
  ('REGISTRATION', 6, 'Sambungan aktif', '#21A685', FALSE, TRUE),
  ('REGISTRATION', 7, 'Tidak dapat dilayani', '#E6767A', FALSE, TRUE),
  ('REPAIR', 1, 'Laporan masuk', '#E5A63E', TRUE, FALSE),
  ('REPAIR', 2, 'Penugasan teknisi', '#7E8CE0', FALSE, FALSE),
  ('REPAIR', 3, 'Dalam perbaikan', '#39A2DB', FALSE, FALSE),
  ('REPAIR', 4, 'Verifikasi aliran air', '#13A6A4', FALSE, FALSE),
  ('REPAIR', 5, 'Selesai', '#21A685', FALSE, TRUE);

-- Default water-service handoffs. Custom installations use the workflow editor.
UPDATE public.workflow_statuses SET allowed_role_ids = ARRAY(
  SELECT r.id FROM public.roles r WHERE r.role_name = ANY(
    CASE
      WHEN status_name = 'Pendaftaran diterima' OR status_name = 'Laporan masuk' THEN ARRAY['Divisi Sales','Divisi Customer Service']
      WHEN status_name IN ('Verifikasi dokumen','Tidak dapat dilayani') THEN ARRAY['Divisi Verifikasi']
      WHEN status_name = 'Survei jaringan' THEN ARRAY['Divisi Verifikasi','Divisi Teknik']
      WHEN status_name = 'Menunggu pembayaran' THEN ARRAY['Divisi Verifikasi','Divisi Customer Service']
      WHEN status_name IN ('Pemasangan meter','Penugasan teknisi','Dalam perbaikan') THEN ARRAY['Divisi Teknik']
      ELSE ARRAY['Divisi Teknik','Divisi Customer Service']
    END
  )
);

-- 16. SELESAI. Setelah membuat akun melalui Supabase Auth, naikkan hak akun
-- pertama menjadi Admin Pusat dengan menjalankan:
-- UPDATE public.profiles SET role_id = '11111111-1111-4111-8111-111111111111' WHERE email = 'email-anda@domain.id';

-- Aetra water service extensions and security policies.
-- Run this migration after the original schema on existing installations.
-- Customer records and custom workflow definitions are preserved.
BEGIN;

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS property_ownership VARCHAR(40),
  ADD COLUMN IF NOT EXISTS building_area NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS occupants INTEGER,
  ADD COLUMN IF NOT EXISTS meter_diameter VARCHAR(40),
  ADD COLUMN IF NOT EXISTS customer_number VARCHAR(40),
  ADD COLUMN IF NOT EXISTS consent_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS attachment_labels TEXT[] DEFAULT '{}';

ALTER TABLE public.repair_orders ADD COLUMN IF NOT EXISTS customer_number VARCHAR(40);

UPDATE public.app_settings SET
  app_name = 'Aetra Tangerang', tagline = 'Portal Layanan Pelanggan',
  accent_color = '#0077BD', support_email = '', support_phone = '021 598 5474'
WHERE app_name IN ('SIGAP Layanan Terpadu', 'Portal Layanan Terpadu');

-- Upgrade only the unmodified, six-step default registration workflow.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.workflow_statuses WHERE workflow_type = 'REGISTRATION') = 6
     AND EXISTS (SELECT 1 FROM public.workflow_statuses WHERE workflow_type = 'REGISTRATION' AND status_name = 'Menunggu Verifikasi') THEN
    UPDATE public.workflow_statuses SET step_order = -step_order WHERE workflow_type = 'REGISTRATION';
    UPDATE public.workflow_statuses SET
      status_name = CASE step_order
        WHEN -1 THEN 'Pendaftaran diterima' WHEN -2 THEN 'Verifikasi dokumen'
        WHEN -3 THEN 'Survei jaringan' WHEN -4 THEN 'Menunggu pembayaran'
        WHEN -5 THEN 'Sambungan aktif' WHEN -6 THEN 'Tidak dapat dilayani' END,
      step_order = CASE step_order WHEN -5 THEN 6 WHEN -6 THEN 7 ELSE -step_order END
    WHERE workflow_type = 'REGISTRATION';
    INSERT INTO public.workflow_statuses (workflow_type, step_order, status_name, color_code)
    VALUES ('REGISTRATION', 5, 'Pemasangan meter', '#13A6A4');
  END IF;
END;
$$;

UPDATE public.workflow_statuses SET status_name = CASE status_name
  WHEN 'Tiket Diajukan' THEN 'Laporan masuk'
  WHEN 'Ditugaskan ke Teknisi' THEN 'Penugasan teknisi'
  WHEN 'Dalam Pengerjaan' THEN 'Dalam perbaikan'
  WHEN 'Verifikasi Hasil' THEN 'Verifikasi aliran air'
  ELSE status_name END WHERE workflow_type = 'REPAIR';

UPDATE storage.buckets SET public = FALSE, file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp','application/pdf']
WHERE id = 'attachments';

CREATE OR REPLACE FUNCTION public.is_admin_pusat()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND p.is_active = TRUE AND r.role_name = 'Admin Pusat'
  );
$$;

-- Auth metadata must never be trusted to assign a privileged role.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone_number, role_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email, NEW.raw_user_meta_data->>'phone_number', NULL)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Pengguna terautentikasi membaca lampiran" ON storage.objects;
DROP POLICY IF EXISTS "Pengguna terautentikasi mengunggah lampiran" ON storage.objects;
DROP POLICY IF EXISTS "aetra_attachments_read" ON storage.objects;
DROP POLICY IF EXISTS "aetra_attachments_create" ON storage.objects;

CREATE POLICY "aetra_attachments_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'attachments' AND (
  public.is_admin_pusat()
  OR ((storage.foldername(name))[2] = 'registrations' AND public.has_module_permission('pendaftaran', 'read'))
  OR ((storage.foldername(name))[2] = 'repairs' AND public.has_module_permission('repair', 'read'))
));

CREATE POLICY "aetra_attachments_create" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::TEXT AND (
  ((storage.foldername(name))[2] = 'registrations' AND public.has_module_permission('pendaftaran', 'create'))
  OR ((storage.foldername(name))[2] = 'repairs' AND public.has_module_permission('repair', 'update'))
));

CREATE OR REPLACE FUNCTION public.validate_water_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  target public.workflow_statuses%ROWTYPE;
  current_role UUID;
  expected_type TEXT;
BEGIN
  IF NEW.current_status_id IS NOT DISTINCT FROM OLD.current_status_id THEN RETURN NEW; END IF;
  IF NEW.current_status_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO target FROM public.workflow_statuses WHERE id = NEW.current_status_id;
  expected_type := CASE WHEN TG_TABLE_NAME = 'registrations' THEN 'REGISTRATION' ELSE 'REPAIR' END;
  IF NOT FOUND OR target.workflow_type <> expected_type THEN
    RAISE EXCEPTION 'Status tujuan tidak sesuai dengan jenis layanan.';
  END IF;
  IF auth.uid() IS NOT NULL AND NOT public.is_admin_pusat() THEN
    SELECT role_id INTO current_role FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
    IF COALESCE(cardinality(target.allowed_role_ids), 0) > 0 AND NOT (current_role = ANY(target.allowed_role_ids)) THEN
      RAISE EXCEPTION 'Peran Anda tidak diizinkan memindahkan tiket ke status tersebut.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aetra_registration_status_check ON public.registrations;
CREATE TRIGGER aetra_registration_status_check BEFORE UPDATE ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.validate_water_status_transition();
DROP TRIGGER IF EXISTS aetra_repair_status_check ON public.repair_orders;
CREATE TRIGGER aetra_repair_status_check BEFORE UPDATE ON public.repair_orders
FOR EACH ROW EXECUTE FUNCTION public.validate_water_status_transition();

CREATE OR REPLACE FUNCTION public.reorder_water_workflow(p_status_ids UUID[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  selected_type TEXT;
  item UUID;
  position INTEGER := 1;
BEGIN
  IF NOT public.is_admin_pusat() THEN RAISE EXCEPTION 'Hanya Admin Pusat dapat mengurutkan alur layanan.'; END IF;
  IF cardinality(p_status_ids) IS NULL OR cardinality(p_status_ids) = 0 THEN RAISE EXCEPTION 'Daftar status kosong.'; END IF;
  SELECT workflow_type INTO selected_type FROM public.workflow_statuses WHERE id = p_status_ids[1];
  IF selected_type IS NULL OR (SELECT COUNT(*) FROM public.workflow_statuses WHERE workflow_type = selected_type) <> cardinality(p_status_ids)
     OR (SELECT COUNT(DISTINCT status_id) FROM unnest(p_status_ids) status_id) <> cardinality(p_status_ids)
     OR EXISTS (SELECT 1 FROM unnest(p_status_ids) status_id LEFT JOIN public.workflow_statuses s ON s.id = status_id WHERE s.id IS NULL OR s.workflow_type <> selected_type)
  THEN RAISE EXCEPTION 'Daftar status tidak lengkap atau tidak sesuai alur.'; END IF;
  UPDATE public.workflow_statuses SET step_order = -100000 - step_order WHERE workflow_type = selected_type;
  FOREACH item IN ARRAY p_status_ids LOOP
    UPDATE public.workflow_statuses SET step_order = position WHERE id = item;
    position := position + 1;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_water_workflow(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_water_workflow(UUID[]) TO authenticated;

-- Row locking prevents collisions between simultaneous customer applications.
CREATE TABLE IF NOT EXISTS public.daily_ticket_sequences (
  prefix VARCHAR(3) NOT NULL,
  ticket_date DATE NOT NULL,
  last_value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (prefix, ticket_date)
);
ALTER TABLE public.daily_ticket_sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aetra_sequences_admin" ON public.daily_ticket_sequences;
CREATE POLICY "aetra_sequences_admin" ON public.daily_ticket_sequences FOR ALL
USING (public.is_admin_pusat()) WITH CHECK (public.is_admin_pusat());

CREATE OR REPLACE FUNCTION public.next_ticket_number(p_prefix TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  day DATE := (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE;
  stamp TEXT;
  initial_value INTEGER;
  next_value INTEGER;
BEGIN
  IF p_prefix NOT IN ('REG', 'RPR') THEN RAISE EXCEPTION 'Awalan tiket tidak valid.'; END IF;
  IF auth.uid() IS NOT NULL AND NOT public.has_module_permission(
    CASE WHEN p_prefix = 'REG' THEN 'pendaftaran' ELSE 'repair' END, 'create'
  ) THEN RAISE EXCEPTION 'Anda tidak memiliki izin membuat tiket.'; END IF;
  stamp := to_char(day, 'YYYYMMDD');
  IF p_prefix = 'REG' THEN
    SELECT COALESCE(MAX(substring(ticket_number FROM '[0-9]+$')::INTEGER), 0) + 1 INTO initial_value
      FROM public.registrations WHERE ticket_number LIKE 'REG-' || stamp || '-%';
  ELSE
    SELECT COALESCE(MAX(substring(ticket_number FROM '[0-9]+$')::INTEGER), 0) + 1 INTO initial_value
      FROM public.repair_orders WHERE ticket_number LIKE 'RPR-' || stamp || '-%';
  END IF;
  INSERT INTO public.daily_ticket_sequences (prefix, ticket_date, last_value)
  VALUES (p_prefix, day, initial_value)
  ON CONFLICT (prefix, ticket_date) DO UPDATE
    SET last_value = GREATEST(public.daily_ticket_sequences.last_value + 1, EXCLUDED.last_value)
  RETURNING last_value INTO next_value;
  RETURN p_prefix || '-' || stamp || '-' || lpad(next_value::TEXT, GREATEST(4, length(next_value::TEXT)), '0');
END;
$$;
REVOKE ALL ON FUNCTION public.next_ticket_number(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_ticket_number(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_water_ticket_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.next_ticket_number(CASE WHEN TG_TABLE_NAME = 'registrations' THEN 'REG' ELSE 'RPR' END);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS aetra_assign_registration_ticket ON public.registrations;
CREATE TRIGGER aetra_assign_registration_ticket BEFORE INSERT ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.assign_water_ticket_number();
DROP TRIGGER IF EXISTS aetra_assign_repair_ticket ON public.repair_orders;
CREATE TRIGGER aetra_assign_repair_ticket BEFORE INSERT ON public.repair_orders
FOR EACH ROW EXECUTE FUNCTION public.assign_water_ticket_number();

COMMIT;