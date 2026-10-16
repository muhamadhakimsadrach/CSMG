import { COMPANY, REPAIR_CATEGORIES, SERVICE_DISTRICTS, SERVICE_TYPES } from "./waterDomain";

export const MODULES = [
  { key: "pendaftaran", label: "Pendaftaran Sambungan Air", short: "Pendaftaran" },
  { key: "repair", label: "Gangguan & Perbaikan Air", short: "Perbaikan" },
  { key: "forms", label: "Manajemen Form Kustom", short: "Formulir" },
  { key: "pengguna", label: "Manajemen Pengguna", short: "Pengguna" },
  { key: "workflow", label: "Alur Layanan Air", short: "Alur Kerja" },
  { key: "pengaturan", label: "Pengaturan Aplikasi", short: "Pengaturan" },
  { key: "log_aktivitas", label: "Log Aktivitas", short: "Log Aktivitas" },
];

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const DEMO_ACCOUNTS = [
  { label: "Admin Aetra", email: "admin@aetra.demo", password: "Admin123!", role: "Akses penuh, kustomisasi form, logo, user & hak akses" },
  { label: "Customer Service (CS)", email: "cs@aetra.demo", password: "CS123!", role: "Terima pendaftaran & complain, terbit ID & ID Non-Reguler" },
  { label: "SPV Sales", email: "spv.sales@aetra.demo", password: "SpvSales123!", role: "Menerima tugas dari CS & delegasi ke Sales" },
  { label: "SPV Technical", email: "spv.technical@aetra.demo", password: "SpvTech123!", role: "Menerima complain dari CS & delegasi ke NC / Minor Repair" },
  { label: "Sales", email: "sales@aetra.demo", password: "Sales123!", role: "Survey lokasi & form pendaftaran" },
  { label: "NC (New Connection)", email: "nc@aetra.demo", password: "Nc123!", role: "Cek pipa reguler/non-reguler & pasang meter" },
  { label: "Minor Repair", email: "repair@aetra.demo", password: "Repair123!", role: "Perbaikan pipa & pelaporan material" },
  { label: "Pelanggan", email: "pelanggan@aetra.demo", password: "Pelanggan123!", role: "Mengajukan sambungan baru, complain & tracking progres" },
];

export function seedAuthUsers() {
  return DEMO_ACCOUNTS.map((account, index) => ({ id: id(1001 + index), email: account.email, password: account.password }));
}

