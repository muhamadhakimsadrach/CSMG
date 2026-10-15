import { useState, useEffect } from "react";
import {
  ArrowRight,
  ExternalLink,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  FileText,
  Upload,
  MapPin,
  Phone,
  Building,
  HelpCircle,
  Wrench,
  Sparkles,
  Search,
  CreditCard,
  Star,
  Check,
  Clock,
  Printer,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { Field, Input, Select } from "@/components/common/Field";
import { BrandWordmark } from "@/components/common/BrandMark";
import { PaymentModal } from "@/components/common/PaymentModal";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";
import { useToast } from "@/context/ToastContext";
import { DEMO_ACCOUNTS } from "@/lib/seedData";
import { COMPANY } from "@/lib/waterDomain";
import { supabase } from "@/lib/supabaseClient";
import { formatRupiah } from "@/lib/utils";

export function LoginPage() {
  const { signIn, isDemoMode } = useAuth();
  const { settings } = useBranding();
  const toast = useToast();

  const [mode, setMode] = useState("staff"); // "staff" | "register" | "track" | "complain"

  // Staff Login state
  const [values, setValues] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Customer Registration state
  const [regForm, setRegForm] = useState({
    name: "",
    identityNo: "",
    email: "",
    phone: "",
    salesCode: "",
    serviceType: "Sambungan Baru Reguler",
    packagePlan: "Standar Rumah Tangga",
    address: "",
    zipCode: "15111",
    notes: "",
  });
  const [regSubmitted, setRegSubmitted] = useState(false);
  const [successCode, setSuccessCode] = useState("");
  const [successTitle, setSuccessTitle] = useState("");
  const [successDesc, setSuccessDesc] = useState("");

  // Customer Complain state
  const [complainForm, setComplainForm] = useState({
    name: "",
    phone: "",
    customerId: "",
    zipCode: "15111",
    address: "",
    issueType: "Air Tidak Mengalir",
    issue: "",
  });
  const [complainSubmitted, setComplainSubmitted] = useState(false);

  // Public Tracking & Payment state
  const [trackQuery, setTrackQuery] = useState("");
  const [trackedRecord, setTrackedRecord] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackNotFound, setTrackNotFound] = useState(false);
  const [activePaymentModal, setActivePaymentModal] = useState(null); // "initial" | "non_regular"
  const [csatRating, setCsatRating] = useState(5);
  const [csatReview, setCsatReview] = useState("");
  const [csatSubmitted, setCsatSubmitted] = useState(false);

  const handleStaffLogin = async (event) => {
    event.preventDefault();
    setError(null);
    if (!values.email.trim() || !values.password) {
      setError("Masukkan email dan kata sandi akun Anda.");
      return;
    }
    setBusy(true);
    try {
      await signIn(values);
      window.location.hash = "/dashboard";
      toast.success("Anda berhasil masuk ke portal layanan air.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCustomerRegister = async (e) => {
    e.preventDefault();
    if (!regForm.name || !regForm.phone || !regForm.address) {
      toast.error("Mohon lengkapi nama, nomor telepon, dan alamat pemasangan.");
      return;
    }

    const hasSalesCode = Boolean(regForm.salesCode?.trim());
    const newRegNo = `REG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newReg = {
      id: `reg_${Date.now()}`,
      ticket_number: newRegNo,
      registration_no: newRegNo,
      customer_name: regForm.name.trim(),
      identity_number: regForm.identityNo || "3671000000000000",
      identity_no: regForm.identityNo || "3671000000000000",
      email: regForm.email || null,
      phone_number: regForm.phone.trim(),
      phone: regForm.phone.trim(),
      sales_code: hasSalesCode ? regForm.salesCode.trim().toUpperCase() : null,
      assigned_sales_id: hasSalesCode ? "00000000-0000-4000-8000-000000001005" : null,
      assigned_sales_name: hasSalesCode ? "Sarah Wijaya (Sales)" : null,
      service_type: regForm.serviceType,
      package_plan: regForm.packagePlan,
      address: regForm.address.trim(),
      installation_address: regForm.address.trim(),
      zip_code: regForm.zipCode,
      current_status_id: hasSalesCode
        ? "00000000-0000-4000-8000-000000000012" // Survei jaringan (Direct ke Sales)
        : "00000000-0000-4000-8000-000000000011", // Diteruskan ke SPV Sales (Masuk CS -> SPV)
      status: hasSalesCode ? "Direct ke Sales (Survei Lokasi)" : "Diteruskan ke SPV Sales",
      notes: regForm.notes || (hasSalesCode ? `Direct Sales via kode ${regForm.salesCode}` : "Pendaftaran mandiri tanpa kode sales"),
      created_at: new Date().toISOString(),
      created_by: "Pelanggan (Portal Mandiri)",
      attachment_urls: [],
      documents: [],
    };

    // Insert into Supabase / localBackend
    try {
      await supabase.from("registrations").insert(newReg);
    } catch (err) {
      console.warn("Insert to local db fallback:", err);
    }

    // Also persist in app_registrations for backup
    const existing = JSON.parse(localStorage.getItem("app_registrations") || "[]");
    localStorage.setItem("app_registrations", JSON.stringify([newReg, ...existing]));

    setSuccessCode(newRegNo);
    setSuccessTitle(
      hasSalesCode
        ? "Pendaftaran Berhasil & Langsung Direct ke Sales!"
        : "Pendaftaran Sambungan Baru Berhasil!"
    );
    setSuccessDesc(
      hasSalesCode
        ? `Kode Sales ${regForm.salesCode.toUpperCase()} terverifikasi. Tugas survei lokasi langsung diteruskan ke Staf Sales (${newReg.assigned_sales_name}) tanpa menunggu CS.`
        : `Nomor Registrasi Anda adalah ${newRegNo}. Berkas diteruskan ke Customer Service dan SPV Sales untuk penugasan tim survei.`
    );
    setRegSubmitted(true);
    toast.success("Pendaftaran sambungan baru berhasil dikirim!");
  };

  const handleCustomerComplain = async (e) => {
    e.preventDefault();
    if (!complainForm.name || !complainForm.phone || !complainForm.issue) {
      toast.error("Mohon lengkapi nama, nomor telepon, dan keterangan kendala.");
      return;
    }
    const newTicketNo = `TICK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRepair = {
      id: `rep_${Date.now()}`,
      ticket_number: newTicketNo,
      ticket_no: newTicketNo,
      title: `${complainForm.issueType} - ${complainForm.name}`,
      customer_name: complainForm.name,
      phone: complainForm.phone,
      customer_number: complainForm.customerId || "CUST-NEW",
      customer_id: complainForm.customerId || "CUST-NEW",
      zip_code: complainForm.zipCode || "15111",
      location_address: complainForm.address || "Alamat komplain pelanggan",
      address: complainForm.address || "Alamat komplain pelanggan",
      service_category: complainForm.issueType,
      description: complainForm.issue,
      status: "Menunggu SPV Technical",
      current_status_id: "00000000-0000-4000-8000-000000000020",
      priority: "Normal",
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from("repair_orders").insert(newRepair);
    } catch (err) {
      console.warn("Insert repair fallback:", err);
    }

    const existing = JSON.parse(localStorage.getItem("app_repair_orders") || "[]");
    localStorage.setItem("app_repair_orders", JSON.stringify([newRepair, ...existing]));

    setSuccessCode(newTicketNo);
    setSuccessTitle("Tiket Komplain / Relokasi Berhasil Dikirim!");
    setSuccessDesc(`Nomor Tiket Anda adalah ${newTicketNo}. Komplain diteruskan ke SPV Technical untuk disposisi penanganan.`);
    setComplainSubmitted(true);
    toast.success("Tiket komplain berhasil dikirim ke sistem Aetra!");
  };

  // Tracking query handler
  const handleSearchTrack = async (e) => {
    e?.preventDefault();
    const q = trackQuery.trim();
    if (!q) {
      toast.warning("Masukkan nomor registrasi, ID pelanggan, atau ID non-reguler.");
      return;
    }
    setTrackingLoading(true);
    setTrackNotFound(false);
    try {
      const { data } = await supabase
        .from("registrations")
        .select("*")
        .or(`ticket_number.ilike.%${q}%,customer_number.ilike.%${q}%,non_regular_id.ilike.%${q}%`)
        .maybeSingle();

      if (data) {
        setTrackedRecord(data);
      } else {
        // Fallback search local storage
        const local = JSON.parse(localStorage.getItem("app_registrations") || "[]");
        const found = local.find(
          (r) =>
            r.ticket_number?.toLowerCase() === q.toLowerCase() ||
            r.registration_no?.toLowerCase() === q.toLowerCase() ||
            r.customer_number?.toLowerCase() === q.toLowerCase() ||
            r.non_regular_id?.toLowerCase() === q.toLowerCase()
        );
        if (found) {
          setTrackedRecord(found);
        } else {
          setTrackedRecord(null);
          setTrackNotFound(true);
        }
      }
    } catch (err) {
      console.error(err);
      setTrackNotFound(true);
    } finally {
      setTrackingLoading(false);
    }
  };

  // Submit CSAT rating from public portal
  const handlePublicCsat = async () => {
    if (!trackedRecord) return;
    try {
      const rating = {
        stars: csatRating,
        review: csatReview.trim(),
        rated_at: new Date().toISOString(),
        rated_by: trackedRecord.customer_name,
      };
      await supabase
        .from("registrations")
        .update({ customer_rating: rating })
        .eq("id", trackedRecord.id);

      setTrackedRecord({ ...trackedRecord, customer_rating: rating });
      setCsatSubmitted(true);
      toast.success("Terima kasih atas ulasan dan rating Anda!");
    } catch (err) {
      toast.error("Gagal mengirim ulasan.");
    }
  };

  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[0.9fr_1.1fr]">
      <section className="relative flex min-h-dvh flex-col px-6 pb-7 pt-5 sm:px-10 xl:px-14 overflow-y-auto">
        <BrandWordmark className="h-16 w-32 shrink-0" />

        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600">
            {settings.login_badge || settings.tagline || "Layanan Air Terpadu PT Aetra"}
          </p>
          <h1 className="mt-1 text-[25px] font-bold leading-tight tracking-[-0.8px] text-[#25415c]">
            {settings.login_title || "Portal Layanan Terpadu"}
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            {settings.login_subtitle || "Akses staf internal, pendaftaran mandiri sambungan baru, pelacakan tagihan & pembayaran, atau komplain pelanggan."}
          </p>

          {/* Clean Corporate Tab Switcher */}
          <div className="mt-6 flex items-center gap-5 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => {
                setMode("staff");
                setRegSubmitted(false);
                setComplainSubmitted(false);
              }}
              className={`text-xs font-bold pb-1.5 transition-colors cursor-pointer ${
                mode === "staff"
                  ? "text-brand-600 border-b-2 border-brand-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Login Staf
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setRegSubmitted(false);
                setComplainSubmitted(false);
              }}
              className={`text-xs font-bold pb-1.5 transition-colors cursor-pointer ${
                mode === "register"
                  ? "text-brand-600 border-b-2 border-brand-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Pasang Baru
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("track");
                setRegSubmitted(false);
                setComplainSubmitted(false);
              }}
              className={`text-xs font-bold pb-1.5 transition-colors cursor-pointer ${
                mode === "track"
                  ? "text-brand-600 border-b-2 border-brand-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Lacak & Bayar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("complain");
                setRegSubmitted(false);
                setComplainSubmitted(false);
              }}
              className={`text-xs font-bold pb-1.5 transition-colors cursor-pointer ${
                mode === "complain"
                  ? "text-brand-600 border-b-2 border-brand-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Komplain
            </button>
          </div>

          {/* ================= TAB 1: LOGIN STAFF ================= */}
          {mode === "staff" && (
            <form onSubmit={handleStaffLogin} className="mt-6 space-y-4 animate-fade-in">
              {error && (
                <p role="alert" className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs text-rose-600">
                  {error}
                </p>
              )}
              <Field label="Email akun staf" required>
                <Input
                  type="email"
                  icon={Mail}
                  autoComplete="username"
                  value={values.email}
                  onChange={(event) => setValues({ ...values, email: event.target.value })}
                  placeholder="admin@aetra.demo"
                  required
                />
              </Field>
              <Field label="Kata sandi" required>
                <Input
                  type="password"
                  icon={LockKeyhole}
                  autoComplete="current-password"
                  value={values.password}
                  onChange={(event) => setValues({ ...values, password: event.target.value })}
                  placeholder="Masukkan kata sandi"
                  required
                />
              </Field>
              <Button type="submit" className="h-11 w-full" loading={busy} iconRight={ArrowRight}>
                Masuk ke Dasbor Staf
              </Button>

              {isDemoMode && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="mb-2 flex items-center justify-between text-[11px] font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck size={13} className="text-brand-500" /> Demo 1-Klik Semua Role Staf
                    </span>
                  </p>
                  <p className="mb-2 text-[10px] text-slate-400">
                    Klik salah satu akun di bawah untuk simulasi langsung:
                  </p>
                  <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                    {DEMO_ACCOUNTS.map((account) => (
                      <div
                        key={account.email}
                        onClick={async () => {
                          setValues({ email: account.email, password: account.password });
                          setBusy(true);
                          setError(null);
                          try {
                            await signIn({ email: account.email, password: account.password });
                            window.location.hash = "/dashboard";
                            toast.success(`Masuk sebagai ${account.label}`);
                          } catch (err) {
                            setError(err.message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                        className="group flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2 transition-all hover:border-brand-500 hover:bg-brand-50/60"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-800">{account.label}</span>
                            <span className="rounded bg-brand-100 px-1 py-0.5 text-[9px] font-medium text-brand-700">
                              {account.password}
                            </span>
                          </div>
                          <p className="truncate text-[10px] text-slate-500">{account.email}</p>
                        </div>
                        <span className="ml-2 rounded bg-white px-2 py-1 text-[10px] font-semibold text-brand-600 shadow-xs group-hover:bg-brand-600 group-hover:text-white">
                          Masuk
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>
          )}

          {/* ================= TAB 2: PASANG BARU (PENDAFTARAN MANDIRI) ================= */}
          {mode === "register" && (
            <div className="mt-6 animate-fade-in">
              {regSubmitted ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center space-y-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
                    <CheckCircle2 size={26} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{successTitle}</h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">{successDesc}</p>
                    <div className="mt-3 rounded-lg bg-white p-3 border border-emerald-200 text-sm font-mono font-bold text-brand-700 shadow-xs">
                      {successCode}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1 text-xs"
                      onClick={() => {
                        setTrackQuery(successCode);
                        setMode("track");
                        handleSearchTrack();
                      }}
                    >
                      Lacak Progres Saya
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1 text-xs"
                      onClick={() => {
                        setRegSubmitted(false);
                        setRegForm({
                          name: "",
                          identityNo: "",
                          email: "",
                          phone: "",
                          salesCode: "",
                          serviceType: "Sambungan Baru Reguler",
                          packagePlan: "Standar Rumah Tangga",
                          address: "",
                          zipCode: "15111",
                          notes: "",
                        });
                      }}
                    >
                      Daftar Lagi
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCustomerRegister} className="space-y-4 max-h-[62vh] overflow-y-auto pr-1">
                  <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-3 text-[11px] text-brand-800 flex items-start gap-2">
                    <Sparkles size={14} className="shrink-0 text-brand-600 mt-0.5" />
                    <span>
                      Pendaftaran sambungan air resmi Aetra. Jika memasukkan <strong>Kode Akun Sales</strong>, permohonan langsung direct ke Sales terkait untuk segera disurvei.
                    </span>
                  </div>

                  <Field label="Nama Lengkap Pemohon / Instansi" required>
                    <Input
                      value={regForm.name}
                      onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                      placeholder="Cth: Budi Santoso"
                      required
                    />
                  </Field>

                  <Field label="Nomor KTP / NIK Pemohon" required>
                    <Input
                      value={regForm.identityNo}
                      onChange={(e) => setRegForm({ ...regForm, identityNo: e.target.value })}
                      placeholder="3671xxxxxxxxxxxx"
                      required
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="No. WhatsApp / HP" required>
                      <Input
                        value={regForm.phone}
                        onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                        placeholder="0812xxxxxxxx"
                        required
                      />
                    </Field>
                    <Field label="Email">
                      <Input
                        type="email"
                        value={regForm.email}
                        onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                        placeholder="email@domain.com"
                      />
                    </Field>
                  </div>

                  {/* KODE AKUN SALES - DIRECT TO SALES */}
                  <Field
                    label="Kode Akun / Referral Sales (Opsional)"
                    hint="Jika diisi, berkas langsung direct ke Sales tersebut tanpa perantara CS."
                  >
                    <Input
                      value={regForm.salesCode}
                      onChange={(e) => setRegForm({ ...regForm, salesCode: e.target.value })}
                      placeholder="Contoh: SLS-SARAH atau SLS-001"
                      className="font-mono uppercase font-bold text-brand-700"
                    />
                  </Field>

                  <Field label="Peruntukan Sambungan">
                    <Select
                      value={regForm.serviceType}
                      onChange={(e) => setRegForm({ ...regForm, serviceType: e.target.value })}
                    >
                      <option value="Rumah Tangga Standar">Rumah Tangga Standar</option>
                      <option value="Rumah Tangga Menengah">Rumah Tangga Menengah</option>
                      <option value="Komersial / Ruko / Niaga">Komersial / Ruko / Niaga</option>
                      <option value="Industri / Khusus">Industri / Khusus</option>
                      <option value="Sosial / Fasilitas Umum">Sosial / Fasilitas Umum</option>
                    </Select>
                  </Field>

                  <Field label="Alamat Pemasangan Lengkap" required>
                    <textarea
                      value={regForm.address}
                      onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                      placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, dan patokan lokasi"
                      rows={2}
                      className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                      required
                    />
                  </Field>

                  <Field label="Kode Pos / Wilayah">
                    <Input
                      value={regForm.zipCode}
                      onChange={(e) => setRegForm({ ...regForm, zipCode: e.target.value })}
                      placeholder="15111"
                    />
                  </Field>

                  <Button type="submit" className="h-11 w-full mt-2" iconRight={ArrowRight}>
                    Kirim Permohonan Sambungan Baru
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* ================= TAB 3: LACAK PROGRES & PEMBAYARAN MANDIRI ================= */}
          {mode === "track" && (
            <div className="mt-6 space-y-4 animate-fade-in max-h-[65vh] overflow-y-auto pr-1">
              <form onSubmit={handleSearchTrack} className="flex gap-2">
                <Input
                  value={trackQuery}
                  onChange={(e) => setTrackQuery(e.target.value)}
                  placeholder="Ketik No. REG, ID Pelanggan, atau ID Non-Reg"
                  className="font-mono text-xs"
                />
                <Button type="submit" loading={trackingLoading} icon={Search} className="shrink-0">
                  Lacak
                </Button>
              </form>

              {trackNotFound && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 text-center">
                  Nomor permohonan atau ID tidak ditemukan. Pastikan nomor yang dimasukkan sudah tepat.
                </div>
              )}

              {trackedRecord && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-4 animate-fade-in">
                  <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-brand-700">
                        {trackedRecord.ticket_number}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800">{trackedRecord.customer_name}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{trackedRecord.address || trackedRecord.installation_address}</p>
                    </div>
                    <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[10px] font-bold text-brand-800">
                      {trackedRecord.status || "Aktif"}
                    </span>
                  </div>

                  {/* Identification Badges */}
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    {trackedRecord.customer_number && (
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-mono font-bold text-emerald-800">
                        ID Pelanggan: {trackedRecord.customer_number}
                      </span>
                    )}
                    {trackedRecord.non_regular_id && (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 font-mono font-bold text-amber-800">
                        ID Non-Reguler: {trackedRecord.non_regular_id}
                      </span>
                    )}
                  </div>

                  {/* Interactive Action: Pay Initial Connection */}
                  {trackedRecord.customer_number && trackedRecord.initial_payment_status !== "paid" && (
                    <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50/70 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-950">Tagihan Sambungan Baru:</span>
                        <span className="font-mono text-sm font-bold text-emerald-700">Rp 1.650.000</span>
                      </div>
                      <p className="text-[10px] text-emerald-800">
                        ID Pelanggan telah diterbitkan. Silakan lakukan pembayaran agar tim NC dapat menjadwalkan pengecekan & pemasangan meter.
                      </p>
                      <Button
                        size="sm"
                        icon={CreditCard}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => setActivePaymentModal("initial")}
                      >
                        Bayar Sekarang via Portal Platform
                      </Button>
                    </div>
                  )}

                  {/* Interactive Action: Pay Non-Regular Extra Pipe */}
                  {trackedRecord.non_regular_id && trackedRecord.non_regular_payment_status !== "paid" && (
                    <div className="rounded-xl border-2 border-amber-500 bg-amber-50/70 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-950">
                          Tagihan Pipa Non-Reguler ({trackedRecord.extra_pipe_length || 15}m):
                        </span>
                        <span className="font-mono text-sm font-bold text-amber-700">
                          {formatRupiah(trackedRecord.extra_pipe_total_cost || 1200000)}
                        </span>
                      </div>
                      <p className="text-[10px] text-amber-800">
                        ID Non-Reguler {trackedRecord.non_regular_id} telah terbit. Silakan bayar biaya penambahan panjang pipa agar tim NC dapat segera memasang meteran.
                      </p>
                      <Button
                        size="sm"
                        icon={CreditCard}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={() => setActivePaymentModal("non_regular")}
                      >
                        Bayar Pipa Non-Reguler Sekarang
                      </Button>
                    </div>
                  )}

                  {/* Meter Installed Status */}
                  {trackedRecord.installed_at && (
                    <div className="rounded-xl border border-emerald-200 bg-white p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                        <CheckCircle2 size={15} /> Meteran Air Selesai Dipasang!
                      </div>
                      <p className="text-[11px] text-slate-600">
                        No. Seri: <span className="font-mono font-bold">{trackedRecord.meter_serial_number || "MTR-2026-8819"}</span> · Stand Awal: {trackedRecord.initial_stand || "0.00"} m3.
                      </p>
                    </div>
                  )}

                  {/* Public CSAT Feedback if Connected */}
                  {trackedRecord.installed_at && !trackedRecord.customer_rating && !csatSubmitted && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-2">
                      <p className="text-xs font-bold text-amber-900">Beri Rating Kepuasan Layanan Aetra:</p>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setCsatRating(star)}
                            className="p-1 cursor-pointer"
                          >
                            <Star
                              size={22}
                              className={star <= csatRating ? "fill-amber-400 text-amber-400" : "text-slate-300"}
                            />
                          </button>
                        ))}
                      </div>
                      <input
                        value={csatReview}
                        onChange={(e) => setCsatReview(e.target.value)}
                        placeholder="Tuliskan ulasan Anda..."
                        className="w-full rounded-lg border border-amber-200 bg-white p-2 text-xs text-slate-800"
                      />
                      <Button size="xs" onClick={handlePublicCsat} className="bg-amber-600 text-white">
                        Kirim Rating
                      </Button>
                    </div>
                  )}

                  {trackedRecord.customer_rating && (
                    <div className="rounded-xl border border-amber-200 bg-white p-3 text-xs text-slate-700">
                      <span className="font-bold text-amber-700">Rating Anda: {trackedRecord.customer_rating.stars}/5 ⭐</span>
                      <p className="italic mt-1">"{trackedRecord.customer_rating.review}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 4: KOMPLAIN AIR ================= */}
          {mode === "complain" && (
            <div className="mt-6 animate-fade-in">
              {complainSubmitted ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center space-y-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
                    <CheckCircle2 size={26} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{successTitle}</h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">{successDesc}</p>
                    <div className="mt-3 rounded-lg bg-white p-3 border border-emerald-200 text-sm font-mono font-bold text-brand-700 shadow-xs">
                      {successCode}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    className="w-full text-xs"
                    onClick={() => {
                      setComplainSubmitted(false);
                      setComplainForm({
                        name: "",
                        phone: "",
                        customerId: "",
                        zipCode: "15111",
                        address: "",
                        issueType: "Air Tidak Mengalir",
                        issue: "",
                      });
                    }}
                  >
                    Buat Laporan Lain
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCustomerComplain} className="space-y-4 max-h-[62vh] overflow-y-auto pr-1">
                  <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-3 text-[11px] text-brand-800 flex items-start gap-2">
                    <Wrench size={14} className="shrink-0 text-brand-600 mt-0.5" />
                    <span>
                      Laporan gangguan air atau permohonan relokasi meter air langsung diteruskan ke SPV Technical & tim Minor Repair.
                    </span>
                  </div>

                  <Field label="Nama Lengkap Pelapor" required>
                    <Input
                      value={complainForm.name}
                      onChange={(e) => setComplainForm({ ...complainForm, name: e.target.value })}
                      placeholder="Cth: Ibu Siti Aminah"
                      required
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="No. WhatsApp Aktif" required>
                      <Input
                        value={complainForm.phone}
                        onChange={(e) => setComplainForm({ ...complainForm, phone: e.target.value })}
                        placeholder="0812xxxxxxxx"
                        required
                      />
                    </Field>
                    <Field label="ID Pelanggan (Jika Ada)">
                      <Input
                        value={complainForm.customerId}
                        onChange={(e) => setComplainForm({ ...complainForm, customerId: e.target.value })}
                        placeholder="AETRA-XXXXXX"
                      />
                    </Field>
                  </div>

                  <Field label="Jenis Kendala">
                    <Select
                      value={complainForm.issueType}
                      onChange={(e) => setComplainForm({ ...complainForm, issueType: e.target.value })}
                    >
                      <option value="Air Tidak Mengalir">Air Tidak Mengalir / Mati</option>
                      <option value="Pipa Bocor / Rembes">Pipa Bocor / Rembes di Jalan atau Rumah</option>
                      <option value="Tekanan Air Sangat Lemah">Tekanan Air Sangat Lemah</option>
                      <option value="Air Keruh / Berbau">Air Keruh atau Berbau</option>
                      <option value="Meteran Air Rusak / Bocor">Meteran Air Rusak / Bocor</option>
                      <option value="Permohonan Relokasi Meter">Permohonan Relokasi Meter Air</option>
                    </Select>
                  </Field>

                  <Field label="Alamat / Patokan Lokasi Gangguan" required>
                    <textarea
                      value={complainForm.address}
                      onChange={(e) => setComplainForm({ ...complainForm, address: e.target.value })}
                      placeholder="Nama jalan, nomor rumah, RT/RW, dan patokan lokasi kendala"
                      rows={2}
                      className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                      required
                    />
                  </Field>

                  <Field label="Keterangan Rinci Kendala" required>
                    <textarea
                      value={complainForm.issue}
                      onChange={(e) => setComplainForm({ ...complainForm, issue: e.target.value })}
                      placeholder="Jelaskan sejak kapan air mati atau lokasi titik bocor..."
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                      required
                    />
                  </Field>

                  <Button type="submit" className="h-11 w-full mt-2" iconRight={ArrowRight}>
                    Kirim Laporan Gangguan
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Right Column: Hero Matching Reference Image */}
      <section className="hidden bg-[#0b2742] lg:flex lg:flex-col lg:justify-between p-14 text-white relative overflow-hidden">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">
            PT Aetra Air Tangerang
          </p>
          <h2 className="mt-16 text-6xl font-black tracking-tight leading-none text-white">
            Aetra<br />Tangerang<span className="text-brand-400">.</span>
          </h2>
          <p className="mt-8 text-2xl font-semibold text-slate-100">
            Air bersih,<br />kehidupan lebih baik.
          </p>
          <p className="mt-6 text-sm text-slate-300 max-w-sm leading-relaxed">
            Mendekatkan layanan air perpipaan dengan masyarakat. Dari sambungan pertama, untuk setiap kebutuhan pelanggan.
          </p>
        </div>

        <div className="pt-8 text-xs text-slate-400 border-t border-slate-800">
          © 2026 PT Aetra Air Tangerang · Portal Layanan & Staf Terpusat
        </div>
      </section>

      {/* Integrated Payment Modal from Public Tracker */}
      {trackedRecord && (
        <>
          <PaymentModal
            open={activePaymentModal === "initial"}
            onClose={() => setActivePaymentModal(null)}
            invoiceNumber={trackedRecord.customer_number || trackedRecord.ticket_number}
            customerName={trackedRecord.customer_name}
            customerId={trackedRecord.customer_number}
            type="initial"
            amount={1650000}
            details="Biaya Pemasangan Sambungan Air Bersih Standar"
            onSuccess={async (receipt) => {
              await supabase
                .from("registrations")
                .update({
                  initial_payment_status: "paid",
                  initial_paid_at: receipt.paidAt,
                  initial_payment_method: receipt.channel,
                  current_status_id: "00000000-0000-4000-8000-000000000016", // Pemasangan meter
                })
                .eq("id", trackedRecord.id);
              setTrackedRecord({
                ...trackedRecord,
                initial_payment_status: "paid",
                status: "Pemasangan meter",
              });
            }}
          />
          <PaymentModal
            open={activePaymentModal === "non_regular"}
            onClose={() => setActivePaymentModal(null)}
            invoiceNumber={trackedRecord.non_regular_id || `NONREG-${trackedRecord.ticket_number}`}
            customerName={trackedRecord.customer_name}
            customerId={trackedRecord.non_regular_id}
            type="non_regular"
            amount={trackedRecord.extra_pipe_total_cost || 1200000}
            details={`Biaya Penambahan Panjang Pipa Non-Reguler (${trackedRecord.extra_pipe_length || 15} meter)`}
            onSuccess={async (receipt) => {
              await supabase
                .from("registrations")
                .update({
                  non_regular_payment_status: "paid",
                  non_regular_paid_at: receipt.paidAt,
                })
                .eq("id", trackedRecord.id);
              setTrackedRecord({
                ...trackedRecord,
                non_regular_payment_status: "paid",
              });
            }}
          />
        </>
      )}
    </div>
  );
}
