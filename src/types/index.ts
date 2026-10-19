export type ModuleKey =
  | 'dashboard'
  | 'pendaftaran'
  | 'repair'
  | 'forms'
  | 'pengguna'
  | 'workflow'
  | 'pengaturan'
  | 'log_aktivitas';

export interface ModulePermission {
  view: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  export?: boolean;
}

export interface Role {
  id: string;
  name: string;
  division: string;
  description: string;
  is_admin?: boolean;
  permissions: Record<ModuleKey, ModulePermission>;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  full_name?: string;
  role_id: string;
  role_name: string;
  division: string;
  department?: string;
  phone_number?: string;
  avatar_url?: string;
  is_active?: boolean;
  created_at: string;
}

export interface AppSettings {
  id: string;
  app_name: string;
  company_name: string;
  tagline: string;
  logo_url: string;
  favicon_url: string;
  accent_color: string;
  login_title: string;
  login_subtitle: string;
  login_badge: string;
  login_hero_image: string;
  support_email: string;
  support_phone: string;
  updated_at: string;
}

export interface DocumentAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: string;
  verified: boolean;
  notes?: string;
}

export interface Registration {
  id: string;
  ticket_number: string;
  registration_no?: string;
  customer_number?: string;
  customer_name: string;
  identity_number?: string;
  identity_no?: string;
  phone_number?: string;
  phone?: string;
  email?: string;
  service_type: string;
  package_plan?: string;
  district?: string;
  address: string;
  installation_address?: string;
  rt_rw?: string;
  postal_code?: string;
  sales_code?: string;
  assigned_sales_id?: string;
  assigned_sales_name?: string;
  status: string;
  current_status_id?: string;
  initial_payment_status: 'pending' | 'paid' | 'waived';
  initial_payment_amount: number;
  non_regular_payment_status: 'pending' | 'paid' | 'waived';
  non_regular_payment_amount: number;
  notes?: string;
  created_by?: string;
  documents?: DocumentAttachment[];
  created_at: string;
  updated_at?: string;
}

export interface RepairOrder {
  id: string;
  ticket_number: string;
  customer_number: string;
  customer_name: string;
  phone_number: string;
  location_address: string;
  repair_category: string;
  title: string;
  issue_description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Emergency';
  status: string;
  current_status_id?: string;
  assigned_technician?: string;
  assigned_division: string;
  sla_hours: number;
  sla_deadline?: string;
  resolved_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface WorkflowStage {
  id: string;
  order: number;
  name: string;
  color: string;
  division_assigned: string;
  sla_hours: number;
  is_initial?: boolean;
  is_final?: boolean;
}

export interface ActivityLog {
  id: string;
  user_name: string;
  user_role: string;
  action: string;
  module: string;
  detail: string;
  created_at: string;
}