export function seedRows() {
  const roles = [
    { id: id(1), role_name: "Admin Aetra", description: "Manajemen Pusat & Pengaturan", created_at: new Date().toISOString() },
    { id: id(2), role_name: "Customer Service", description: "Pintu Masuk Pendaftaran & Complain", created_at: new Date().toISOString() },
    { id: id(3), role_name: "SPV Sales", description: "Supervisor Divisi Sales", created_at: new Date().toISOString() },
    { id: id(4), role_name: "SPV Technical", description: "Supervisor Divisi Teknik", created_at: new Date().toISOString() },
    { id: id(5), role_name: "Sales", description: "Petugas Survey & Pendaftaran", created_at: new Date().toISOString() },
    { id: id(6), role_name: "NC (New Connection)", description: "Tim Instalasi Sambungan Baru", created_at: new Date().toISOString() },
    { id: id(7), role_name: "Minor Repair", description: "Tim Perbaikan & Material", created_at: new Date().toISOString() },
    { id: id(8), role_name: "Pelanggan", description: "Portal Pemohon & Pengadu", created_at: new Date().toISOString() },
  ];

  const profiles = [
    { id: id(1001), email: "admin@aetra.demo", full_name: "Rani Prameswari", role_id: id(1), department: "Manajemen Pusat & Pengaturan", phone_number: "081200001001", is_active: true, created_at: new Date().toISOString() },
    { id: id(1002), email: "cs@aetra.demo", full_name: "Intan Permatasari", role_id: id(2), department: "Pintu Masuk Pendaftaran & Complain", phone_number: "081200001002", is_active: true, created_at: new Date().toISOString() },
    { id: id(1003), email: "spv.sales@aetra.demo", full_name: "Bagas Adhi Nugroho", role_id: id(3), department: "Supervisor Divisi Sales", phone_number: "081200001003", is_active: true, created_at: new Date().toISOString() },
    { id: id(1004), email: "spv.technical@aetra.demo", full_name: "Fikri Maulana", role_id: id(4), department: "Supervisor Divisi Teknik", phone_number: "081200001004", is_active: true, created_at: new Date().toISOString() },
    { id: id(1005), email: "sales@aetra.demo", full_name: "Sarah Wijaya", role_id: id(5), department: "Petugas Survey & Pendaftaran", phone_number: "081200001005", is_active: true, created_at: new Date().toISOString() },
    { id: id(1006), email: "nc@aetra.demo", full_name: "Joko Susilo", role_id: id(6), department: "Tim Instalasi Sambungan Baru", phone_number: "081200001006", is_active: true, created_at: new Date().toISOString() },
    { id: id(1007), email: "repair@aetra.demo", full_name: "Dedi Kurniawan", role_id: id(7), department: "Tim Perbaikan & Material", phone_number: "081200001007", is_active: true, created_at: new Date().toISOString() },
    { id: id(1008), email: "pelanggan@aetra.demo", full_name: "Warga Pengguna", role_id: id(8), department: "Portal Pemohon & Pengadu", phone_number: "081200001008", is_active: true, created_at: new Date().toISOString() },
  ];

  const permissions = [];
  const app_settings = [{
    id: id(2001), app_name: COMPANY.appName, tagline: COMPANY.tagline, logo_url: null, favicon_url: null,
    accent_color: COMPANY.accent, support_email: "", support_phone: COMPANY.contactPhone, updated_by: profiles[0].id, updated_at: new Date().toISOString(),
  }];

  const status = (n, type, order, name, color, allowed, initial = false, final = false) => ({
    id: id(n), workflow_type: type, step_order: order, status_name: name, color_code: color,
    allowed_role_ids: allowed.map(id), is_initial: initial, is_final: final, created_at: new Date().toISOString(),
  });

  const registrationStatuses = [
    status(10, "REGISTRATION", 1, "Pendaftaran diterima", "#E5A63E", [1, 2, 8], true),
    status(11, "REGISTRATION", 2, "Diteruskan ke SPV Sales", "#7E8CE0", [1, 2, 3]),
    status(12, "REGISTRATION", 3, "Survei jaringan", "#39A2DB", [1, 3, 5]),
    status(13, "REGISTRATION", 4, "Menunggu pembayaran", "#E3AA5B", [1, 2, 8]),
    status(16, "REGISTRATION", 5, "Pemasangan meter", "#13A6A4", [1, 2, 6]),
    status(14, "REGISTRATION", 6, "Sambungan aktif", "#21A685", [1, 2, 6], false, true),
    status(15, "REGISTRATION", 7, "Tidak dapat dilayani", "#E6767A", [1, 2, 3], false, true),
  ];

  const repairStatuses = [
    status(20, "REPAIR", 1, "Laporan masuk", "#E5A63E", [1, 2, 8], true),
    status(21, "REPAIR", 2, "Penugasan teknisi", "#7E8CE0", [1, 4]),
    status(22, "REPAIR", 3, "Dalam perbaikan", "#39A2DB", [1, 4, 7]),
    status(23, "REPAIR", 4, "Verifikasi aliran air", "#13A6A4", [1, 4, 7]),
    status(24, "REPAIR", 5, "Selesai", "#21A685", [1, 4, 7], false, true),
  ];

  const workflow_statuses = [...registrationStatuses, ...repairStatuses];
  const registrations = [];
  const repair_orders = [];
  const status_history = [];
  const activity_logs = [];

  return { roles, permissions, profiles, app_settings, workflow_statuses, registrations, repair_orders, status_history, activity_logs, __files: {} };
}