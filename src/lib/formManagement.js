// ============================================================================
// Form Management Store & Schema ala Google Forms untuk PT Aetra Air Tangerang
// Mendukung kustomisasi form oleh Admin Aetra: tambah pertanyaan, edit tipe input,
// input satuan dinamis (meter, m3, bar, Rp, dll), upload gambar, dll.
// ============================================================================

const STORAGE_KEY = "aetra_custom_forms_v1";

export const FORM_TARGETS = [
  {
    key: "registration",
    title: "Form Pendaftaran Sambungan Baru",
    description: "Digunakan oleh Calon Pelanggan (Mandiri) & Customer Service (Walk-in)",
    badge: "CS & Pelanggan",
  },
  {
    key: "survey",
    title: "Form Survei Lokasi Lapangan",
    description: "Diisi oleh Staf Sales saat mengecek kelayakan lokasi calon pelanggan",
    badge: "Sales",
  },
  {
    key: "nc_check",
    title: "Form Pengecekan NC (Reguler vs Non-Reguler)",
    description: "Diisi oleh Tim NC untuk menghitung penambahan panjang pipa",
    badge: "Tim NC",
  },
  {
    key: "nc_completion",
    title: "Form Selesai Pemasangan Meteran",
    description: "Diisi oleh Tim NC saat meteran air selesai dipasang & diuji",
    badge: "Tim NC",
  },
  {
    key: "complaint",
    title: "Form Komplain & Relokasi Meter",
    description: "Digunakan pelanggan untuk lapor air mati, bocor, atau relokasi",
    badge: "CS & Pelanggan",
  },
  {
    key: "repair_completion",
    title: "Form Penyelesaian Perbaikan & Material",
    description: "Diisi teknisi Minor Repair mencatat suku cadang & material",
    badge: "Minor Repair",
  },
];

export const FIELD_TYPES = [
  { type: "text", label: "Jawaban Singkat (Teks)", hasUnit: false, hasOptions: false },
  { type: "textarea", label: "Paragraf (Teks Panjang)", hasUnit: false, hasOptions: false },
  { type: "number", label: "Angka dengan Satuan", hasUnit: true, hasOptions: false },
  { type: "select", label: "Pilihan Dropdown", hasUnit: false, hasOptions: true },
  { type: "checkbox", label: "Kotak Centang (Multi-pilihan)", hasUnit: false, hasOptions: true },
  { type: "file", label: "Unggah Gambar / Foto Bukti", hasUnit: false, hasOptions: false },
  { type: "date", label: "Tanggal", hasUnit: false, hasOptions: false },
];

export const COMMON_UNITS = [
  "meter",
  "m3",
  "bar",
  "Rp",
  "buah",
  "batang",
  "titik",
  "inci",
  "mm",
  "liter/detik",
  "orang",
  "hari",
];

