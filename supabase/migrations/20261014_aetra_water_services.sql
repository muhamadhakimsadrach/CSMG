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