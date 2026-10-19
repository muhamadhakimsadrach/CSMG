import { COMPANY } from "./waterDomain";

export const MODULES = [
  { key: "dashboard", label: "Dashboard Ringkasan", short: "Dashboard" },
  { key: "pendaftaran", label: "Pendaftaran Sambungan Air", short: "Pendaftaran" },
  { key: "repair", label: "Gangguan & Perbaikan Air", short: "Perbaikan" },
  { key: "forms", label: "Manajemen Form Kustom", short: "Formulir" },
  { key: "pengguna", label: "Manajemen Pengguna", short: "Pengguna" },
  { key: "workflow", label: "Alur Layanan Air", short: "Alur Kerja" },
  { key: "pengaturan", label: "Pengaturan Aplikasi", short: "Pengaturan" },
  { key: "log_aktivitas", label: "Log Aktivitas", short: "Log Aktivitas" },
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