export const DEFAULT_SCHEMAS = {
  registration: [
    { id: "reg_cust_name", label: "Nama Lengkap Pemohon / Instansi", type: "text", required: true, placeholder: "Contoh: Budi Santoso", hint: "Sesuai kartu identitas resmi" },
    { id: "reg_nik", label: "Nomor KTP / NIK Penanggung Jawab", type: "text", required: true, placeholder: "16 digit NIK", hint: "Untuk verifikasi data kependudukan" },
    { id: "reg_phone", label: "Nomor Telepon / WhatsApp", type: "text", required: true, placeholder: "0812xxxxxxxx", hint: "Nomor aktif untuk konfirmasi survei" },
    { id: "reg_sales_code", label: "Kode Akun / Referral Sales (Opsional)", type: "text", required: false, placeholder: "Contoh: SLS-SARAH atau SLS-001", hint: "Bila diisi, pendaftaran langsung terhubung ke sales yang bersangkutan" },
    { id: "reg_address", label: "Alamat Lengkap Pemasangan", type: "textarea", required: true, placeholder: "Nama jalan, nomor rumah, RT/RW, kelurahan", hint: "Patokan lokasi memudahkan tim survei" },
    { id: "reg_building_type", label: "Peruntukan Bangunan", type: "select", required: true, options: ["Rumah Tangga Standar", "Rumah Tangga Mewah", "Ruko / Komersial", "Industri Pabrik", "Sosial / Fasilitas Umum"] },
    { id: "reg_pipe_dist", label: "Perkiraan Jarak ke Jalan Utama", type: "number", unit: "meter", required: false, placeholder: "10" },
    { id: "reg_occupants", label: "Jumlah Penghuni", type: "number", unit: "orang", required: false, placeholder: "4" },
    { id: "reg_ktp_file", label: "Foto KTP Pemohon", type: "file", required: true, hint: "Format JPG / PNG jelas" },
    { id: "reg_house_photo", label: "Foto Tampak Depan Bangunan", type: "file", required: true, hint: "Memperlihatkan batas depan rumah / lokasi meteran" },
  ],
  survey: [
    { id: "srv_eligibility", label: "Hasil Evaluasi Kelayakan Pemasangan", type: "select", required: true, options: ["Layak Pasang (Jaringan Tersedia)", "Layak Bersyarat (Perlu Penambahan Pipa)", "Tidak Layak (Jaringan Belum Menjangkau)"] },
    { id: "srv_main_dist", label: "Jarak ke Pipa Distribusi Utama", type: "number", unit: "meter", required: true, placeholder: "4", hint: "Jarak dari pipa distribusi Aetra ke titik meteran" },
    { id: "srv_water_pressure", label: "Tekanan Air Sekitar Lokasi", type: "number", unit: "bar", required: true, placeholder: "1.5", hint: "Tekanan normal 1.0 - 2.5 bar" },
    { id: "srv_ground_condition", label: "Kondisi Permukaan Jalur Pipa", type: "select", required: true, options: ["Tanah Biasa", "Paving Block", "Aspal Jalan", "Cor Beton / Semen", "Melintasi Saluran Air"] },
    { id: "srv_pipe_diameter", label: "Diameter Pipa Distribusi Terdekat", type: "select", required: true, options: ["63 mm (2 inci)", "90 mm (3 inci)", "110 mm (4 inci)", "160 mm (6 inci)"] },
    { id: "srv_site_photo", label: "Foto Titik Rencana Meteran Air", type: "file", required: true, hint: "Tampak jelas titik rencana pemasangan meter air" },
    { id: "srv_notes", label: "Catatan Hasil Survei Lapangan", type: "textarea", required: true, placeholder: "Contoh: Jaringan pipa tersedia di seberang jalan, crossing pipa aman, siap dipasang." },
  ],
  nc_check: [
    { id: "nc_category", label: "Kategori Pemasangan Tim NC", type: "select", required: true, options: ["Reguler (Pipa <= 6 meter, Langsung Pasang Meter)", "Non-Reguler (Perlu Penambahan Pipa, Terbitkan ID Non-Reguler)"] },
    { id: "nc_pipe_length", label: "Panjang Pipa Tambahan yang Dibutuhkan", type: "number", unit: "meter", required: false, placeholder: "15", hint: "Hanya diisi jika kategori Non-Reguler" },
    { id: "nc_pipe_cost_permeter", label: "Biaya Penambahan per Meter", type: "number", unit: "Rp", required: false, placeholder: "80000", hint: "Tarif standar pipa penambahan" },
    { id: "nc_pipe_material", label: "Tipe Pipa Penambahan", type: "select", required: false, options: ["Pipa HDPE 20 mm PN-10", "Pipa HDPE 25 mm PN-10", "Pipa PVC SNI S-12.5", "Pipa Galvanis Medium"] },
    { id: "nc_path_photo", label: "Foto Rencana Jalur Pipa Tambahan", type: "file", required: false, hint: "Foto kondisi jalur galian penambahan pipa" },
    { id: "nc_tech_notes", label: "Catatan Teknis Pemasangan NC", type: "textarea", required: false, placeholder: "Contoh: Diperlukan pembongkaran paving 5 meter, pemasangan fitting tee 63x20." },
  ],
  nc_completion: [
    { id: "ncc_meter_no", label: "Nomor Seri Meter Air Baru", type: "text", required: true, placeholder: "MTR-2026-XXXX", hint: "Sesuai pelat nomor meteran resmi" },
    { id: "ncc_initial_stand", label: "Angka Stand Meter Awal", type: "number", unit: "m3", required: true, placeholder: "0.00", hint: "Angka awal sebelum pemakaian pelanggan" },
    { id: "ncc_meter_diameter", label: "Ukuran Diameter Meter", type: "select", required: true, options: ["15 mm (1/2 inci)", "20 mm (3/4 inci)", "25 mm (1 inci)", "40 mm (1.5 inci)"] },
    { id: "ncc_meter_brand", label: "Merek / Pabrikan Meter", type: "select", required: true, options: ["Itron", "B&R Water Meter", "Barindo", "Ningbo Water"] },
    { id: "ncc_photo", label: "Foto Meteran Terpasang di Lokasi", type: "file", required: true, hint: "Foto memperlihatkan meteran terpasang, segel, dan air mengalir" },
    { id: "ncc_installer_name", label: "Nama Teknisi Pelaksana NC", type: "text", required: true, placeholder: "Joko Susilo / Tim NC Aetra" },
    { id: "ncc_notes", label: "Catatan Pengujian Air Mengalir", type: "textarea", required: true, placeholder: "Tekanan air setelah meteran baik (1.8 bar), tidak ada rembesan pada sambungan socket." },
  ],
  complaint: [
    { id: "cmp_cust_id", label: "Nomor ID Pelanggan (Jika Sudah Ada)", type: "text", required: false, placeholder: "Contoh: AETRA-102948" },
    { id: "cmp_issue_type", label: "Jenis Kendala / Permohonan", type: "select", required: true, options: ["Air Tidak Mengalir", "Pipa Distribusi Bocor / Rembes", "Tekanan Air Sangat Lemah", "Air Keruh / Berbau", "Meteran Air Rusak / Tidak Berputar", "Permohonan Relokasi Meter Air", "Lainnya"] },
    { id: "cmp_photo", label: "Foto Bukti Kendala Lapangan", type: "file", required: false, hint: "Foto meter, titik bocor, atau air keruh" },
    { id: "cmp_description", label: "Uraian Lengkap Gangguan", type: "textarea", required: true, placeholder: "Jelaskan sejak kapan air mati atau lokasi persis pipa bocor" },
  ],
  repair_completion: [
    { id: "rc_action_taken", label: "Tindakan Perbaikan yang Dilakukan", type: "textarea", required: true, placeholder: "Penggantian kran valve 20 mm dan pengeleman sambungan socket pipa" },
    { id: "rc_pipe_used", label: "Panjang Pipa Pengganti", type: "number", unit: "meter", required: false, placeholder: "2" },
    { id: "rc_pressure_after", label: "Tekanan Air Pasca Perbaikan", type: "number", unit: "bar", required: true, placeholder: "1.6" },
    { id: "rc_proof_photo", label: "Foto Hasil Perbaikan & Area Dirapikan", type: "file", required: true, hint: "Bukti visual pekerjaan telah tuntas" },
    { id: "rc_status", label: "Status Akhir Pekerjaan", type: "select", required: true, options: ["Selesai & Normal", "Selesai Sementara (Perlu Aspal Ulang)", "Selesai Sempurna"] },
  ],
};

export function getCustomForms() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults if any key missing
      return { ...DEFAULT_SCHEMAS, ...parsed };
    }
  } catch (err) {
    console.warn("Gagal membaca skema form kustom:", err);
  }
  return DEFAULT_SCHEMAS;
}

export function saveCustomForms(forms) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(forms));
    window.dispatchEvent(new CustomEvent("aetra:custom-forms-updated", { detail: forms }));
    return true;
  } catch (err) {
    console.error("Gagal menyimpan skema form kustom:", err);
    return false;
  }
}

export function getFormSchema(formKey) {
  const forms = getCustomForms();
  return forms[formKey] || DEFAULT_SCHEMAS[formKey] || [];
}

export function saveFormSchema(formKey, fields) {
  const forms = getCustomForms();
  forms[formKey] = fields;
  return saveCustomForms(forms);
}

export function resetFormSchema(formKey) {
  const forms = getCustomForms();
  forms[formKey] = DEFAULT_SCHEMAS[formKey] || [];
  return saveCustomForms(forms);
}
