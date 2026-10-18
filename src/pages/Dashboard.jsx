import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  CreditCard,
  Download,
  Droplets,
  Ellipsis,
  FileCheck2,
  FileText,
  HelpCircle,
  MapPin,
  Phone,
  Plus,
  Send,
  ShieldAlert,
  ShieldCheck,
  Star,
  User,
  UserCheck,
  Wrench,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { StatusBadge } from "@/components/common/Badge";
import { EmptyState, ErrorState, Skeleton } from "@/components/common/LoadingSpinner";
import { Reveal, useCountUp } from "@/components/common/Reveal";
import { WaterStatusChart, WaterTrendChart } from "@/components/common/WaterCharts";
import { Modal } from "@/components/common/Modal";
import { Field, Input, Select, Textarea } from "@/components/common/Field";
import { PaymentModal } from "@/components/common/PaymentModal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useWorkflow } from "@/context/WorkflowContext";
import { supabase, parseError, isDemoMode } from "@/lib/supabaseClient";
import { navigate } from "@/lib/router";
import { isActiveConnection } from "@/lib/waterDomain";
import { formatDate, formatDateTime, formatRupiah, hoursBetween, initials, timeAgo, toInputDate } from "@/lib/utils";
import { cn } from "@/utils/cn";

const DAY = 86400000;
const PERIODS = [
  { key: "month", label: "Bulan ini" },
  { key: "previous", label: "Bulan lalu" },
  { key: "week", label: "7 hari terakhir" },
];

const chartGroups = [
  { label: "Verifikasi", color: "#8999DF", match: /terima|verifikasi|menunggu verifikasi/i },
  { label: "Survei jaringan", color: "#49A5D9", match: /survei/i },
  { label: "Pembayaran", color: "#EAC17A", match: /pembayaran/i },
  { label: "Pemasangan", color: "#49BCBE", match: /pemasangan/i },
  { label: "Sambungan aktif", color: "#62BAA3", match: /aktif|disetujui/i },
  { label: "Tidak dilayani", color: "#E8A3A3", match: /ditolak|tidak dapat/i },
];

