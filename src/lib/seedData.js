import { COMPANY, REPAIR_CATEGORIES, SERVICE_DISTRICTS, SERVICE_TYPES } from "./waterDomain";

export const MODULES = [
  { key: "pendaftaran", label: "Pendaftaran Sambungan Air", short: "Pendaftaran" },
  { key: "repair", label: "Gangguan & Perbaikan Air", short: "Perbaikan" },
  { key: "pengguna", label: "Manajemen Pengguna", short: "Pengguna" },
  { key: "workflow", label: "Alur Layanan Air", short: "Alur Kerja" },
  { key: "pengaturan", label: "Pengaturan Aplikasi", short: "Pengaturan" },
  { key: "log_aktivitas", label: "Log Aktivitas", short: "Log Aktivitas" },
];

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const HOUR = 3_600_000;
const DAY = HOUR * 24;
const rolesInfo = [
  ["Admin Aetra", "Manajemen Pusat & Pengaturan", "Rani Prameswari"],
  ["Customer Service", "Pintu Masuk Pendaftaran & Complain", "Intan Permatasari"],
  ["SPV Sales", "Supervisor Divisi Sales", "Bagas Adhi Nugroho"],
  ["SPV Technical", "Supervisor Divisi Teknik", "Fikri Maulana"],
  ["Sales", "Petugas Survey & Pendaftaran", "Sarah Wijaya"],
  ["NC (New Connection)", "Tim Instalasi Sambungan Baru", "Joko Susilo"],
  ["Minor Repair", "Tim Perbaikan & Material", "Dedi Kurniawan"],
  ["Pelanggan", "Portal Pemohon & Pengadu", "Warga Pengguna"],
];

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

