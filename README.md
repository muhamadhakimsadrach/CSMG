# Aetra Tangerang - Portal Layanan Air

Aplikasi React, Vite, Tailwind CSS, Lucide React, dan Supabase untuk pendaftaran sambungan air, verifikasi pelanggan, serta penanganan gangguan air PT Aetra Air Tangerang.

## Menjalankan Aplikasi

1. Pasang dependensi dengan `npm install`.
2. Jalankan `npm run dev`.
3. Tanpa kredensial Supabase, aplikasi membuka dasbor simulasi. Semua nama, NIK, nomor pelanggan, metrik, dan laporan pada mode ini adalah data contoh, bukan data operasional Aetra. Keluar melalui menu akun untuk menguji peran lain.

## Menghubungkan Supabase

1. Salin `.env.example` ke `.env` di direktori yang sama dengan `package.json`.
2. Isi `VITE_SUPABASE_URL` dengan Project URL dan `VITE_SUPABASE_ANON_KEY` dengan publishable key atau anon public key dari proyek yang sama.
3. Untuk proyek baru, jalankan seluruh `supabase/schema.sql` sekali melalui SQL Editor. Berkas ini sudah memuat penyesuaian layanan air.
4. Untuk proyek yang telah menjalankan skema versi lama, jalankan hanya `supabase/migrations/20261014_aetra_water_services.sql`. Jangan menjalankan ulang seluruh skema awal. Cadangkan database sebelum migrasi.
5. Buat akun pertama melalui Authentication > Users setelah skema tersedia. Tetapkan `profiles.role_id` ke ID peran Admin Pusat melalui SQL Editor atau Table Editor.
6. Terapkan fungsi administrasi menggunakan `npx supabase functions deploy manage-users --project-ref ID_PROYEK`. Rahasia server `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` disediakan pada runtime Supabase. Jangan menaruh service role atau secret key dalam variabel `VITE_`.
7. Jalankan ulang server Vite. Pembuatan dan penghapusan akun cloud melewati Edge Function yang memverifikasi JWT dan peran Admin Pusat; tidak memakai sign-up publik atau mengganti sesi administrator.

## Penyesuaian Layanan Air

- Permohonan tiga tahap: identitas, lokasi sambungan, serta dokumen dan persetujuan data.
- Dokumen KTP, KK, PBB terakhir, foto lokasi, dan dokumen usaha bagi permohonan niaga atau industri. PNG/JPEG/WEBP/PDF maksimum 2 MB per berkas.
- Data bangunan mencakup kepemilikan, luas, penghuni, koordinat, dan peruntukan sambungan.
- Alur awal: pendaftaran diterima, verifikasi dokumen, survei jaringan, menunggu pembayaran, pemasangan meter, sambungan aktif. Penolakan tersedia sebagai cabang final terpisah.
- Aktivasi memerlukan nomor pelanggan yang dimasukkan petugas dari sistem pelanggan Aetra serta ukuran meter terpasang. Aplikasi tidak mengarang atau menerbitkan nomor pelanggan resmi.
- Nomor tiket cloud dibuat secara atomik melalui counter harian PostgreSQL untuk mencegah benturan pendaftaran serentak.
- Perbaikan mencakup pipa distribusi, sambungan rumah, meter, tekanan, aliran, kualitas air, katup, dan pemulihan galian.
- Kolom kecamatan merupakan bantuan pengisian, bukan konfirmasi cakupan. Ukuran meter, tarif, biaya, kelayakan jaringan, serta konfirmasi pembayaran harus diverifikasi petugas. Aplikasi tidak menyediakan integrasi pembayaran, penagihan, SCADA, atau pengiriman WhatsApp/email otomatis.
- SLA adalah target internal yang dapat dikonfigurasi, bukan janji layanan resmi Aetra.

## Dokumen Privat

Bucket `attachments` bersifat privat. Database menyimpan referensi objek, bukan URL publik. Aplikasi membuat signed URL satu jam ketika dokumen dibuka. Bucket `app-assets` digunakan untuk aset merek publik. Migrasi membatasi akses dokumen menurut modul dan jenis direktori.

## Data Lama

Pada mode lokal, data simulasi generik diganti dengan contoh layanan air Tangerang. Rekaman yang dibuat pengguna pada versi lokal lama dipertahankan. Migrasi Supabase tidak menghapus permohonan pelanggan dan tidak mengganti alur kerja kustom. Alur awal enam tahap yang belum diubah dapat ditingkatkan otomatis; periksa penamaan dan kewenangan setiap tahap setelah migrasi.

Periksa juga matriks Divisi Teknik pada instalasi lama: izin ubah modul pendaftaran diperlukan untuk mencatat pemasangan meter dan aktivasi sambungan. Migrasi tidak menimpa izin peran yang telah dikustomisasi.

## Verifikasi

`npm run build` menghasilkan bundel produksi. `npx tsc --noEmit` memeriksa entry point TypeScript. `npx playwright test` menjalankan pengujian antarmuka dan alur lokal. Kredensial proyek tidak disertakan; migrasi, Edge Function, RLS, backup, audit keamanan, dan integrasi storage cloud tetap harus diuji di lingkungan staging sebelum dipakai untuk data pelanggan nyata.

## Referensi Merek dan Persyaratan

Logo diambil dari situs PT Aetra Air Tangerang. Persyaratan dan nomor Contact Center mengacu pada https://aetratangerang.co.id/informasi-pelanggan/ dan syarat berlangganan pada https://aetratangerang.co.id/syarat-dan-ketentuan/. Periksa kembali informasi perusahaan sebelum peluncuran. Foto air: Jan van der Wolf, Pexels (https://www.pexels.com/photo/27999577/).