export function DashboardPage() {
  const {
    can,
    profile,
    profiles,
    roles,
    isAdmin,
    isCS,
    isSpvSales,
    isSpvTech,
    isSales,
    isNC,
    isMinorRepair,
    isCustomer,
  } = useAuth();
  const { statusOf, statusesFor } = useWorkflow();
  const toast = useToast();

  const [data, setData] = useState({ registrations: [], repairs: [], logs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState("month");
  const [granularity, setGranularity] = useState("weekly");
  const [reportOpen, setReportOpen] = useState(false);

  // Load all application data
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reg, repair, activity] = await Promise.all([
        supabase.from("registrations").select("*").order("created_at", { ascending: false }).limit(2000),
        supabase.from("repair_orders").select("*").order("created_at", { ascending: false }).limit(2000),
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(10),
      ]);
      let tidbRegistrations = [];
      try {
        const res = await fetch("/api/registrations");
        if (res.ok) {
          tidbRegistrations = await res.json();
        }
      } catch {
        // fallback to standard store
      }

      const localRegs = reg.data ?? [];
      const combinedRegs = [...localRegs];
      if (Array.isArray(tidbRegistrations)) {
        for (const tr of tidbRegistrations) {
          if (!combinedRegs.some((r) => r.id === tr.id || (tr.ticket_number && r.ticket_number === tr.ticket_number))) {
            combinedRegs.unshift({
              ...tr,
              ticket_number: tr.ticket_number || tr.registration_no || `REG-${tr.id}`,
              customer_name: tr.customer_name || "Pelanggan Baru",
              service_type: tr.service_type || "Rumah tangga",
              address: tr.address || "Kabupaten Tangerang",
              status: tr.status || "Pendaftaran diterima",
              created_at: tr.created_at || new Date().toISOString(),
            });
          }
        }
      }

      setData({
        registrations: combinedRegs,
        repairs: repair.data ?? [],
        logs: activity.data ?? [],
      });
      setError(null);
    } catch (err) {
      setError(err.message);
      toast.error(err.message, { title: "Dasbor tidak dapat dimuat" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // If role is Pelanggan, render the dedicated Customer Portal Dashboard
  if (isCustomer) {
    return <CustomerPortalDashboard registrations={data.registrations} repairs={data.repairs} onRefresh={load} />;
  }

  // If role is Customer Service, render CS Dashboard
  if (isCS) {
    return <CSDashboard registrations={data.registrations} repairs={data.repairs} onRefresh={load} />;
  }

  // If role is SPV Sales, render SPV Sales Dashboard
  if (isSpvSales) {
    return <SpvSalesDashboard registrations={data.registrations} profiles={profiles} roles={roles} onRefresh={load} />;
  }

  // If role is SPV Technical, render SPV Technical Dashboard
  if (isSpvTech) {
    return <SpvTechDashboard repairs={data.repairs} profiles={profiles} roles={roles} onRefresh={load} />;
  }

  // If role is Sales, render Sales Dashboard
  if (isSales) {
    return <SalesDashboard registrations={data.registrations} profile={profile} onRefresh={load} />;
  }

  // If role is NC, render NC Dashboard
  if (isNC) {
    return <NCDashboard registrations={data.registrations} repairs={data.repairs} profile={profile} onRefresh={load} />;
  }

  // If role is Minor Repair, render Minor Repair Dashboard
  if (isMinorRepair) {
    return <MinorRepairDashboard repairs={data.repairs} profile={profile} onRefresh={load} />;
  }

  // Fallback: Admin Aetra Master Dashboard
  return (
    <AdminMasterDashboard
      data={data}
      loading={loading}
      error={error}
      onRetry={load}
      period={period}
      setPeriod={setPeriod}
      granularity={granularity}
      setGranularity={setGranularity}
      reportOpen={reportOpen}
      setReportOpen={setReportOpen}
    />
  );
}

/* =========================================================================
   1. CUSTOMER PORTAL DASHBOARD (Pelanggan)
   ========================================================================= */
function CustomerPortalDashboard({ registrations, repairs, onRefresh }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("sambungan"); // "sambungan" | "komplain" | "tagihan"
  const [paymentModal, setPaymentModal] = useState(null); // { type, record, amount, title }
  const [complainModalOpen, setComplainModalOpen] = useState(false);
  const [complainForm, setComplainForm] = useState({
    issueType: "Air Tidak Mengalir",
    address: "",
    description: "",
  });
  const [complainBusy, setComplainBusy] = useState(false);

  // CSAT Rating State
  const [csatModal, setCsatModal] = useState(null); // target record
  const [csatRating, setCsatRating] = useState(5);
  const [csatReview, setCsatReview] = useState("");
  const [csatBusy, setCsatBusy] = useState(false);

  // Retrieve stored customer identification
  const activeTicket = window.localStorage.getItem("aetra.active_customer_ticket");
  const activeCustName = window.localStorage.getItem("aetra.active_customer_name") || "Bpk/Ibu Pelanggan";
  const activeCustId = window.localStorage.getItem("aetra.active_customer_id") || "PLG-1008";

  // Find the customer's matching registration
  const myReg = useMemo(() => {
    if (activeTicket) {
      const match = registrations.find(
        (r) =>
          r.ticket_number === activeTicket ||
          r.registration_no === activeTicket ||
          r.customer_number === activeCustId
      );
      if (match) return match;
    }
    // Fallback: return the first registration or demo customer
    return (
      registrations.find(
        (r) =>
          r.customer_number === activeCustId ||
          r.customer_name?.toLowerCase().includes("warga") ||
          r.ticket_number?.includes("2026")
      ) || registrations[0]
    );
  }, [registrations, activeTicket, activeCustId]);

  // Find customer's complaints
  const myRepairs = useMemo(() => {
    return repairs.filter(
      (r) =>
        r.customer_number === activeCustId ||
        r.customer_id === activeCustId ||
        (myReg && (r.customer_name === myReg.customer_name || r.ticket_no === myReg.ticket_number))
    );
  }, [repairs, activeCustId, myReg]);

  // Determine stage progression for timeline stepper
  const currentStep = useMemo(() => {
    if (!myReg) return 1;
    const status = String(myReg.status || "").toLowerCase();
    if (/selesai|aktif|terpasang/i.test(status)) return 9;
    if (/pemasangan meter/i.test(status)) return 8;
    if (/lunas non/i.test(status) || myReg.non_regular_payment_status === "paid") return 8;
    if (myReg.non_regular_id && myReg.non_regular_payment_status !== "paid") return 7;
    if (/cek nc|pengecekan/i.test(status) || myReg.nc_category) return 6;
    if (/lunas|sudah bayar/i.test(status) || myReg.initial_payment_status === "paid") return 6;
    if (myReg.customer_number && myReg.customer_number !== myReg.ticket_number) return 5;
    if (/survei/i.test(status) || myReg.survey_result) return 4;
    if (/diteruskan|spv sales/i.test(status)) return 2;
    return 1;
  }, [myReg]);

  // Handle submitting new complaint
  const handleCreateComplain = async (e) => {
    e.preventDefault();
    if (!complainForm.address || !complainForm.description) {
      toast.error("Mohon lengkapi alamat dan keterangan kendala.");
      return;
    }
    setComplainBusy(true);
    try {
      const newTicketNo = `TICK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newRepair = {
        id: `rep_${Date.now()}`,
        ticket_number: newTicketNo,
        ticket_no: newTicketNo,
        title: `${complainForm.issueType} - ${activeCustName}`,
        customer_name: activeCustName,
        phone: myReg?.phone_number || "081234567890",
        customer_number: activeCustId,
        customer_id: activeCustId,
        location_address: complainForm.address,
        address: complainForm.address,
        service_category: complainForm.issueType,
        description: complainForm.description,
        status: "Menunggu CS",
        current_status_id: "00000000-0000-4000-8000-000000000020",
        priority: "Normal",
        created_at: new Date().toISOString(),
      };

      await supabase.from("repair_orders").insert(newRepair);
      toast.success(`Tiket komplain ${newTicketNo} berhasil dikirim ke Customer Service!`);
      setComplainModalOpen(false);
      setComplainForm({ issueType: "Air Tidak Mengalir", address: "", description: "" });
      await onRefresh();
    } catch (err) {
      toast.error(err.message || "Gagal mengirim komplain.");
    } finally {
      setComplainBusy(false);
    }
  };

  // Handle CSAT rating submission
  const handleSubmitCsat = async () => {
    if (!csatModal) return;
    setCsatBusy(true);
    try {
      const rating = {
        stars: csatRating,
        review: csatReview.trim(),
        rated_at: new Date().toISOString(),
        rated_by: activeCustName,
      };
      await supabase
        .from("registrations")
        .update({ customer_rating: rating })
        .eq("id", csatModal.id);

      toast.success("Terima kasih atas penilaian kepuasan Anda!");
      setCsatModal(null);
      await onRefresh();
    } catch (err) {
      toast.error("Gagal mengirim ulasan.");
    } finally {
      setCsatBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Selamat Datang Pelanggan */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#0077bd] to-[#005a91] p-6 text-white shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
              Portal Pelanggan
            </span>
            <span className="text-xs text-sky-100 font-mono font-bold">
              ID Pelanggan: {activeCustId}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            Selamat datang, {activeCustName}
          </h1>
          <p className="mt-1 text-xs text-sky-100">
            Pantau tahapan pemasangan sambungan air baru, tagihan & pembayaran, serta sampaikan kendala layanan air Anda.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="bg-white text-brand-700 hover:bg-sky-50 shadow-xs"
            onClick={() => setComplainModalOpen(true)}
          >
            + Ajukan Komplain / Relokasi
          </Button>
        </div>
      </section>

      {/* Tabs Menu Pelanggan */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("sambungan")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "sambungan"
              ? "bg-brand-600 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Droplets size={14} /> Progres Sambungan Baru
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("komplain")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "komplain"
              ? "bg-brand-600 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Wrench size={14} /> Komplain & Relokasi Meter ({myRepairs.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tagihan")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "tagihan"
              ? "bg-brand-600 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <CreditCard size={14} /> Tagihan & Riwayat Bayar
        </button>
      </div>

      {/* ================= TAB 1: PROGRES SAMBUNGAN BARU ================= */}
      {activeTab === "sambungan" && (
        <div className="space-y-6">
          {myReg ? (
            <>
              {/* Card Ringkasan Permohonan */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400">Nomor Registrasi:</span>
                    <h3 className="text-base font-bold text-slate-800 font-mono">{myReg.ticket_number}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Alamat: {myReg.installation_address || myReg.address}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-brand-700 border border-blue-200">
                      {myReg.status || "Dalam Proses"}
                    </span>
                  </div>
                </div>

                {/* Visual Timeline Stepper 9 Tahap */}
                <div className="mt-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">
                    Tahapan Pemasangan Sambungan Air (Diperbarui CS):
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { step: 1, title: "1. Pendaftaran Berhasil", desc: "Formulir masuk ke CS", done: currentStep >= 1 },
                      { step: 2, title: "2. Verifikasi CS", desc: "Diteruskan ke SPV Sales", done: currentStep >= 2 },
                      { step: 3, title: "3. Survei Lapangan Sales", desc: "Cek kelayakan pipa & lokasi", done: currentStep >= 3 },
                      { step: 4, title: "4. Penerbitan ID Pelanggan", desc: "CS menerbitkan ID untuk bayar", done: currentStep >= 4 },
                      { step: 5, title: "5. Pembayaran Pasang Baru", desc: "Biaya sambungan standar", done: currentStep >= 5 },
                      { step: 6, title: "6. Pengecekan Lokasi NC", desc: "Reguler atau Non-Reguler", done: currentStep >= 6 },
                      { step: 7, title: "7. Bayar Pipa Non-Reguler", desc: "Biaya penambahan pipa (jika ada)", done: currentStep >= 7 },
                      { step: 8, title: "8. Pemasangan Meteran NC", desc: "Teknisi memasang meter air", done: currentStep >= 8 },
                      { step: 9, title: "9. Sambungan Air Aktif", desc: "Air mengalir & siap pakai!", done: currentStep >= 9 },
                    ].map((item) => (
                      <div
                        key={item.step}
                        className={`rounded-lg p-3 border transition-all ${
                          item.done
                            ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {item.done ? (
                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border border-slate-300 shrink-0" />
                          )}
                          <span className="text-xs font-bold">{item.title}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500 pl-6">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Box Aksi Pembayaran yang Diarahkan CS */}
                <div className="mt-6 border-t border-slate-100 pt-5 space-y-4">
                  {/* Kasus 1: CS sudah menerbitkan ID Pelanggan untuk Pembayaran Sambungan Baru */}
                  {myReg.customer_number && myReg.customer_number !== myReg.ticket_number && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-brand-600 text-white px-2 py-0.5 text-[10px] font-bold">
                            TAGIHAN PASANG BARU
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            ID Pembayaran: <span className="font-mono text-brand-700">{myReg.customer_number}</span>
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          Biaya Sambungan Standar Rumah Tangga: <strong>Rp 1.650.000</strong>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Status Pembayaran:{" "}
                          <strong className={myReg.initial_payment_status === "paid" ? "text-emerald-600" : "text-amber-600"}>
                            {myReg.initial_payment_status === "paid" ? "LUNAS (Terverifikasi CS)" : "MENUNGGU PEMBAYARAN"}
                          </strong>
                        </p>
                      </div>
                      {myReg.initial_payment_status !== "paid" ? (
                        <Button
                          className="text-xs h-9"
                          onClick={() =>
                            setPaymentModal({
                              type: "initial",
                              record: myReg,
                              amount: 1650000,
                              title: "Biaya Sambungan Air Standar",
                            })
                          }
                        >
                          Bayar Sekarang &rarr;
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg">
                          <CheckCircle2 size={15} /> Sudah Dibayar
                        </span>
                      )}
                    </div>
                  )}

                  {/* Kasus 2: CS menerbitkan ID Non-Reguler (Pipa Tambahan) */}
                  {myReg.non_regular_id && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-amber-600 text-white px-2 py-0.5 text-[10px] font-bold">
                            TAGIHAN PIPA NON-REGULER
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            ID Non-Reguler: <span className="font-mono text-amber-800">{myReg.non_regular_id}</span>
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          Penambahan Pipa {myReg.extra_pipe_length || 15} meter:{" "}
                          <strong>Rp {Number(myReg.extra_pipe_total_cost || 1200000).toLocaleString("id-ID")}</strong>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Status:{" "}
                          <strong className={myReg.non_regular_payment_status === "paid" ? "text-emerald-600" : "text-amber-600"}>
                            {myReg.non_regular_payment_status === "paid" ? "LUNAS" : "MENUNGGU PEMBAYARAN"}
                          </strong>
                        </p>
                      </div>
                      {myReg.non_regular_payment_status !== "paid" ? (
                        <Button
                          variant="secondary"
                          className="text-xs h-9 border-amber-300 text-amber-800 bg-white hover:bg-amber-100"
                          onClick={() =>
                            setPaymentModal({
                              type: "non_regular",
                              record: myReg,
                              amount: myReg.extra_pipe_total_cost || 1200000,
                              title: `Penambahan Pipa Non-Reguler (${myReg.extra_pipe_length || 15}m)`,
                            })
                          }
                        >
                          Bayar Penambahan Pipa &rarr;
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg">
                          <CheckCircle2 size={15} /> Sudah Dibayar
                        </span>
                      )}
                    </div>
                  )}

                  {/* Kasus 3: Jika belum terbit ID Pelanggan dari CS */}
                  {(!myReg.customer_number || myReg.customer_number === myReg.ticket_number) && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 flex items-center gap-3">
                      <Clock3 className="text-slate-400 shrink-0" size={20} />
                      <div>
                        <p className="font-semibold text-slate-800">Menunggu CS Menerbitkan ID Pelanggan</p>
                        <p className="text-[11px] text-slate-500">
                          Setelah hasil survei lokasi oleh petugas Sales diverifikasi dan disetujui, Customer Service akan menerbitkan ID Pelanggan dan petunjuk pembayaran akan otomatis muncul di sini.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Rating CSAT jika pemasangan selesai */}
                {currentStep >= 8 && (
                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Star size={16} className="text-amber-500 fill-amber-500" /> Wajib Rating & Kepuasan Pelanggan (CSAT)
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          {myReg.customer_rating
                            ? `Anda telah memberikan nilai ${myReg.customer_rating.stars} Bintang: "${myReg.customer_rating.review}"`
                            : "Meteran air telah terpasang. Mohon berikan penilaian atas pelayanan tim Aetra."}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => setCsatModal(myReg)}
                      >
                        {myReg.customer_rating ? "Ubah Rating CSAT" : "Isi Rating & Kepuasan"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <Droplets className="mx-auto text-brand-500" size={32} />
              <h3 className="mt-2 text-sm font-bold text-slate-800">Belum Ada Permohonan Aktif</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Silakan hubungi Customer Service atau daftar sambungan baru lewat menu utama.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: KOMPLAIN & RELOKASI ================= */}
      {activeTab === "komplain" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Daftar Tiket Gangguan / Relokasi Meter</h3>
              <p className="text-xs text-slate-500">Seluruh laporan komplain diteruskan CS ke SPV Technical & teknisi terkait.</p>
            </div>
            <Button size="sm" onClick={() => setComplainModalOpen(true)}>
              + Buat Laporan Baru
            </Button>
          </div>

          {myRepairs.length ? (
            <div className="space-y-3">
              {myRepairs.map((rep) => (
                <div key={rep.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-brand-700">{rep.ticket_number || rep.ticket_no}</span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {rep.service_category || "Perbaikan Air"}
                        </span>
                      </div>
                      <h4 className="mt-1 text-sm font-bold text-slate-800">{rep.title}</h4>
                      <p className="text-xs text-slate-500">{rep.location_address || rep.address}</p>
                    </div>
                    <div>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-brand-700 border border-blue-200">
                        {rep.status || "Dalam Penanganan"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-600">
                    <p className="font-medium text-slate-700">Keterangan:</p>
                    <p className="mt-0.5 text-slate-500">{rep.description}</p>
                  </div>
                  {rep.relocation_billing_id && (
                    <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900 flex items-center justify-between">
                      <div>
                        <span className="font-bold">Tagihan Relokasi Meter:</span> ID {rep.relocation_billing_id} (Rp {Number(rep.relocation_amount || 0).toLocaleString("id-ID")})
                      </div>
                      <span className="font-bold text-amber-700">{rep.relocation_payment_status || "Menunggu Pembayaran"}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <Wrench className="mx-auto text-slate-400" size={30} />
              <p className="mt-2 text-xs text-slate-500">Tidak ada komplain atau keluhan aktif saat ini.</p>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: TAGIHAN & RIWAYAT BAYAR ================= */}
      {activeTab === "tagihan" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Rincian Tagihan & Riwayat Pembayaran Anda</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                <div>
                  <p className="text-xs font-bold text-slate-800">Biaya Sambungan Air Baru</p>
                  <p className="text-[11px] text-slate-400">Paket Standar Rumah Tangga</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-800">Rp 1.650.000</p>
                  <span className={`text-[10px] font-bold ${myReg?.initial_payment_status === "paid" ? "text-emerald-600" : "text-amber-600"}`}>
                    {myReg?.initial_payment_status === "paid" ? "Lunas" : "Belum Bayar"}
                  </span>
                </div>
              </div>

              {myReg?.non_regular_id && (
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Penambahan Pipa Non-Reguler</p>
                    <p className="text-[11px] text-slate-400">Panjang {myReg.extra_pipe_length || 15} meter</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800">Rp {Number(myReg.extra_pipe_total_cost || 1200000).toLocaleString("id-ID")}</p>
                    <span className={`text-[10px] font-bold ${myReg?.non_regular_payment_status === "paid" ? "text-emerald-600" : "text-amber-600"}`}>
                      {myReg?.non_regular_payment_status === "paid" ? "Lunas" : "Belum Bayar"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Buat Komplain Baru */}
      <Modal
        open={complainModalOpen}
        onClose={() => setComplainModalOpen(false)}
        title="Ajukan Komplain / Relokasi Meter"
        subtitle="Laporan Anda akan diteruskan oleh CS ke SPV Technical untuk ditindaklanjuti."
        icon={Wrench}
        size="md"
      >
        <form onSubmit={handleCreateComplain} className="space-y-3.5">
          <Field label="Jenis Kendala / Permohonan" required>
            <Select
              value={complainForm.issueType}
              onChange={(e) => setComplainForm({ ...complainForm, issueType: e.target.value })}
            >
              <option value="Air Tidak Mengalir">Air Tidak Mengalir / Mati</option>
              <option value="Pipa Bocor / Rembes">Pipa Bocor atau Rembes</option>
              <option value="Tekanan Air Sangat Lemah">Tekanan Air Lemah</option>
              <option value="Air Keruh / Berbau">Air Keruh atau Berbau</option>
              <option value="Meteran Air Rusak">Meteran Air Rusak / Tidak Berputar</option>
              <option value="Permohonan Relokasi Meter">Permohonan Relokasi Titik Meteran Air</option>
            </Select>
          </Field>
          <Field label="Alamat Titik Lokasi Kendala" required>
            <Input
              value={complainForm.address}
              onChange={(e) => setComplainForm({ ...complainForm, address: e.target.value })}
              placeholder="Contoh: Jl. Merdeka No. 12, RT 02/05"
              required
            />
          </Field>
          <Field label="Penjelasan Lengkap Kendala" required>
            <textarea
              value={complainForm.description}
              onChange={(e) => setComplainForm({ ...complainForm, description: e.target.value })}
              placeholder="Jelaskan detail sejak kapan gangguan terjadi atau alasan relokasi..."
              rows={3}
              className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
              required
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setComplainModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={complainBusy}>
              Kirim Komplain
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Rating CSAT */}
      <Modal
        open={Boolean(csatModal)}
        onClose={() => setCsatModal(null)}
        title="Form Kepuasan Pelanggan (CSAT)"
        subtitle="Berikan penilaian atas pelayanan pemasangan dan teknisi kami."
        icon={Star}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">Rating Bintang (1 - 5):</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setCsatRating(star)}
                  className="cursor-pointer transition-transform hover:scale-110"
                >
                  <Star
                    size={28}
                    className={star <= csatRating ? "text-amber-400 fill-amber-400" : "text-slate-300"}
                  />
                </button>
              ))}
            </div>
          </div>
          <Field label="Ulasan & Komentar Kepuasan">
            <textarea
              value={csatReview}
              onChange={(e) => setCsatReview(e.target.value)}
              placeholder="Contoh: Pelayanan ramah, meteran air terpasang rapi dan aliran air kencang..."
              rows={3}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCsatModal(null)}>
              Tutup
            </Button>
            <Button loading={csatBusy} onClick={handleSubmitCsat}>
              Simpan Rating CSAT
            </Button>
          </div>
        </div>
      </Modal>

      {/* Integrated Payment Modal */}
      {paymentModal && (
        <PaymentModal
          open={Boolean(paymentModal)}
          onClose={() => setPaymentModal(null)}
          invoiceNumber={paymentModal.record.customer_number || paymentModal.record.ticket_number}
          customerName={paymentModal.record.customer_name}
          customerId={paymentModal.record.customer_number}
          type={paymentModal.type}
          amount={paymentModal.amount}
          details={paymentModal.title}
          onSuccess={async () => {
            if (paymentModal.type === "initial") {
              await supabase
                .from("registrations")
                .update({
                  initial_payment_status: "paid",
                  initial_paid_at: new Date().toISOString(),
                  status: "Pembayaran Lunas (Teruskan ke NC)",
                  current_status_id: "00000000-0000-4000-8000-000000000016",
                })
                .eq("id", paymentModal.record.id);
            } else {
              await supabase
                .from("registrations")
                .update({
                  non_regular_payment_status: "paid",
                  non_regular_paid_at: new Date().toISOString(),
                  status: "Penambahan Pipa Lunas (Pemasangan NC)",
                })
                .eq("id", paymentModal.record.id);
            }
            toast.success("Pembayaran berhasil dikonfirmasi!");
            setPaymentModal(null);
            await onRefresh();
          }}
        />
      )}
    </div>
  );
}

/* =========================================================================
   2. CUSTOMER SERVICE (CS) DASHBOARD
   ========================================================================= */
function CSDashboard({ registrations, repairs, onRefresh }) {
  const toast = useToast();
  const [csInputId, setCsInputId] = useState({});
  const [busyId, setBusyId] = useState(null);

  // Filter 1: Siap Diterbitkan ID Pelanggan untuk Pembayaran (Survei Sales selesai & disetujui)
  const readyForCustId = useMemo(() => {
    return registrations.filter(
      (r) =>
        (!r.customer_number || r.customer_number === r.ticket_number) &&
        (r.survey_result || /survei selesai|siap bayar|terbit id/i.test(r.status || ""))
    );
  }, [registrations]);

  // Filter 2: Konfirmasi NC Pipa Tambahan (Siap Diterbitkan ID Non-Reguler)
  const readyForNonRegId = useMemo(() => {
    return registrations.filter(
      (r) =>
        r.nc_category === "non-regular" &&
        !r.non_regular_id &&
        r.extra_pipe_length > 0
    );
  }, [registrations]);

  // Filter 3: Komplain Masuk Baru yang Perlu Diteruskan ke SPV Technical
  const pendingComplaints = useMemo(() => {
    return repairs.filter(
      (rep) =>
        !rep.forwarded_to_spv &&
        (/menunggu cs|baru|terbuka/i.test(rep.status || ""))
    );
  }, [repairs]);

  // Handle CS issuing Customer ID for payment
  const handleIssueCustomerId = async (record) => {
    const custId = (csInputId[record.id] || "").trim().toUpperCase();
    if (!custId) {
      toast.error("Masukkan ID Pelanggan dari sistem billing untuk pendaftaran ini.");
      return;
    }
    setBusyId(record.id);
    try {
      await supabase
        .from("registrations")
        .update({
          customer_number: custId,
          status: "Menunggu Pembayaran Pelanggan",
          current_status_id: "00000000-0000-4000-8000-000000000014",
          updated_at: new Date().toISOString(),
        })
        .eq("id", record.id);

      toast.success(`ID Pelanggan ${custId} berhasil diterbitkan! Tagihan dibuka di portal pelanggan.`);
      setCsInputId({ ...csInputId, [record.id]: "" });
      await onRefresh();
    } catch (err) {
      toast.error(err.message || "Gagal menerbitkan ID Pelanggan.");
    } finally {
      setBusyId(null);
    }
  };

  // Handle CS issuing Non-Regular ID
  const handleIssueNonRegId = async (record) => {
    const nonRegId = (csInputId[`nonreg_${record.id}`] || `NONREG-${record.ticket_number}`).trim().toUpperCase();
    setBusyId(record.id);
    try {
      await supabase
        .from("registrations")
        .update({
          non_regular_id: nonRegId,
          non_regular_payment_status: "Menunggu Pembayaran",
          status: "ID Non-Reguler Diterbitkan (Menunggu Bayar Pipa)",
          updated_at: new Date().toISOString(),
        })
        .eq("id", record.id);

      toast.success(`ID Non-Reguler ${nonRegId} berhasil diterbitkan dan dikirim ke pelanggan!`);
      await onRefresh();
    } catch (err) {
      toast.error("Gagal menerbitkan ID Non-Reguler.");
    } finally {
      setBusyId(null);
    }
  };

  // Handle CS forwarding complaint to SPV Technical
  const handleForwardComplaint = async (repair) => {
    setBusyId(repair.id);
    try {
      await supabase
        .from("repair_orders")
        .update({
          forwarded_to_spv: true,
          status: "Diteruskan ke SPV Technical",
          current_status_id: "00000000-0000-4000-8000-000000000020",
          updated_at: new Date().toISOString(),
        })
        .eq("id", repair.id);

      toast.success(`Tiket komplain ${repair.ticket_number} berhasil diteruskan ke SPV Technical!`);
      await onRefresh();
    } catch (err) {
      toast.error("Gagal meneruskan komplain.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header CS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="rounded-md bg-blue-100 text-brand-700 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
            Divisi Customer Service (CS)
          </span>
          <h1 className="mt-1 text-2xl font-bold text-slate-800 tracking-tight">
            Pusat Pelayanan & Penerbitan ID Pelanggan
          </h1>
          <p className="text-xs text-slate-500">
            Pintu masuk permohonan baru, penerbitan ID pembayaran pelanggan, dan disposisi komplain ke SPV Technical.
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/registrations?new=1")}>
          + Pendaftaran Pelanggan Walk-In
        </Button>
      </div>

      {/* Metrik CS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs text-slate-400 font-semibold">Total Pendaftaran</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{registrations.length}</p>
          <span className="text-[10px] text-brand-600 font-medium">Masuk ke CS</span>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-xs">
          <p className="text-xs text-amber-700 font-semibold">Siap Terbit ID Pelanggan</p>
          <p className="mt-1 text-2xl font-bold text-amber-900">{readyForCustId.length}</p>
          <span className="text-[10px] text-amber-700 font-medium">Survei Sales selesai</span>
        </div>
        <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4 shadow-xs">
          <p className="text-xs text-purple-700 font-semibold">Siap ID Non-Reguler</p>
          <p className="mt-1 text-2xl font-bold text-purple-900">{readyForNonRegId.length}</p>
          <span className="text-[10px] text-purple-700 font-medium">Perlu pipa tambahan NC</span>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 shadow-xs">
          <p className="text-xs text-brand-700 font-semibold">Komplain Menunggu CS</p>
          <p className="mt-1 text-2xl font-bold text-brand-900">{pendingComplaints.length}</p>
          <span className="text-[10px] text-brand-600 font-medium">Teruskan ke SPV Tech</span>
        </div>
      </div>

      {/* Bagian 1: Tabel Siap Diterbitkan ID Pelanggan untuk Pembayaran */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              1. Survei Selesai Disetujui — Input & Terbitkan ID Pelanggan untuk Pembayaran
            </h3>
            <p className="text-[11px] text-slate-500">
              Input ID Pelanggan dari sistem billing terpisah agar pelanggan dapat membayar biaya sambungan baru di portal mereka.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-bold">
            {readyForCustId.length} Berkas
          </span>
        </div>

        {readyForCustId.length ? (
          <div className="space-y-3">
            {readyForCustId.map((record) => (
              <div key={record.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-700">{record.ticket_number}</span>
                    <span className="text-xs font-bold text-slate-800">{record.customer_name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{record.installation_address || record.address}</p>
                  <p className="text-[10px] text-emerald-700 mt-0.5 font-medium">
                    ✓ Survei Sales: {record.survey_result?.notes || "Jaringan pipa tersedia, siap dipasang."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Input ID Pelanggan (e.g. CUST-901)"
                    value={csInputId[record.id] || ""}
                    onChange={(e) => setCsInputId({ ...csInputId, [record.id]: e.target.value.toUpperCase() })}
                    className="w-48 text-xs font-mono font-bold uppercase text-brand-700 bg-white"
                  />
                  <Button
                    size="sm"
                    loading={busyId === record.id}
                    onClick={() => handleIssueCustomerId(record)}
                  >
                    Terbitkan ID & Buka Bayar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">
            Tidak ada permohonan yang menunggu penerbitan ID Pelanggan saat ini.
          </p>
        )}
      </div>

      {/* Bagian 2: Tabel Penerbitan ID Non-Reguler (Pipa Tambahan) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              2. Konfirmasi NC (Pipa Tambahan) — Terbitkan ID Non-Reguler
            </h3>
            <p className="text-[11px] text-slate-500">
              Tim NC mengonfirmasi adanya penambahan pipa. Terbitkan ID Non-Reguler agar pelanggan membayar selisih biaya penambahan pipa.
            </p>
          </div>
          <span className="rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 text-xs font-bold">
            {readyForNonRegId.length} Berkas
          </span>
        </div>

        {readyForNonRegId.length ? (
          <div className="space-y-3">
            {readyForNonRegId.map((record) => (
              <div key={record.id} className="rounded-lg border border-purple-200 bg-purple-50/50 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-purple-700">{record.ticket_number}</span>
                    <span className="text-xs font-bold text-slate-800">{record.customer_name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tambahan Pipa: <strong>{record.extra_pipe_length} meter</strong> (Estimasi Rp {Number(record.extra_pipe_total_cost || 1200000).toLocaleString("id-ID")})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Input ID Non-Reguler"
                    value={csInputId[`nonreg_${record.id}`] || `NONREG-${record.ticket_number}`}
                    onChange={(e) => setCsInputId({ ...csInputId, [`nonreg_${record.id}`]: e.target.value.toUpperCase() })}
                    className="w-48 text-xs font-mono font-bold uppercase text-purple-700 bg-white"
                  />
                  <Button
                    size="sm"
                    loading={busyId === record.id}
                    onClick={() => handleIssueNonRegId(record)}
                  >
                    Terbitkan ID Non-Reguler
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">
            Tidak ada permohonan non-reguler yang menunggu tindakan.
          </p>
        )}
      </div>

      {/* Bagian 3: Tabel Komplain Masuk dari Pelanggan */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              3. Komplain Pelanggan Masuk — Teruskan ke SPV Technical
            </h3>
            <p className="text-[11px] text-slate-500">
              Teruskan keluhan atau permohonan relokasi meter ke SPV Technical untuk disposisi ke tim lapangan.
            </p>
          </div>
          <span className="rounded-full bg-blue-100 text-brand-800 px-2 py-0.5 text-xs font-bold">
            {pendingComplaints.length} Komplain
          </span>
        </div>

        {pendingComplaints.length ? (
          <div className="space-y-3">
            {pendingComplaints.map((rep) => (
              <div key={rep.id} className="rounded-lg border border-slate-200 bg-white p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-700">{rep.ticket_number || rep.ticket_no}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      {rep.service_category}
                    </span>
                  </div>
                  <h4 className="mt-1 text-xs font-bold text-slate-800">{rep.title}</h4>
                  <p className="text-[11px] text-slate-500">{rep.description}</p>
                </div>
                <div>
                  <Button
                    size="sm"
                    loading={busyId === rep.id}
                    onClick={() => handleForwardComplaint(rep)}
                  >
                    Teruskan ke SPV Technical &rarr;
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">
            Semua komplain telah berhasil diteruskan ke SPV Technical.
          </p>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   3. SPV SALES DASHBOARD
   ========================================================================= */
function SpvSalesDashboard({ registrations, profiles, roles, onRefresh }) {
  const toast = useToast();
  const [assigneeMap, setAssigneeMap] = useState({});
  const [busyId, setBusyId] = useState(null);

  // Sales team members
  const salesStaff = useMemo(() => {
    return (profiles ?? []).filter((p) => {
      const r = roles.find((role) => role.id === p.role_id)?.role_name || "";
      return /sales/i.test(r) && !/spv/i.test(r);
    });
  }, [profiles, roles]);

  // Tasks needing assignment from SPV Sales
  const unassignedTasks = useMemo(() => {
    return registrations.filter(
      (r) =>
        !r.assigned_sales_id &&
        (/diteruskan ke spv sales|butuh survei|menunggu sales/i.test(r.status || ""))
    );
  }, [registrations]);

  // Tasks rejected by Sales (needs re-delegation!)
  const rejectedTasks = useMemo(() => {
    return registrations.filter(
      (r) => r.sales_rejected || /ditolak sales|re-delegasi sales/i.test(r.status || "")
    );
  }, [registrations]);

  const handleDelegateSales = async (record) => {
    const targetSalesId = assigneeMap[record.id];
    if (!targetSalesId) {
      toast.error("Pilih staf Sales untuk mendelegasikan tugas.");
      return;
    }
    const salesUser = salesStaff.find((s) => s.id === targetSalesId);
    setBusyId(record.id);
    try {
      await supabase
        .from("registrations")
        .update({
          assigned_sales_id: targetSalesId,
          assigned_sales_name: salesUser?.full_name || "Petugas Sales",
          status: `Ditugaskan ke Sales (${salesUser?.full_name})`,
          sales_rejected: false,
          rejection_reason: null,
          current_status_id: "00000000-0000-4000-8000-000000000012",
          updated_at: new Date().toISOString(),
        })
        .eq("id", record.id);

      toast.success(`Tugas survei berhasil didelegasikan ke ${salesUser?.full_name}!`);
      await onRefresh();
    } catch (err) {
      toast.error("Gagal mendelegasikan tugas.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="rounded-md bg-purple-100 text-purple-700 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
          Divisi Supervisor Sales (SPV Sales)
        </span>
        <h1 className="mt-1 text-2xl font-bold text-slate-800 tracking-tight">
          Manajemen & Disposisi Penugasan Sales Lapangan
        </h1>
        <p className="text-xs text-slate-500">
          Menerima permohonan dari CS, mendelegasikan tugas survei lokasi ke Sales, dan menangani tugas penolakan.
        </p>
      </div>

      {/* Alert Tugas DITOLAK oleh Sales */}
      {rejectedTasks.length > 0 && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
            <ShieldAlert size={18} /> Notifikasi: Tugas Survei Ditolak oleh Sales ({rejectedTasks.length})
          </div>
          <p className="text-xs text-rose-700">
            Staf Sales menolak tugas survei dengan mengisi form alasan. Mohon delegasikan ulang ke anggota Sales lain.
          </p>
          <div className="space-y-2">
            {rejectedTasks.map((task) => (
              <div key={task.id} className="rounded-lg bg-white border border-rose-200 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-rose-700">{task.ticket_number}</span>
                    <span className="text-xs font-bold text-slate-800">{task.customer_name}</span>
                  </div>
                  <p className="text-[11px] text-rose-600 mt-1 font-semibold">
                    Alasan Penolakan: "{task.rejection_reason || "Lokasi di luar jangkauan wilayah sales"}"
                  </p>
                  <p className="text-[10px] text-slate-400">Ditolak oleh: {task.rejected_by_name || "Sales Lapangan"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={assigneeMap[task.id] || ""}
                    onChange={(e) => setAssigneeMap({ ...assigneeMap, [task.id]: e.target.value })}
                    className="text-xs w-48"
                  >
                    <option value="">— Pilih Sales Baru —</option>
                    {salesStaff.map((s) => (
                      <option key={s.id} value={s.id}>{s.full_name}</option>
                    ))}
                  </Select>
                  <Button
                    size="sm"
                    loading={busyId === task.id}
                    onClick={() => handleDelegateSales(task)}
                  >
                    Delegasikan Ulang
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabel Tugas Baru dari CS */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          Permohonan Masuk dari CS (Menunggu Penugasan Sales)
        </h3>
        {unassignedTasks.length ? (
          <div className="space-y-3">
            {unassignedTasks.map((rec) => (
              <div key={rec.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-700">{rec.ticket_number}</span>
                    <span className="text-xs font-bold text-slate-800">{rec.customer_name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{rec.installation_address || rec.address}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={assigneeMap[rec.id] || ""}
                    onChange={(e) => setAssigneeMap({ ...assigneeMap, [rec.id]: e.target.value })}
                    className="text-xs w-48"
                  >
                    <option value="">— Pilih Staf Sales —</option>
                    {salesStaff.map((s) => (
                      <option key={s.id} value={s.id}>{s.full_name}</option>
                    ))}
                  </Select>
                  <Button
                    size="sm"
                    loading={busyId === rec.id}
                    onClick={() => handleDelegateSales(rec)}
                  >
                    Tugaskan Sales
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">
            Semua tugas survei telah didelegasikan ke staf Sales.
          </p>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   4. SPV TECHNICAL DASHBOARD
   ========================================================================= */
function SpvTechDashboard({ repairs, profiles, roles, onRefresh }) {
  const toast = useToast();
  const [busyId, setBusyId] = useState(null);

  // Komplain ditolak oleh teknisi
  const rejectedRepairs = useMemo(() => {
    return repairs.filter((r) => r.tech_rejected);
  }, [repairs]);

  // Komplain dari CS yang butuh disposisi ke NC atau Minor Repair
  const pendingRepairs = useMemo(() => {
    return repairs.filter(
      (r) =>
        !r.assigned_to &&
        !r.tech_rejected &&
        /diteruskan ke spv technical|menunggu spv/i.test(r.status || "")
    );
  }, [repairs]);

  const handleDelegateTech = async (repair, division) => {
    setBusyId(repair.id);
    try {
      await supabase
        .from("repair_orders")
        .update({
          assigned_division: division, // "NC" or "Minor Repair"
          tech_rejected: false,
          rejection_reason: null,
          status: `Didelegasikan ke Tim ${division}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", repair.id);

      toast.success(`Tiket komplain berhasil didelegasikan ke tim ${division}!`);
      await onRefresh();
    } catch (err) {
      toast.error("Gagal mendelegasikan tugas.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="rounded-md bg-teal-100 text-teal-800 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
          Divisi Supervisor Teknik (SPV Technical)
        </span>
        <h1 className="mt-1 text-2xl font-bold text-slate-800 tracking-tight">
          Disposisi Komplain & Penugasan Teknisi Lapangan
        </h1>
        <p className="text-xs text-slate-500">
          Menerima komplain & permohonan relokasi dari CS, mendelegasikan ke tim NC atau Minor Repair.
        </p>
      </div>

      {/* Alert Tugas DITOLAK Teknisi */}
      {rejectedRepairs.length > 0 && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
            <ShieldAlert size={18} /> Notifikasi: Tugas Perbaikan Ditolak Teknisi ({rejectedRepairs.length})
          </div>
          <div className="space-y-2">
            {rejectedRepairs.map((rep) => (
              <div key={rep.id} className="rounded-lg bg-white border border-rose-200 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-rose-700">{rep.ticket_number}</span>
                    <span className="text-xs font-bold text-slate-800">{rep.title}</span>
                  </div>
                  <p className="text-[11px] text-rose-600 mt-1 font-semibold">
                    Alasan Penolakan: "{rep.rejection_reason || "Teknisi berhalangan / butuh tim khusus"}"
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    loading={busyId === rep.id}
                    onClick={() => handleDelegateTech(rep, "NC (New Connection)")}
                  >
                    Alihkan ke NC
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busyId === rep.id}
                    onClick={() => handleDelegateTech(rep, "Minor Repair")}
                  >
                    Alihkan ke Minor Repair
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Antrean Disposisi dari CS */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          Komplain Masuk dari CS (Pilih Tim Teknisi)
        </h3>
        {pendingRepairs.length ? (
          <div className="space-y-3">
            {pendingRepairs.map((rep) => (
              <div key={rep.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-700">{rep.ticket_number}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      {rep.service_category}
                    </span>
                  </div>
                  <h4 className="mt-1 text-xs font-bold text-slate-800">{rep.title}</h4>
                  <p className="text-[11px] text-slate-500">{rep.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    loading={busyId === rep.id}
                    onClick={() => handleDelegateTech(rep, "Minor Repair")}
                  >
                    Disposisi ke Minor Repair
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busyId === rep.id}
                    onClick={() => handleDelegateTech(rep, "NC (New Connection)")}
                  >
                    Disposisi ke NC
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">
            Semua komplain telah selesai didisposisikan.
          </p>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   5. SALES DASHBOARD (Petugas Sales Lapangan)
   ========================================================================= */
function SalesDashboard({ registrations, profile, onRefresh }) {
  const toast = useToast();
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [surveyModal, setSurveyModal] = useState(null);
  const [surveyForm, setSurveyForm] = useState({
    distance: "5",
    pipeDiameter: "63 mm (2 inci)",
    notes: "Pipa utama tersedia, siap dipasang meteran.",
  });
  const [busy, setBusy] = useState(false);

  // My assigned tasks
  const myTasks = useMemo(() => {
    return registrations.filter(
      (r) =>
        r.assigned_sales_id === profile?.id ||
        (profile?.sales_code && r.sales_code === profile.sales_code) ||
        !r.assigned_sales_id // demo fallback
    );
  }, [registrations, profile]);

  const handleAccept = async (rec) => {
    setBusy(true);
    try {
      await supabase
        .from("registrations")
        .update({
          sales_accepted: true,
          sales_rejected: false,
          status: "Survei Diterima Sales (Sedang Lapangan)",
          updated_at: new Date().toISOString(),
        })
        .eq("id", rec.id);

      toast.success("Tugas survei diterima! Silakan isi formulir hasil survei.");
      await onRefresh();
    } catch (err) {
      toast.error("Gagal menerima tugas.");
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Wajib mengisi form alasan penolakan tugas.");
      return;
    }
    setBusy(true);
    try {
      await supabase
        .from("registrations")
        .update({
          sales_rejected: true,
          sales_accepted: false,
          rejection_reason: rejectReason.trim(),
          rejected_by_name: profile?.full_name || "Sales",
          assigned_sales_id: null,
          status: "Ditolak Sales (Menunggu Re-delegasi SPV)",
          updated_at: new Date().toISOString(),
        })
        .eq("id", rejectModal.id);

      toast.warning("Tugas telah ditolak. Notifikasi terkirim ke SPV Sales.");
      setRejectModal(null);
      setRejectReason("");
      await onRefresh();
    } catch (err) {
      toast.error("Gagal menolak tugas.");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSurvey = async () => {
    setBusy(true);
    try {
      await supabase
        .from("registrations")
        .update({
          survey_result: {
            distance: surveyForm.distance,
            pipeDiameter: surveyForm.pipeDiameter,
            notes: surveyForm.notes,
            surveyor: profile?.full_name || "Petugas Sales",
            surveyed_at: new Date().toISOString(),
          },
          status: "Survei Selesai (Menunggu Terbit ID oleh CS)",
          current_status_id: "00000000-0000-4000-8000-000000000013",
          updated_at: new Date().toISOString(),
        })
        .eq("id", surveyModal.id);

      toast.success("Form survei lapangan tersimpan! Data telah diterima oleh Customer Service.");
      setSurveyModal(null);
      await onRefresh();
    } catch (err) {
      toast.error("Gagal menyimpan survei.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
            Divisi Sales Lapangan
          </span>
          <h1 className="mt-1 text-2xl font-bold text-slate-800 tracking-tight">
            Tugas Survei Lokasi Pemasangan Air
          </h1>
          <p className="text-xs text-slate-500">
            Terima atau tolak tugas survei lapangan, lalu isi formulir hasil survei jaringan pipa.
          </p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-2 text-right">
          <p className="text-[10px] text-slate-500 font-semibold uppercase">Kode Akun Sales Anda:</p>
          <p className="font-mono text-base font-bold text-brand-700">{profile?.sales_code || "SLS-SARAH"}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          Daftar Tugas Survei Masuk
        </h3>
        {myTasks.length ? (
          <div className="space-y-3">
            {myTasks.map((task) => (
              <div key={task.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-700">{task.ticket_number}</span>
                    <span className="text-xs font-bold text-slate-800">{task.customer_name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{task.installation_address || task.address}</p>
                  <p className="text-[10px] text-brand-600 mt-1">Status: {task.status || "Menunggu Respon Sales"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!task.sales_accepted && (
                    <>
                      <Button size="sm" onClick={() => handleAccept(task)}>
                        Terima Tugas
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setRejectModal(task)}>
                        Tolak Tugas
                      </Button>
                    </>
                  )}
                  {task.sales_accepted && !task.survey_result && (
                    <Button size="sm" onClick={() => setSurveyModal(task)}>
                      Isi Form Survei Lapangan &rarr;
                    </Button>
                  )}
                  {task.survey_result && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg">
                      ✓ Survei Selesai (Diterima CS)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">Tidak ada tugas survei masuk saat ini.</p>
        )}
      </div>

      {/* Modal Tolak Tugas (Wajib Alasan) */}
      <Modal
        open={Boolean(rejectModal)}
        onClose={() => setRejectModal(null)}
        title="Form Penolakan Tugas Survei"
        subtitle="Wajib mengisi alasan penolakan. Notifikasi akan diteruskan ke SPV Sales."
        icon={XCircle}
        size="sm"
      >
        <div className="space-y-3">
          <Field label="Alasan Penolakan Tugas" required>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Contoh: Lokasi di luar jangkauan wilayah survei saya / Jadwal bentrok..."
              rows={3}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800"
              required
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejectModal(null)}>Batal</Button>
            <Button loading={busy} onClick={handleReject}>Kirim Penolakan</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Isi Form Survei */}
      <Modal
        open={Boolean(surveyModal)}
        onClose={() => setSurveyModal(null)}
        title="Form Hasil Survei Lapangan"
        subtitle="Data akan langsung masuk ke CS untuk penerbitan ID Pelanggan."
        icon={FileText}
        size="md"
      >
        <div className="space-y-3">
          <Field label="Perkiraan Jarak Pipa ke Lokasi (Meter)" required>
            <Input
              value={surveyForm.distance}
              onChange={(e) => setSurveyForm({ ...surveyForm, distance: e.target.value })}
              type="number"
            />
          </Field>
          <Field label="Diameter Pipa Utama">
            <Input
              value={surveyForm.pipeDiameter}
              onChange={(e) => setSurveyForm({ ...surveyForm, pipeDiameter: e.target.value })}
            />
          </Field>
          <Field label="Catatan Kelayakan Pemasangan" required>
            <textarea
              value={surveyForm.notes}
              onChange={(e) => setSurveyForm({ ...surveyForm, notes: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSurveyModal(null)}>Batal</Button>
            <Button loading={busy} onClick={handleSaveSurvey}>Kirim Hasil Survei ke CS</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* =========================================================================
   6. NC (NEW CONNECTION) DASHBOARD
   ========================================================================= */
function NCDashboard({ registrations, repairs, profile, onRefresh }) {
  const toast = useToast();
  const [ncConfirmModal, setNcConfirmModal] = useState(null);
  const [ncCategory, setNcCategory] = useState("regular");
  const [extraLength, setExtraLength] = useState(15);
  const [completeModal, setCompleteModal] = useState(null);
  const [meterNo, setMeterNo] = useState("");
  const [busy, setBusy] = useState(false);

  // NC tasks: paid registrations ready for installation
  const ncTasks = useMemo(() => {
    return registrations.filter(
      (r) =>
        r.initial_payment_status === "paid" ||
        /pemasangan|tim nc|lunas/i.test(r.status || "")
    );
  }, [registrations]);

  const handleConfirmNC = async () => {
    setBusy(true);
    try {
      const isReg = ncCategory === "regular";
      await supabase
        .from("registrations")
        .update({
          nc_category: ncCategory,
          extra_pipe_length: isReg ? 0 : Number(extraLength),
          extra_pipe_total_cost: isReg ? 0 : Number(extraLength) * 80000,
          status: isReg ? "Pipa Reguler (Siap Pasang Meter)" : "Pipa Non-Reguler (Menunggu ID CS)",
          updated_at: new Date().toISOString(),
        })
        .eq("id", ncConfirmModal.id);

      toast.success(
        isReg
          ? "Lokasi dikonfirmasi REGULER. Meteran siap dipasang!"
          : "Lokasi dikonfirmasi NON-REGULER. CS telah diberi tahu untuk menerbitkan ID Non-Reguler!"
      );
      setNcConfirmModal(null);
      await onRefresh();
    } catch (err) {
      toast.error("Gagal menyimpan konfirmasi.");
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteNC = async () => {
    if (!meterNo.trim()) {
      toast.error("Masukkan nomor seri meteran air yang terpasang.");
      return;
    }
    setBusy(true);
    try {
      await supabase
        .from("registrations")
        .update({
          meter_serial_number: meterNo.trim(),
          installed_at: new Date().toISOString(),
          status: "Meteran Terpasang (Sambungan Aktif)",
          current_status_id: "00000000-0000-4000-8000-000000000017",
          updated_at: new Date().toISOString(),
        })
        .eq("id", completeModal.id);

      toast.success("Pemasangan meteran air selesai! Sambungan kini AKTIF.");
      setCompleteModal(null);
      setMeterNo("");
      await onRefresh();
    } catch (err) {
      toast.error("Gagal menyelesaikan pekerjaan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
          Divisi NC (New Connection)
        </span>
        <h1 className="mt-1 text-2xl font-bold text-slate-800 tracking-tight">
          Pemasangan Sambungan Baru & Relokasi Meter
        </h1>
        <p className="text-xs text-slate-500">
          Cek lokasi (Reguler vs Non-Reguler), konfirmasi kebutuhan penambahan pipa ke CS, dan pasang meter air.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          Antrean Pemasangan Meter Sambungan Baru
        </h3>
        {ncTasks.length ? (
          <div className="space-y-3">
            {ncTasks.map((t) => (
              <div key={t.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-700">{t.ticket_number}</span>
                    <span className="text-xs font-bold text-slate-800">{t.customer_name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{t.installation_address || t.address}</p>
                  <p className="text-[10px] text-emerald-700 mt-1">Status: {t.status}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!t.nc_category && (
                    <Button size="sm" onClick={() => setNcConfirmModal(t)}>
                      Cek Lokasi: Reguler / Non-Reguler &rarr;
                    </Button>
                  )}
                  {t.nc_category === "non-regular" && !t.non_regular_id && (
                    <span className="text-xs text-amber-700 bg-amber-100 px-3 py-1 rounded-lg font-medium">
                      Menunggu CS Terbitkan ID Non-Reguler
                    </span>
                  )}
                  {(t.nc_category === "regular" || t.non_regular_payment_status === "paid") && !t.meter_serial_number && (
                    <Button size="sm" onClick={() => { setCompleteModal(t); setMeterNo(`MTR-${Math.floor(100000 + Math.random() * 900000)}`); }}>
                      Form Selesai Pemasangan Meter &rarr;
                    </Button>
                  )}
                  {t.meter_serial_number && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg">
                      ✓ Meteran Terpasang ({t.meter_serial_number})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">Tidak ada tugas pemasangan meter saat ini.</p>
        )}
      </div>

      {/* Modal Konfirmasi NC ke CS */}
      <Modal
        open={Boolean(ncConfirmModal)}
        onClose={() => setNcConfirmModal(null)}
        title="Form Konfirmasi NC ke CS"
        subtitle="Tentukan apakah pemasangan reguler atau perlu pipa tambahan (Non-Reguler)."
        icon={Wrench}
        size="md"
      >
        <div className="space-y-4">
          <Field label="Kategori Pemasangan" required>
            <Select value={ncCategory} onChange={(e) => setNcCategory(e.target.value)}>
              <option value="regular">Reguler (Pipa &lt;= 6 meter, langsung bisa pasang meter)</option>
              <option value="non-regular">Non-Reguler (Perlu penambahan pipa & bayar selisih)</option>
            </Select>
          </Field>
          {ncCategory === "non-regular" && (
            <Field label="Panjang Pipa Tambahan (Meter)" required hint="Biaya standar Rp 80.000/meter">
              <Input
                type="number"
                value={extraLength}
                onChange={(e) => setExtraLength(e.target.value)}
              />
              <p className="text-xs font-bold text-amber-800 mt-1">
                Estimasi Total Biaya Tambahan: Rp {(Number(extraLength) * 80000).toLocaleString("id-ID")}
              </p>
            </Field>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setNcConfirmModal(null)}>Batal</Button>
            <Button loading={busy} onClick={handleConfirmNC}>Kirim Konfirmasi ke CS</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Selesai Pasang Meter */}
      <Modal
        open={Boolean(completeModal)}
        onClose={() => setCompleteModal(null)}
        title="Form Selesai Pengerjaan Meteran"
        subtitle="Input data meteran air resmi yang telah terpasang di lokasi pelanggan."
        icon={CheckCircle2}
        size="sm"
      >
        <div className="space-y-3">
          <Field label="Nomor Seri Meteran Air" required>
            <Input value={meterNo} onChange={(e) => setMeterNo(e.target.value)} placeholder="Contoh: MTR-982103" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCompleteModal(null)}>Batal</Button>
            <Button loading={busy} onClick={handleCompleteNC}>Selesaikan & Aktifkan Sambungan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* =========================================================================
   7. MINOR REPAIR DASHBOARD
   ========================================================================= */
function MinorRepairDashboard({ repairs, profile, onRefresh }) {
  const toast = useToast();
  const [completeModal, setCompleteModal] = useState(null);
  const [materials, setMaterials] = useState("Pipa PVC 1/2 inch (2 batang), Seal Tape (3 pcs), Kran 1/2 inch (1 unit)");
  const [actionDesc, setActionDesc] = useState("Pipa rembes diganti dengan pipa baru, kebocoran teratasi.");
  const [busy, setBusy] = useState(false);

  const myRepairs = useMemo(() => {
    return repairs.filter(
      (r) =>
        r.assigned_division === "Minor Repair" ||
        /minor repair|bocor|gangguan/i.test(r.title || "")
    );
  }, [repairs]);

  const handleFinishRepair = async () => {
    if (!materials.trim()) {
      toast.error("Wajib mengisi form pelaporan material yang digunakan.");
      return;
    }
    setBusy(true);
    try {
      await supabase
        .from("repair_orders")
        .update({
          materials_used: materials.trim(),
          action_taken: actionDesc.trim(),
          resolved_at: new Date().toISOString(),
          status: "Selesai Dikerjakan",
          current_status_id: "00000000-0000-4000-8000-000000000024",
          updated_at: new Date().toISOString(),
        })
        .eq("id", completeModal.id);

      toast.success("Laporan pekerjaan & material tersimpan! Tiket komplain selesai.");
      setCompleteModal(null);
      await onRefresh();
    } catch (err) {
      toast.error("Gagal menyelesaikan pekerjaan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="rounded-md bg-blue-100 text-brand-700 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
          Divisi Minor Repair
        </span>
        <h1 className="mt-1 text-2xl font-bold text-slate-800 tracking-tight">
          Perbaikan Kerusakan & Pelaporan Material
        </h1>
        <p className="text-xs text-slate-500">
          Terima tugas perbaikan pipa/gangguan air dari SPV Technical dan wajib melaporkan material yang digunakan.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          Daftar Tugas Perbaikan Gangguan Air
        </h3>
        {myRepairs.length ? (
          <div className="space-y-3">
            {myRepairs.map((rep) => (
              <div key={rep.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-700">{rep.ticket_number}</span>
                    <span className="text-xs font-bold text-slate-800">{rep.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{rep.location_address || rep.address}</p>
                  <p className="text-[10px] text-slate-600 mt-1">Status: {rep.status}</p>
                </div>
                <div>
                  {rep.status !== "Selesai Dikerjakan" ? (
                    <Button size="sm" onClick={() => setCompleteModal(rep)}>
                      Isi Laporan & Material Digunakan &rarr;
                    </Button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg">
                      ✓ Selesai Dikerjakan
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">Tidak ada tugas perbaikan aktif saat ini.</p>
        )}
      </div>

      {/* Modal Laporan Pengerjaan & Material Digunakan */}
      <Modal
        open={Boolean(completeModal)}
        onClose={() => setCompleteModal(null)}
        title="Form Laporan Pekerjaan & Pelaporan Material"
        subtitle="Minor Repair wajib melaporkan tiap pekerjaan beserta rincian material yang digunakan."
        icon={Wrench}
        size="md"
      >
        <div className="space-y-3">
          <Field label="Tindakan / Hasil Perbaikan Lapangan" required>
            <textarea
              value={actionDesc}
              onChange={(e) => setActionDesc(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800"
              required
            />
          </Field>
          <Field label="Material yang Digunakan (Wajib Lapor)" required hint="Tulis nama material, jumlah, dan satuan">
            <textarea
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800"
              required
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCompleteModal(null)}>Batal</Button>
            <Button loading={busy} onClick={handleFinishRepair}>Simpan Laporan & Selesaikan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* =========================================================================
   8. ADMIN AETRA MASTER DASHBOARD (Admin Pusat)
   ========================================================================= */
function AdminMasterDashboard({
  data,
  loading,
  error,
  onRetry,
  period,
  setPeriod,
  granularity,
  setGranularity,
  reportOpen,
  setReportOpen,
}) {
  const { profile } = useAuth();
  const { statusOf } = useWorkflow();
  const toast = useToast();

  const range = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === "previous") {
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
        end: start.getTime(),
        label: new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        }),
      };
    }
    if (period === "week") return { start: Date.now() - 7 * DAY, end: Date.now() + 1, label: "7 hari terakhir" };
    return {
      start: start.getTime(),
      end: Date.now() + 1,
      label: now.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
    };
  }, [period]);

  const registrations = useMemo(
    () =>
      data.registrations.filter((record) => {
        const at = new Date(record.created_at).getTime();
        return at >= range.start && at < range.end;
      }),
    [data.registrations, range]
  );

  const metrics = useMemo(() => {
    const previousStart =
      period === "week"
        ? range.start - 7 * DAY
        : new Date(new Date(range.start).getFullYear(), new Date(range.start).getMonth() - 1, 1).getTime();
    const prior = data.registrations.filter(
      (r) => new Date(r.created_at).getTime() >= previousStart && new Date(r.created_at).getTime() < range.start
    ).length;
    const pending = registrations.filter((r) =>
      /terima|verifikasi/i.test(statusOf(r.current_status_id)?.status_name ?? "")
    );
    const active = registrations.filter((r) => isActiveConnection(statusOf(r.current_status_id)));
    const repairs = data.repairs.filter((r) => !statusOf(r.current_status_id)?.is_final && !r.resolved_at);
    return {
      total: registrations.length,
      growth: prior ? ((registrations.length - prior) / prior) * 100 : null,
      pending: pending.length,
      active: active.length,
      repairs: repairs.length,
    };
  }, [registrations, data, period, range, statusOf]);

  const distribution = useMemo(
    () =>
      chartGroups.map((group) => ({
        ...group,
        count: registrations.filter((r) => group.match.test(statusOf(r.current_status_id)?.status_name ?? "")).length,
      })),
    [registrations, statusOf]
  );

  const chart = useMemo(() => {
    const span = granularity === "weekly" ? 7 * DAY : DAY;
    const count = granularity === "weekly" ? 8 : 14;
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return Array.from({ length: count }, (_, index) => {
      const from = end.getTime() - (count - index) * span;
      const to = from + span;
      const records = data.registrations.filter(
        (r) => new Date(r.created_at).getTime() > from && new Date(r.created_at).getTime() <= to
      );
      return {
        label: new Date(to).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        registrations: records.length,
        connections: records.filter((r) => isActiveConnection(statusOf(r.current_status_id))).length,
      };
    });
  }, [data.registrations, granularity, statusOf]);

  const exportReport = () => {
    try {
      const csv = [
        "Nomor pendaftaran,Nama pelanggan,Kelompok,Status,Tanggal",
        ...registrations.map((r) =>
          [r.ticket_number, r.customer_name, r.service_type, r.status || "Aktif", formatDate(r.created_at)]
            .map((c) => `"${String(c ?? "").replaceAll('"', '""')}"`)
            .join(",")
        ),
      ].join("\n");
      const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-aetra-${toInputDate(new Date())}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Laporan CSV berhasil diunduh.");
      setReportOpen(false);
    } catch {
      toast.error("Gagal mengunduh laporan.");
    }
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <span className="rounded-md bg-slate-200 text-slate-800 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
            Admin Aetra · Akses Penuh
          </span>
          <h1 className="mt-1 text-[25px] font-semibold leading-tight tracking-[-0.9px] text-[#223951]">
            Dasbor Utama & Manajemen Terpusat
          </h1>
          <p className="text-[12.5px] text-[#8a97a8]">
            Pantau seluruh metrik operasional divisi, alur kerja, pengguna, dan formulir aplikasi.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <label className="relative flex h-[38px] items-center rounded-lg border border-[#e1e8ef] bg-white px-3 text-[12.5px] text-[#62738a]">
            <CalendarDays size={14} className="mr-2 text-slate-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="cursor-pointer appearance-none bg-transparent pr-5 outline-none"
            >
              {PERIODS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-3 text-slate-400" />
          </label>
          <Button size="sm" onClick={() => setReportOpen(true)}>
            Unduh CSV
          </Button>
        </div>
      </section>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        <Metric label="Total Pendaftaran" value={metrics.total} icon={ClipboardList} color="blue" loading={loading} onClick={() => navigate("/registrations")} />
        <Metric label="Menunggu Verifikasi" value={metrics.pending} icon={FileCheck2} color="amber" loading={loading} onClick={() => navigate("/registrations")} />
        <Metric label="Sambungan Aktif" value={metrics.active} icon={Droplets} color="teal" loading={loading} onClick={() => navigate("/registrations")} />
        <Metric label="Perbaikan / Komplain" value={metrics.repairs} icon={Wrench} color="purple" loading={loading} onClick={() => navigate("/repairs")} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 xl:grid-cols-[1.72fr_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800">Tren Pendaftaran Air</h2>
            <div className="flex rounded-md bg-slate-100 p-0.5 text-xs">
              {["weekly", "daily"].map((k) => (
                <button
                  key={k}
                  onClick={() => setGranularity(k)}
                  className={`px-2.5 py-1 rounded capitalize ${granularity === k ? "bg-white font-bold text-brand-700 shadow-xs" : "text-slate-500"}`}
                >
                  {k === "weekly" ? "Mingguan" : "Harian"}
                </button>
              ))}
            </div>
          </div>
          <div className="h-48">
            <WaterTrendChart
              labels={chart.map((c) => c.label)}
              registrations={chart.map((c) => c.registrations)}
              connections={chart.map((c) => c.connections)}
            />
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Distribusi Status Layanan</h2>
          <WaterStatusChart items={distribution} total={metrics.total} />
        </section>
      </div>

      {/* Pratinjau Tabel Pendaftaran & Tiket Terbaru */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pratinjau Pendaftaran Terbaru */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-brand-600" /> Pratinjau Pendaftaran Masuk
              </h2>
              <p className="text-[11.5px] text-slate-500">Berkas pendaftaran sambungan air terbaru</p>
            </div>
            <Button size="xs" variant="ghost" onClick={() => navigate("/registrations")} className="text-brand-600">
              Lihat Semua &rarr;
            </Button>
          </div>
          {data.registrations?.length ? (
            <div className="divide-y divide-slate-100">
              {data.registrations.slice(0, 5).map((reg) => (
                <div
                  key={reg.id}
                  onClick={() => navigate(`/registrations/${reg.id}`)}
                  className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">
                        {reg.ticket_number || reg.registration_no}
                      </span>
                      <p className="text-xs font-semibold text-slate-800 truncate">{reg.customer_name}</p>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{reg.address || reg.district || "Kabupaten Tangerang"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {reg.status || "Diterima"}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(reg.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              <ClipboardList className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              Belum ada berkas pendaftaran yang masuk.
              <div className="mt-2">
                <Button size="xs" onClick={() => navigate("/registrations")}>Buka Form Pendaftaran</Button>
              </div>
            </div>
          )}
        </section>

        {/* Pratinjau Tiket Perbaikan Air */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-amber-600" /> Pratinjau Tiket Gangguan & Perbaikan
              </h2>
              <p className="text-[11.5px] text-slate-500">Antrean pekerjaan teknis perpipaan & SLA</p>
            </div>
            <Button size="xs" variant="ghost" onClick={() => navigate("/repairs")} className="text-brand-600">
              Lihat Semua &rarr;
            </Button>
          </div>
          {data.repairs?.length ? (
            <div className="divide-y divide-slate-100">
              {data.repairs.slice(0, 5).map((repair) => (
                <div
                  key={repair.id}
                  onClick={() => navigate("/repairs")}
                  className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {repair.ticket_number || repair.ticket_no}
                      </span>
                      <p className="text-xs font-semibold text-slate-800 truncate">{repair.title || repair.issue_description}</p>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{repair.location_address || repair.assigned_division || "Area Tangerang"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={cn(
                      "inline-block text-[10px] font-bold px-2 py-0.5 rounded-full",
                      repair.priority === "Urgent" ? "bg-rose-100 text-rose-700" :
                      repair.priority === "High" ? "bg-amber-100 text-amber-700" :
                      "bg-blue-100 text-blue-700"
                    )}>
                      {repair.priority || "Medium"}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(repair.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              <Wrench className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              Tidak ada tiket komplain aktif.
              <div className="mt-2">
                <Button size="xs" variant="secondary" onClick={() => navigate("/repairs")}>Buka Papan Repair</Button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Banner Realtime TiDB */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <p className="text-xs font-bold text-emerald-900">Database TiDB MySQL Terhubung & Aktif Realtime</p>
            <p className="text-[11px] text-emerald-700">Cluster: gateway01.ap-southeast-1.prod.aws.tidbcloud.com (Port 4000)</p>
          </div>
        </div>
        <Button size="xs" variant="secondary" onClick={() => navigate("/settings")} className="self-start sm:self-auto">
          Lihat Konfigurasi Database &rarr;
        </Button>
      </div>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Laporan Layanan Air" size="sm">
        <p className="text-xs text-slate-600 mb-4">Unduh seluruh berkas pendaftaran dan penanganan komplain dalam format CSV.</p>
        <Button className="w-full" onClick={exportReport}>Unduh CSV Sekarang</Button>
      </Modal>
    </div>
  );
}

function Metric({ label, value, icon: Icon, color, loading, onClick }) {
  const tones = {
    blue: "bg-[#eaf5fc] text-[#4e98c2]",
    amber: "bg-[#fff6e9] text-[#d2ad72]",
    teal: "bg-[#eaf7f3] text-[#71b39c]",
    purple: "bg-[#f2effb] text-[#a294cd]",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-brand-300 hover:shadow-xs"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <span className={cn("grid h-7 w-7 place-items-center rounded-lg", tones[color])}>
          <Icon size={14} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-800 tabular-nums">
        {loading ? "..." : value}
      </p>
    </button>
  );
}

export default DashboardPage;
