import { useState } from "react";
import {
  ArrowRight,
  ExternalLink,
  HelpCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  User,
  CheckCircle2,
  Phone,
  MapPin,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { Field, Input, Select, Textarea } from "@/components/common/Field";
import { BrandWordmark } from "@/components/common/BrandMark";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";
import { useToast } from "@/context/ToastContext";
import { DEMO_ACCOUNTS } from "@/lib/seedData";
import { supabase } from "@/lib/supabaseClient";

export function LoginPage() {
  const { signIn, signInCustomer, isDemoMode } = useAuth();
  const { settings } = useBranding();
  const toast = useToast();

  // Active Tab: "staff" | "pelanggan" | "daftar"
  const [activeTab, setActiveTab] = useState("staff");

  // 1. Staff Login State
  const [staffValues, setStaffValues] = useState({ email: "", password: "" });
  const [staffBusy, setStaffBusy] = useState(false);
  const [staffError, setStaffError] = useState(null);

  // 2. Pelanggan Login State
  const [customerIdInput, setCustomerIdInput] = useState("");
  const [customerBusy, setCustomerBusy] = useState(false);
  const [customerError, setCustomerError] = useState(null);

  // 3. Daftar Sambungan Baru State
  const [regForm, setRegForm] = useState({
    name: "",
    identityNo: "",
    phone: "",
    address: "",
    salesCode: "",
    serviceType: "Sambungan Baru Reguler",
    notes: "",
  });
  const [regBusy, setRegBusy] = useState(false);
  const [regSuccess, setRegSuccess] = useState(null); // { customerId, ticketNo, name }

  // Handlers
  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setStaffError(null);
    if (!staffValues.email.trim() || !staffValues.password) {
      setStaffError("Masukkan email dan kata sandi akun staf.");
      return;
    }
    setStaffBusy(true);
    try {
      await signIn(staffValues);
      window.location.hash = "/dashboard";
      toast.success("Berhasil masuk ke portal divisi staf.");
    } catch (err) {
      setStaffError(err.message);
    } finally {
      setStaffBusy(false);
    }
  };

  const handleCustomerLogin = async (e) => {
    e.preventDefault();
    setCustomerError(null);
    const clean = customerIdInput.trim();
    if (!clean) {
      setCustomerError("Masukkan ID Pelanggan atau nomor pendaftaran Anda.");
      return;
    }
    setCustomerBusy(true);
    try {
      await signInCustomer(clean);
      window.location.hash = "/dashboard";
      toast.success(`Selamat datang di Portal Pelanggan (${clean})`);
    } catch (err) {
      setCustomerError(err.message);
    } finally {
      setCustomerBusy(false);
    }
  };

  const handleRegisterSambungan = async (e) => {
    e.preventDefault();
    if (!regForm.name || !regForm.phone || !regForm.address) {
      toast.error("Mohon lengkapi nama, nomor telepon, dan alamat pemasangan.");
      return;
    }

    setRegBusy(true);
    try {
      const random4 = Math.floor(1000 + Math.random() * 9000);
      const generatedCustomerId = `PLG-2026-${random4}`;
      const generatedTicketNo = `REG-2026-${random4}`;
      const hasSales = Boolean(regForm.salesCode?.trim());

      const newRegistration = {
        id: `reg_${Date.now()}`,
        ticket_number: generatedTicketNo,
        registration_no: generatedTicketNo,
        customer_number: generatedCustomerId,
        customer_name: regForm.name.trim(),
        identity_number: regForm.identityNo || "3671000000000000",
        identity_no: regForm.identityNo || "3671000000000000",
        phone_number: regForm.phone.trim(),
        phone: regForm.phone.trim(),
        address: regForm.address.trim(),
        installation_address: regForm.address.trim(),
        sales_code: hasSales ? regForm.salesCode.trim().toUpperCase() : null,
        assigned_sales_name: hasSales ? "Sarah Wijaya (Sales)" : null,
        service_type: regForm.serviceType,
        package_plan: "Standar Rumah Tangga",
        current_status_id: hasSales
          ? "00000000-0000-4000-8000-000000000012" // Survei jaringan (Direct ke Sales)
          : "00000000-0000-4000-8000-000000000011", // Masuk CS -> SPV Sales
        status: hasSales ? "Direct ke Sales (Survei Lokasi)" : "Diteruskan ke CS",
        notes: regForm.notes || (hasSales ? `Pendaftaran via kode ${regForm.salesCode}` : "Pendaftaran mandiri baru"),
        created_at: new Date().toISOString(),
        created_by: "Pelanggan Mandiri",
        attachment_urls: [],
        documents: [],
      };

      // Save to database
      await supabase.from("registrations").insert(newRegistration);

      // Save to localStorage backup
      const existing = JSON.parse(window.localStorage.getItem("app_registrations") || "[]");
      window.localStorage.setItem("app_registrations", JSON.stringify([newRegistration, ...existing]));

      setRegSuccess({
        customerId: generatedCustomerId,
        ticketNo: generatedTicketNo,
        name: regForm.name,
      });

      toast.success("Pendaftaran sambungan baru berhasil! ID Pelanggan Anda telah terbit.");
    } catch (err) {
      toast.error(err.message || "Gagal mengirim formulir pendaftaran.");
    } finally {
      setRegBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:h-screen lg:overflow-hidden bg-white lg:grid-cols-[0.9fr_1.1fr]">
      {/* Left Column: Form & Login Tabs */}
      <section className="relative flex min-h-dvh lg:h-screen flex-col justify-between px-6 pb-6 pt-6 sm:px-10 xl:px-14 overflow-y-auto">
        <div>
          <BrandWordmark className="h-16 w-32 shrink-0" />

          <div className="mx-auto flex w-full max-w-[440px] flex-col py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
              {settings.login_badge || "PORTAL LAYANAN PELANGGAN"}
            </p>
            <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-[-0.8px] text-[#25415c]">
              Masuk ke portal.
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Satu akses terintegrasi untuk staf divisi, pelanggan, dan pendaftaran sambungan air Aetra Tangerang.
            </p>

            {/* 3 Sistem Login Switcher: Staff, Pelanggan, Daftar Sambungan */}
            <div className="mt-5 grid grid-cols-3 rounded-lg bg-slate-100 p-1 border border-slate-200 text-center">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("staff");
                  setRegSuccess(null);
                }}
                className={`rounded-md py-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "staff"
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Internal Aetra
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("pelanggan");
                  setRegSuccess(null);
                }}
                className={`rounded-md py-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "pelanggan"
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Pelanggan
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("daftar");
                  setRegSuccess(null);
                }}
                className={`rounded-md py-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "daftar"
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Daftar Sambungan
              </button>
            </div>

            {/* ================= 1. TAB STAF ================= */}
            {activeTab === "staff" && (
              <div className="mt-5 animate-fade-in">
                <form onSubmit={handleStaffLogin} className="space-y-3.5">
                  {staffError && (
                    <p role="alert" className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                      {staffError}
                    </p>
                  )}
                  <Field label="Username akun staf" required>
                    <Input
                      type="email"
                      icon={Mail}
                      autoComplete="username"
                      value={staffValues.email}
                      onChange={(e) => setStaffValues({ ...staffValues, email: e.target.value })}
                      placeholder="admin@aetra.demo / cs@aetra.demo"
                      required
                    />
                  </Field>
                  <Field label="Kata sandi" required>
                    <Input
                      type="password"
                      icon={LockKeyhole}
                      autoComplete="current-password"
                      value={staffValues.password}
                      onChange={(e) => setStaffValues({ ...staffValues, password: e.target.value })}
                      placeholder="Masukkan kata sandi staf"
                      required
                    />
                  </Field>
                  <Button type="submit" className="h-10 w-full mt-1" loading={staffBusy} iconRight={ArrowRight}>
                    Masuk ke dasbor staf
                  </Button>
                </form>

                {isDemoMode && (
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                      <ShieldCheck size={13} className="text-brand-500" /> Kredensial 1-Klik Semua Role Staf
                    </p>
                    <p className="mb-2 text-[10px] text-slate-400">
                      Pilih role divisi untuk simulasi tugas secara instan:
                    </p>
                    <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                      {DEMO_ACCOUNTS.filter((a) => a.label !== "Pelanggan").map((account) => (
                        <div
                          key={account.email}
                          onClick={async () => {
                            setStaffValues({ email: account.email, password: account.password });
                            setStaffBusy(true);
                            setStaffError(null);
                            try {
                              await signIn({ email: account.email, password: account.password });
                              window.location.hash = "/dashboard";
                              toast.success(`Masuk sebagai ${account.label}`);
                            } catch (err) {
                              setStaffError(err.message);
                            } finally {
                              setStaffBusy(false);
                            }
                          }}
                          className="group flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2 transition-all hover:border-brand-500 hover:bg-brand-50/60"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11.5px] font-bold text-slate-800">{account.label}</span>
                              <span className="rounded bg-brand-100 px-1 py-0.5 text-[9px] font-medium text-brand-700">
                                {account.password}
                              </span>
                            </div>
                            <p className="text-[10.5px] font-medium text-slate-600">{account.email}</p>
                            <p className="truncate text-[9.5px] text-slate-400">{account.role}</p>
                          </div>
                          <span className="ml-2 rounded border border-slate-200 bg-white px-2 py-1 text-[10.5px] font-semibold text-brand-600 shadow-xs group-hover:border-brand-600 group-hover:bg-brand-600 group-hover:text-white">
                            Masuk
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================= 2. TAB PELANGGAN ================= */}
            {activeTab === "pelanggan" && (
              <div className="mt-5 animate-fade-in">
                <form onSubmit={handleCustomerLogin} className="space-y-4">
                  {customerError && (
                    <p role="alert" className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                      {customerError}
                    </p>
                  )}
                  <Field
                    label="ID Pelanggan / Nomor Pendaftaran"
                    required
                    hint="Masuk cukup memakai ID Pelanggan Anda (tanpa perlu kata sandi)."
                  >
                    <Input
                      icon={User}
                      value={customerIdInput}
                      onChange={(e) => setCustomerIdInput(e.target.value.toUpperCase())}
                      placeholder="Contoh: PLG-1008 atau REG-2026-XXXX"
                      className="font-mono font-bold uppercase tracking-wide text-brand-700"
                      required
                    />
                  </Field>

                  <Button type="submit" className="h-10 w-full" loading={customerBusy} iconRight={ArrowRight}>
                    Masuk Sebagai Pelanggan
                  </Button>
                </form>

                <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-slate-600">
                  <p className="font-semibold text-blue-900 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-brand-600" /> Fitur Akses Pelanggan:
                  </p>
                  <ul className="mt-2 space-y-1 text-[11px] text-slate-600 list-disc list-inside">
                    <li>Pantau langsung tahapan progres pasang baru air yang diupdate CS.</li>
                    <li>Lihat nominal tagihan & lakukan pembayaran sambungan online.</li>
                    <li>Sampaikan komplain / permintaan relokasi meter & isi rating CSAT.</li>
                  </ul>
                  <div className="mt-3 pt-3 border-t border-blue-200/60 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Uji coba akun contoh:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerIdInput("PLG-1008");
                      }}
                      className="font-mono font-bold text-[10.5px] text-brand-700 bg-white px-2 py-0.5 rounded border border-blue-200 hover:bg-brand-50"
                    >
                      Gunakan PLG-1008
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ================= 3. TAB DAFTAR SAMBUNGAN ================= */}
            {activeTab === "daftar" && (
              <div className="mt-5 animate-fade-in">
                {regSuccess ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 text-center space-y-3">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                      <CheckCircle2 size={22} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Pendaftaran Berhasil Dikirim ke CS!</h3>
                      <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                        Sistem telah otomatis menerbitkan <strong>ID Pelanggan</strong> Anda:
                      </p>
                      <div className="mt-2.5 rounded-lg bg-white p-2.5 border border-emerald-300 font-mono text-base font-bold text-brand-700 tracking-wider shadow-xs">
                        {regSuccess.customerId}
                      </div>
                      <p className="mt-2 text-[10px] text-slate-500">
                        No. Registrasi: <span className="font-mono font-semibold">{regSuccess.ticketNo}</span>
                      </p>
                    </div>
                    <Button
                      className="w-full text-xs h-9 mt-2"
                      onClick={async () => {
                        await signInCustomer(regSuccess.customerId);
                        window.location.hash = "/dashboard";
                      }}
                    >
                      Masuk ke Portal Pelanggan Sekarang &rarr;
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleRegisterSambungan} className="space-y-3">
                    <Field label="Nama Lengkap Pemohon" required>
                      <Input
                        value={regForm.name}
                        onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                        placeholder="Nama sesuai KTP"
                        required
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="No. KTP / NIK" required>
                        <Input
                          value={regForm.identityNo}
                          onChange={(e) => setRegForm({ ...regForm, identityNo: e.target.value })}
                          placeholder="3671xxxxxxxxxxxx"
                          required
                        />
                      </Field>
                      <Field label="No. WhatsApp Aktif" required>
                        <Input
                          value={regForm.phone}
                          onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                          placeholder="0812xxxxxxxx"
                          required
                        />
                      </Field>
                    </div>
                    <Field label="Alamat Pemasangan Sambungan Air" required>
                      <textarea
                        value={regForm.address}
                        onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                        placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan"
                        rows={2}
                        className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                        required
                      />
                    </Field>
                    <Field label="Kode Akun Sales (Opsional)" hint="Isi jika Anda mendaftar didampingi oleh petugas sales">
                      <Input
                        value={regForm.salesCode}
                        onChange={(e) => setRegForm({ ...regForm, salesCode: e.target.value.toUpperCase() })}
                        placeholder="Contoh: SLS-SARAH"
                        className="font-mono font-bold uppercase text-brand-700"
                      />
                    </Field>
                    <Button type="submit" className="h-10 w-full mt-1" loading={regBusy} iconRight={ArrowRight}>
                      Kirim Pendaftaran & Dapatkan ID Pelanggan
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Minimal Bottom Links: Kenali Aetra & Bantuan Layanan */}
        <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 max-w-[440px] mx-auto w-full">
          <a
            href="https://aetratangerang.co.id/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-600 transition-colors flex items-center gap-1 font-medium"
          >
            Kenali Aetra <ExternalLink size={12} />
          </a>
          <a
            href="https://aetratangerang.co.id/informasi-pelanggan/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-600 transition-colors flex items-center gap-1 font-medium"
          >
            Bantuan Layanan <HelpCircle size={12} />
          </a>
        </div>
      </section>

      {/* Right Column: Hero Matching Gambar 2 with Royalty-Free Water Background & Bottom Text */}
      <section className="hidden bg-[#003c6a] lg:flex lg:flex-col justify-between p-12 xl:p-16 text-white relative overflow-hidden h-full select-none">
        {/* Proportional Corporate Water Photography (Customizable by Admin in Settings) */}
        <img
          src={settings.login_hero_image || "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1600&q=85"}
          alt="Latar belakang air bersih PT Aetra Air Tangerang"
          className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none select-none"
          loading="eager"
        />

        {/* Balanced Corporate Blue Vignette & Gradient for Clear Water Visibility & High Legibility */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#003660]/75 via-[#00487c]/45 to-[#002747]/85 pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.2em] text-white/90 font-semibold drop-shadow-sm">
            PT AETRA AIR TANGERANG
          </p>
          <h2 className="mt-16 text-6xl font-black tracking-tight leading-none text-white drop-shadow-sm">
            Aetra<br />Tangerang.
          </h2>
          <p className="mt-8 text-2xl font-bold text-white leading-tight drop-shadow-sm">
            Air bersih,<br />kehidupan lebih baik.
          </p>
          <p className="mt-6 text-sm text-white/90 max-w-sm leading-relaxed drop-shadow-sm">
            Mendekatkan layanan air perpipaan dengan masyarakat. Dari sambungan pertama, untuk setiap kebutuhan pelanggan.
          </p>
        </div>

        {/* Small Bottom Text from Gambar 1 (Portal Layanan Terpusat) */}
        <div className="relative z-10 pt-6 text-[11px] text-white/80 font-normal drop-shadow-sm">
          © 2026 PT Aetra Air Tangerang · Portal Layanan Terpusat
        </div>
      </section>
    </div>
  );
}
