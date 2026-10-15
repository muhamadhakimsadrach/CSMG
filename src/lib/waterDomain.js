export const COMPANY = {
  name: "PT Aetra Air Tangerang",
  appName: "Aetra Tangerang",
  tagline: "Portal Layanan Pelanggan",
  promise: "Pelayanan hebat setiap saat.",
  website: "https://aetratangerang.co.id",
  informationUrl: "https://aetratangerang.co.id/informasi-pelanggan/",
  termsUrl: "https://aetratangerang.co.id/syarat-dan-ketentuan/",
  contactPhone: "021 598 5474",
  contactWhatsapp: "6287788224645",
  address: "Jl. Raya Curug No. 27, Kadu Jaya, Curug, Kabupaten Tangerang, Banten 15810",
  accent: "#0077BD",
};

export const SERVICE_TYPES = ["Rumah tangga", "Niaga / komersial", "Industri", "Sosial / fasilitas umum", "Instansi pemerintah"];

// Daftar ini membantu pengisian, bukan jaminan keterjangkauan jaringan.
export const SERVICE_DISTRICTS = ["Pasar Kemis", "Sepatan", "Sepatan Timur", "Sindang Jaya", "Cikupa", "Balaraja", "Sukamulya", "Jayanti", "Lainnya - periksa ketersediaan jaringan"];

export const REPAIR_CATEGORIES = ["Kebocoran pipa distribusi", "Kebocoran sambungan rumah", "Meter air rusak", "Tekanan air rendah", "Air tidak mengalir", "Kualitas air", "Katup / valve", "Pemulihan area galian"];

export const DOCUMENT_FIELDS = [
  { key: "ktpFile", label: "KTP pemohon", required: true, hint: "Identitas pemohon atau penanggung jawab yang masih berlaku." },
  { key: "kkFile", label: "Kartu Keluarga", required: true, hint: "Salinan KK sesuai persyaratan administrasi pelanggan baru." },
  { key: "pbbFile", label: "PBB tahun terakhir", required: true, hint: "Dokumen PBB properti yang diajukan untuk sambungan air." },
  { key: "sitePhotoFile", label: "Foto lokasi pemasangan", required: true, hint: "Tampak depan bangunan dan rencana posisi meter air." },
  { key: "businessFile", label: "Surat keterangan usaha / SIUP", required: false, hint: "Dokumen pendukung untuk permohonan niaga dan industri." },
];

export function isCommercial(serviceType) {
  return /niaga|komersial|industri|bisnis/i.test(serviceType || "");
}

export function isActiveConnection(status) {
  return Boolean(status?.is_final && /aktif|disetujui/i.test(status.status_name));
}