export type ModuleKey =
  | 'dashboard'
  | 'portal_pendaftaran'
  | 'papan_repair'
  | 'workflow_builder'
  | 'user_management'
  | 'branding_customization'
  | 'database_schema';

export interface ModulePermission {
  view: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  manage?: boolean;
  verify?: boolean;
}

export interface Role {
  id: string;
  name: string;
  division: string;
  description: string;
  is_admin: boolean;
  permissions: Record<ModuleKey, ModulePermission>;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role_id: string;
  role_name: string;
  division: string;
  avatar_url?: string;
  created_at: string;
}

export interface AppSettings {
  id: string;
  company_name: string;
  company_tagline: string;
  logo_url: string;
  support_email: string;
  support_phone: string;
  updated_at: string;
}

export interface WorkflowStage {
  id: string;
  category: 'registration' | 'repair';
  order: number;
  name: string;
  slug: string;
  description: string;
  assigned_division: string;
  color_badge: string; // hex or tailwind class
  sla_hours?: number;
}

export interface DocumentAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size?: string;
  verified: boolean;
  notes?: string;
}

export interface Registration {
  id: string;
  registration_no: string;
  customer_name: string;
  identity_no: string; // KTP / SIM
  email: string;
  phone: string;
  service_type: 'Internet Broadband' | 'Instalasi Jaringan' | 'Pemeliharaan IT' | 'Lisensi Sistem';
  package_plan: string;
  installation_address: string;
  status: string; // e.g. 'Menunggu Verifikasi', 'Verifikasi Berkas', 'Disetujui', 'Instalasi Dijadwalkan', 'Selesai'
  documents: DocumentAttachment[];
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RepairLog {
  id: string;
  timestamp: string;
  author_name: string;
  author_role: string;
  action_summary: string;
  note: string;
  status_transition?: string;
}

export interface RepairOrder {
  id: string;
  ticket_no: string;
  customer_name: string;
  contact_phone: string;
  unit_name: string;
  serial_number: string;
  category: 'Hardware' | 'Kabel & Port' | 'Modem / Router' | 'Power Supply' | 'Lainnya';
  issue_description: string;
  priority: 'Rendah' | 'Sedang' | 'Tinggi' | 'Darurat';
  status: string; // e.g. 'Tiket Masuk', 'Inspeksi & Diagnosa', 'Menunggu Suku Cadang', 'Sedang Dikerjakan', 'Pengujian QC', 'Selesai'
  registration_no?: string;
  installation_address?: string;
  assigned_technician?: string;
  estimated_cost?: number;
  parts_used?: string[];
  repair_notes?: string;
  created_at: string;
  updated_at: string;
  logs: RepairLog[];
}