function ticketStamp(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

export function seedRows() {
  const now = Date.now();
  const at = (offset) => new Date(now + offset).toISOString();
  const roles = rolesInfo.map((role, index) => ({ id: id(index + 1), role_name: role[0], description: role[1], created_at: at(-180 * DAY) }));
  const profiles = rolesInfo.map((role, index) => ({
    id: id(1001 + index), email: DEMO_ACCOUNTS[index].email, full_name: role[2], role_id: roles[index].id,
    department: role[1], avatar_url: null, phone_number: `08120000${1001 + index}`, is_active: true,
    created_at: at(-180 * DAY), updated_at: at(-DAY),
  }));
  let seq = 900;
  const permission = (role, module, c, r, u, d = false) => ({ id: id(seq++), role_id: id(role), module_name: module, can_create: c, can_read: r, can_update: u, can_delete: d });
  const permissions = [
    permission(2, "pendaftaran", true, true, true), permission(2, "repair", true, true, false), permission(2, "log_aktivitas", false, true, false),
    permission(3, "pendaftaran", false, true, true), permission(3, "log_aktivitas", false, true, false),
    permission(4, "repair", true, true, true), permission(4, "pendaftaran", false, true, true), permission(4, "log_aktivitas", false, true, false),
    permission(5, "pendaftaran", true, true, false), permission(5, "repair", true, true, true), permission(5, "log_aktivitas", false, true, false),
  ];
  const app_settings = [{
    id: id(2001), app_name: COMPANY.appName, tagline: COMPANY.tagline, logo_url: null, favicon_url: null,
    accent_color: COMPANY.accent, support_email: "", support_phone: COMPANY.contactPhone, updated_by: profiles[0].id, updated_at: at(-DAY),
  }];
  const status = (n, type, order, name, color, allowed, initial = false, final = false) => ({
    id: id(n), workflow_type: type, step_order: order, status_name: name, color_code: color,
    allowed_role_ids: allowed.map(id), is_initial: initial, is_final: final, created_at: at(-100 * DAY),
  });
  const registrationStatuses = [
    status(10, "REGISTRATION", 1, "Pendaftaran diterima", "#E5A63E", [2, 5], true),
    status(11, "REGISTRATION", 2, "Verifikasi dokumen", "#7E8CE0", [3]),
    status(12, "REGISTRATION", 3, "Survei jaringan", "#39A2DB", [3, 4]),
    status(13, "REGISTRATION", 4, "Menunggu pembayaran", "#E3AA5B", [3, 5]),
    status(16, "REGISTRATION", 5, "Pemasangan meter", "#13A6A4", [4]),
    status(14, "REGISTRATION", 6, "Sambungan aktif", "#21A685", [4, 5], false, true),
    status(15, "REGISTRATION", 7, "Tidak dapat dilayani", "#E6767A", [3], false, true),
  ];
  const repairStatuses = [
    status(20, "REPAIR", 1, "Laporan masuk", "#E5A63E", [2, 5], true),
    status(21, "REPAIR", 2, "Penugasan teknisi", "#7E8CE0", [4]),
    status(22, "REPAIR", 3, "Dalam perbaikan", "#39A2DB", [4]),
    status(23, "REPAIR", 4, "Verifikasi aliran air", "#13A6A4", [4, 5]),
    status(24, "REPAIR", 5, "Selesai", "#21A685", [4, 5], false, true),
  ];
  const workflow_statuses = [...registrationStatuses, ...repairStatuses];
  const customerNames = ["Budi Santoso", "Siti Aminah", "Ahmad Fauzi", "PT Sumber Makmur Abadi", "Dewi Lestari", "Hendra Wijaya", "Nur Aisyah", "Rizky Pratama", "Agus Setiawan", "Wulan Puspitasari", "CV Berkah Sejahtera", "Dimas Saputra", "Rina Marlina", "Muhammad Iqbal", "Sri Wahyuni", "Yayasan Harapan Kita"];
  const villages = ["Sukamantri", "Sepatan", "Kedaung Barat", "Sindang Jaya", "Cikupa", "Talagasari", "Sukamulya", "Jayanti"];
  const addresses = ["Perumahan Puri Jaya, Blok C2 No. 12", "Jl. Raya Sepatan No. 28", "Perumahan Taman Sepatan, Blok B4 No. 8", "Jl. Raya Sindang Jaya No. 15", "Perumahan Citra Raya, Blok D1 No. 6", "Jl. Raya Serang KM 24 No. 10", "Perumahan Bumi Indah, Blok A5 No. 3", "Jl. Raya Jayanti No. 42"];
  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
  const previous = new Date(start); previous.setMonth(previous.getMonth() - 1);
  const currentSpan = Math.max(HOUR, now - start.getTime());
  const registrationCount = 128;
  const registrations = Array.from({ length: 236 }, (_, index) => {
    const currentMonth = index < registrationCount;
    const createdAt = currentMonth
      ? now - Math.max(1000, ((index + 0.2) / registrationCount) * currentSpan)
      : start.getTime() - ((index - registrationCount + 1) / 109) * (start.getTime() - previous.getTime());
    const area = index % 8;
    const nameIndex = index % customerNames.length;
    const group = nameIndex === 3 || nameIndex === 10 ? SERVICE_TYPES[1] : nameIndex === 15 ? SERVICE_TYPES[3] : SERVICE_TYPES[0];
    const statusIndex = [1, 2, 0, 4, 5, 3, 5, 2, 1, 5, 5, 4, 2, 5, 6, 5][index % 16];
    const stage = registrationStatuses[statusIndex];
    return {
      id: id(3000 + index), ticket_number: `REG-${ticketStamp(new Date(createdAt))}-${String(128 - index + (currentMonth ? 100 : 300)).padStart(4, "0")}`,
      customer_name: customerNames[nameIndex], identity_number: `3603${String(100000000000 + index).slice(-12)}`,
      phone_number: `0812${String(30500100 + index)}`, email: `pelanggan${index + 1}@contoh.invalid`,
      service_type: group, province: "Banten", city: "Kabupaten Tangerang", district: SERVICE_DISTRICTS[area], village: villages[area], address: addresses[area],
      latitude: -6.11 - area * 0.012, longitude: 106.56 - area * 0.009, property_ownership: index % 4 === 0 ? "Sewa / kontrak" : "Milik sendiri",
      building_area: 60 + (index % 5) * 20, occupants: 3 + (index % 4), meter_diameter: "15 mm (1/2 inci)",
      customer_number: stage.is_final && statusIndex === 5 ? `AAT-${String(100100 + index)}` : null,
      attachment_urls: [], attachment_labels: [], consent_accepted: true,
      current_status_id: stage.id, created_by: profiles[index % 2 === 0 ? 1 : 4].id,
      verification_note: statusIndex > 1 ? "Dokumen sesuai. Ketersediaan jaringan pipa diperiksa oleh tim teknis Aetra." : null,
      verified_by: statusIndex > 1 ? profiles[2].id : null, verified_at: statusIndex > 1 ? new Date(Math.min(now, createdAt + HOUR)).toISOString() : null,
      created_at: new Date(createdAt).toISOString(), updated_at: new Date(Math.min(now, createdAt + statusIndex * HOUR)).toISOString(),
    };
  });
  const issueTitles = [
    "Kebocoran pipa di Perumahan Puri Jaya", "Meter air tidak berputar di Sepatan", "Tekanan air rendah di Sindang Jaya", "Air tidak mengalir di Cikupa",
    "Rembesan sambungan rumah di Balaraja", "Air keruh setelah pemulihan jaringan", "Penggantian katup di Pasar Kemis", "Pemulihan galian pipa di Sukamulya",
  ];
  const repair_orders = Array.from({ length: 34 }, (_, index) => {
    const resolved = index >= 24;
    const ageHours = resolved ? 90 + index * 2 : 1.2 + index * 1.6;
    const createdAt = now - ageHours * HOUR;
    const priority = ["High", "Medium", "Medium", "Urgent", "Low"][index % 5];
    const slaHours = { Urgent: 8, High: 24, Medium: 48, Low: 72 }[priority];
    const duration = slaHours * (index === 33 ? 1.2 : 0.38 + (index % 5) * 0.08);
    return {
      id: id(5000 + index), ticket_number: `RPR-${ticketStamp(new Date(createdAt))}-${String(340 - index).padStart(4, "0")}`,
      title: issueTitles[index % 8], description: "Laporan pelanggan diterima. Tim distribusi melakukan pemeriksaan sambungan pipa, meter, dan pemulihan aliran air pada lokasi terdampak.",
      priority, sla_hours: slaHours, location_address: `${addresses[index % 8]}, ${SERVICE_DISTRICTS[index % 8]}`,
      service_category: REPAIR_CATEGORIES[index % 8], customer_number: `AAT-${100100 + index}`,
      assigned_to: index % 4 === 0 && !resolved ? null : profiles[3].id, assigned_division: "Distribusi & Pemeliharaan",
      current_status_id: repairStatuses[resolved ? 4 : index % 4].id, proof_image_url: null,
      technician_notes: resolved ? "Sambungan pipa diperbaiki, meter diuji, dan aliran air kembali normal. Area pekerjaan telah dirapikan." : null,
      materials_used: resolved ? [{ id: id(7100 + index), name: "Soket HDPE 20 mm", qty: 2, unit: "buah" }] : [],
      due_at: new Date(createdAt + slaHours * HOUR).toISOString(), resolved_at: resolved ? new Date(createdAt + duration * HOUR).toISOString() : null,
      created_by: profiles[4].id, created_at: new Date(createdAt).toISOString(), updated_at: new Date(Math.min(now, createdAt + 2 * HOUR)).toISOString(),
    };
  });
  const status_history = [];
  [...registrations, ...repair_orders].forEach((record, recordIndex) => {
    const isRegistration = recordIndex < registrations.length;
    const stages = isRegistration ? registrationStatuses : repairStatuses;
    const index = stages.findIndex((s) => s.id === record.current_status_id);
    const reached = isRegistration && index === 6 ? [stages[0], stages[6]] : stages.slice(0, index + 1);
    reached.forEach((stage, step) => status_history.push({
      id: id(20000 + recordIndex * 10 + step), entity_type: isRegistration ? "registration" : "repair", entity_id: record.id,
      from_status_id: step === 0 ? null : reached[step - 1].id, to_status_id: stage.id,
      note: step === 0 ? "Permohonan diterima oleh layanan pelanggan Aetra Tangerang." : `Tahap ${stage.status_name.toLowerCase()} dicatat oleh petugas layanan air.`,
      changed_by: step === 0 ? record.created_by : profiles[isRegistration ? 2 : 3].id,
      created_at: new Date(new Date(record.created_at).getTime() + (step / Math.max(1, reached.length)) * Math.min(3 * HOUR, now - new Date(record.created_at).getTime())).toISOString(),
    }));
  });
  const activities = [
    [1, "Menerima pendaftaran baru", "pendaftaran", registrations[0], { customer_name: registrations[0].customer_name }],
    [2, "Memverifikasi dokumen", "pendaftaran", registrations[1], { customer_name: registrations[1].customer_name }],
    [3, "Menyelesaikan perbaikan pipa", "repair", repair_orders[24], { title: "Aliran air kembali normal" }],
    [3, "Menjadwalkan pemasangan meter", "pendaftaran", registrations[3], { customer_name: registrations[3].customer_name }],
    [4, "Menerima laporan gangguan", "repair", repair_orders[0], { title: repair_orders[0].title }],
    [0, "Memperbarui alur sambungan baru", "workflow", workflow_statuses[0], { status: "Survei jaringan" }],
  ];
  const activity_logs = activities.map((activity, index) => ({
    id: id(8000 + index), user_id: profiles[activity[0]].id, action: activity[1], entity_name: activity[2], entity_id: activity[3].id,
    details: { ticket_number: activity[3].ticket_number, ...activity[4] }, created_at: at(-(index * 19 + 4) * 60000),
  }));
  return { roles, permissions, profiles, app_settings, workflow_statuses, registrations, repair_orders, status_history, activity_logs, __files: {} };
}