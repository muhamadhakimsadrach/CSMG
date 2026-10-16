# Aetra Tangerang - Portal Layanan Air Terpadu

Aplikasi React, Vite, Tailwind CSS, Lucide React, dan TiDB MySQL untuk pendaftaran sambungan air, verifikasi pelanggan, penanganan gangguan air, serta integrasi multi-peran PT Aetra Air Tangerang.

## Panduan Deploy ke Vercel dengan TiDB MySQL

Agar koneksi ke database **TiDB MySQL** tetap aktif dan berjalan sempurna setelah di-deploy ke **Vercel**, ikuti langkah-langkah pengaturan Environment Variables di bawah ini:

### 1. Masukkan Environment Variables di Vercel Dashboard
Saat mengimpor proyek Anda ke Vercel (atau melalui menu **Settings &rarr; Environment Variables** pada proyek yang sudah ada), tambahkan variabel berikut satu per satu:

- `TIDB_HOST` = `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`
- `TIDB_PORT` = `4000`
- `TIDB_USER` = `2CMVuLuG9k63iXm.root`
- `TIDB_PASSWORD` = `OFBMKXukDxXav86B`
- `TIDB_DATABASE` = `sys`
- `TIDB_ENABLE_SSL` = `true`

Pastikan centang/pilih lingkungan **Production**, **Preview**, dan **Development** agar Vercel menerapkannya di semua mode deployment.

### 2. Konfigurasi Build Settings di Vercel
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 3. Redecploy / Deploy Ulang
Setelah menyimpan Environment Variables tersebut, klik **Redeploy** pada proyek Vercel Anda agar aplikasi membaca kredensial TiDB MySQL secara langsung pada saat proses build maupun runtime serverless.