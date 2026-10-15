import { useCallback, useMemo, useState, useEffect } from "react";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  MapPin,
  Printer,
  Save,
  ShieldCheck,
  UserCheck,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Wrench,
  Gauge,
  Sparkles,
  Send,
  Star,
  DollarSign,
  Camera,
  Info,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card, CardBody, CardHeader } from "@/components/common/Card";
import { Badge, StatusBadge } from "@/components/common/Badge";
import { Field, Input, Select, Textarea } from "@/components/common/Field";
import { EmptyState, ErrorState, LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Modal } from "@/components/common/Modal";
import { Reveal } from "@/components/common/Reveal";
import { Timeline } from "@/components/common/Timeline";
import { BrandWordmark } from "@/components/common/BrandMark";
import { PaymentModal } from "@/components/common/PaymentModal";
import { DynamicFormRenderer } from "@/components/common/DynamicFormRenderer";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";
import { useToast } from "@/context/ToastContext";
import { useWorkflow } from "@/context/WorkflowContext";
import { useRegistrationDetail } from "@/hooks/useRegistrations";
import { formatDate, formatDateTime, formatRupiah } from "@/lib/utils";
import { getFormSchema } from "@/lib/formManagement";
import { updateRegistration, updateRegistrationStatus } from "@/lib/api/registrations";
import { cn } from "@/utils/cn";
import { isActiveConnection } from "@/lib/waterDomain";

export function RegistrationDetailPage({ id, onBack }) {
  const { can, isAdmin, userId, profile, profiles, roles } = useAuth();
  const { settings } = useBranding();
  const { statusesFor, statusOf, canMoveTo } = useWorkflow();
  const toast = useToast();
  const { record, history, loading, error, reload } = useRegistrationDetail(id);

  const [saving, setSaving] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // "reject_sales" | "delegate_sales" | "survey" | "issue_customer_id" | "pay_initial" | "nc_check" | "issue_nonreg_id" | "pay_nonreg" | "nc_complete" | "csat"
  
  // Sales Delegation State (SPV Sales)
  const [selectedSalesId, setSelectedSalesId] = useState("");
  const [delegationNotes, setDelegationNotes] = useState("");

  // Sales Rejection State
  const [rejectionReason, setRejectionReason] = useState("");

  // Sales Survey Form State
  const [surveyData, setSurveyData] = useState({
    eligibility: "Layak Pasang (Jaringan Tersedia)",
    distance: "5",
    waterPressure: "1.6",
    groundCondition: "Tanah Biasa",
    pipeDiameter: "63 mm (2 inci)",
    notes: "Jaringan pipa utama tersedia di depan lokasi, tekanan stabil, siap dipasang.",
    sitePhoto: "",
  });

  // Customer ID Issuance State (CS)
  const [issuedCustomerId, setIssuedCustomerId] = useState("");
  const [initialAmount, setInitialAmount] = useState(1650000);

  // NC Check State (NC)
  const [ncCategory, setNcCategory] = useState("regular"); // "regular" | "non-regular"
  const [extraPipeLength, setExtraPipeLength] = useState(15);
  const [pipeCostPerMeter, setPipeCostPerMeter] = useState(80000);
  const [ncNotes, setNcNotes] = useState("");

  // Non-Regular ID State (CS)
  const [issuedNonRegId, setIssuedNonRegId] = useState("");

  // NC Completion Form State (NC)
  const [ncCompletionData, setNcCompletionData] = useState({
    meterNo: `MTR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    initialStand: "0.00",
    meterDiameter: "15 mm (1/2 inci)",
    meterBrand: "Itron",
    installerName: "Joko Susilo (Tim NC)",
    notes: "Pemasangan meteran air selesai, segel resmi terpasang, pengujian aliran air lancar.",
    photoUrl: "",
  });

  // CSAT Rating State
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingReview, setRatingReview] = useState("Pelayanan sangat cepat, ramah, dan pemasangan rapi.");

  // Manual status override state
  const [manualTargetId, setManualTargetId] = useState("");
  const [manualNote, setManualNote] = useState("");

  const canUpdate = can("pendaftaran", "update") || isAdmin;
  const statuses = statusesFor("REGISTRATION");
  const peopleMap = useMemo(() => new Map((profiles ?? []).map((p) => [String(p.id), p.full_name])), [profiles]);

  // Sales staff list
  const salesStaff = useMemo(() => {
    return (profiles ?? []).filter((p) => {
      const r = roles.find((role) => role.id === p.role_id)?.role_name || "";
      return /sales/i.test(r) && !/spv/i.test(r);
    });
  }, [profiles, roles]);

  const currentStatus = statusOf(record?.current_status_id);

  // Current active role determination
  const userRoleName = roles.find((r) => r.id === profile?.role_id)?.role_name || (isAdmin ? "Admin Aetra" : "");
  const isSales = /sales/i.test(userRoleName) && !/spv/i.test(userRoleName);
  const isSpvSales = /spv sales/i.test(userRoleName);
  const isCS = /customer service/i.test(userRoleName);
  const isNC = /nc|new connection/i.test(userRoleName);
  const isCustomer = /pelanggan/i.test(userRoleName);

  // Load custom form schemas from Form Management
  const surveyCustomSchema = useMemo(() => getFormSchema("survey"), []);
  const ncCheckCustomSchema = useMemo(() => getFormSchema("nc_check"), []);
  const ncCompleteCustomSchema = useMemo(() => getFormSchema("nc_completion"), []);

  useEffect(() => {
    if (record) {
      if (!issuedCustomerId) {
        setIssuedCustomerId(record.customer_number || `AETRA-${Math.floor(100000 + Math.random() * 900000)}`);
      }
      if (!issuedNonRegId) {
        setIssuedNonRegId(record.non_regular_id || `NONREG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      }
      if (record.survey_result) {
        setSurveyData((prev) => ({ ...prev, ...record.survey_result }));
      }
      if (record.nc_completion) {
        setNcCompletionData((prev) => ({ ...prev, ...record.nc_completion }));
      }
      if (salesStaff.length > 0 && !selectedSalesId) {
        setSelectedSalesId(salesStaff[0].id);
      }
    }
  }, [record, issuedCustomerId, issuedNonRegId, salesStaff, selectedSalesId]);

  // Stepper representation
  const steps = useMemo(() => {
    if (!record) return [];
    const visited = new Map(history.map((h) => [String(h.to_status_id), h]));
    const terminal = statuses.find((status) => status.id === record.current_status_id);
    const rejected = /ditolak|tidak dapat/i.test(terminal?.status_name ?? "");
    const path = statuses.filter((status) => (rejected ? visited.has(String(status.id)) : !/ditolak|tidak dapat/i.test(status.status_name)));
    return path.map((status) => {
      const entry = visited.get(String(status.id));
      const state = status.id === record.current_status_id ? (terminal?.is_final ? "done" : "current") : entry ? "done" : "pending";
      return {
        key: status.id,
        status,
        state,
        note: entry?.note ?? (state === "pending" ? `Menunggu penyelesaian tahap ${status.status_name.toLowerCase()}.` : null),
        actorName: entry?.changed_by ? peopleMap.get(String(entry.changed_by)) ?? "Petugas Portal" : null,
        at: entry?.created_at ?? null,
      };
    });
  }, [history, peopleMap, record, statuses]);

  // 0. ACTION: CS Konfirmasi dan Teruskan Berkas ke SPV Sales (Alur 1 tanpa kode sales & Alur 2 walk-in)
  const handleForwardToSpvSales = async () => {
    setSaving(true);
    try {
      const spvStatus = statuses.find((s) => /spv sales/i.test(s.status_name)) || statuses[1];
      await updateRegistration(record.id, {
        forwarded_to_spv: true,
        forwarded_to_spv_at: new Date().toISOString(),
        forwarded_by_cs: profile?.full_name || "Customer Service",
      });
      await updateRegistrationStatus(record, spvStatus, `Berkas diverifikasi CS (${profile?.full_name || "Customer Service"}) dan diteruskan ke SPV Sales untuk penugasan survei lokasi.`, {
        userId,
        actorName: profile?.full_name,
      });
      await reload();
      toast.success("Berkas terkonfirmasi dan berhasil diteruskan ke SPV Sales!");
    } catch (err) {
      toast.error(err.message || "Gagal meneruskan ke SPV Sales.");
    } finally {
      setSaving(false);
    }
  };

  // 1. ACTION: SPV Sales mendelegasikan ke Sales
  const handleDelegateSales = async () => {
    if (!selectedSalesId) {
      toast.warning("Pilih staf Sales yang akan ditugaskan.");
      return;
    }
    const salesPerson = profiles.find((p) => p.id === selectedSalesId);
    setSaving(true);
    try {
      const surveyStatus = statuses.find((s) => /survei/i.test(s.status_name)) || statuses[2];
      await updateRegistration(record.id, {
        assigned_sales_id: selectedSalesId,
        assigned_sales_name: salesPerson?.full_name || "Sales Staf",
        sales_rejected: false,
        sales_rejection_reason: null,
      });
      await updateRegistrationStatus(record, surveyStatus, `Tugas didelegasikan kepada ${salesPerson?.full_name}. ${delegationNotes}`.trim(), {
        userId,
        actorName: profile?.full_name,
      });
      setActiveModal(null);
      await reload();
      toast.success(`Tugas survei didelegasikan ke ${salesPerson?.full_name}.`);
    } catch (err) {
      toast.error(err.message || "Gagal mendelegasikan tugas.");
    } finally {
      setSaving(false);
    }
  };

  // 2. ACTION: Sales Menolak Tugas
  const handleRejectTask = async () => {
    if (!rejectionReason.trim()) {
      toast.warning("Wajib mengisi alasan penolakan tugas.");
      return;
    }
    setSaving(true);
    try {
      const spvStatus = statuses.find((s) => /spv sales/i.test(s.status_name)) || statuses[1];
      await updateRegistration(record.id, {
        sales_rejected: true,
        sales_rejection_reason: rejectionReason.trim(),
        sales_rejected_by: profile?.full_name || "Sales",
        sales_rejected_at: new Date().toISOString(),
      });
      await updateRegistrationStatus(record, spvStatus, `Tugas ditolak oleh ${profile?.full_name}. Alasan: ${rejectionReason}`, {
        userId,
        actorName: profile?.full_name,
      });
      setActiveModal(null);
      setRejectionReason("");
      await reload();
      toast.info("Penolakan tugas terkirim kembali ke SPV Sales untuk delegasi ulang.");
    } catch (err) {
      toast.error(err.message || "Gagal menolak tugas.");
    } finally {
      setSaving(false);
    }
  };

  // 3. ACTION: Sales Kirim Hasil Form Survei ke CS
  const handleSubmitSurvey = async () => {
    setSaving(true);
    try {
      const paymentStatus = statuses.find((s) => /pembayaran/i.test(s.status_name)) || statuses[3];
      await updateRegistration(record.id, {
        survey_result: surveyData,
        surveyed_by: profile?.full_name || "Sales",
        surveyed_at: new Date().toISOString(),
      });
      await updateRegistrationStatus(record, paymentStatus, `Survei lokasi selesai oleh ${profile?.full_name}. Hasil: ${surveyData.eligibility}. Jarak pipa: ${surveyData.distance} meter.`, {
        userId,
        actorName: profile?.full_name,
      });
      setActiveModal(null);
      await reload();
      toast.success("Hasil survei berhasil dikirim ke Customer Service!");
    } catch (err) {
      toast.error(err.message || "Gagal mengirim hasil survei.");
    } finally {
      setSaving(false);
    }
  };

  // 4. ACTION: CS Terbitkan ID Pelanggan
  const handleIssueCustomerId = async () => {
    if (!issuedCustomerId.trim()) {
      toast.warning("Nomor ID Pelanggan wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      await updateRegistration(record.id, {
        customer_number: issuedCustomerId.trim(),
        initial_payment_amount: initialAmount,
        initial_payment_status: "pending",
        id_issued_at: new Date().toISOString(),
      });
      setActiveModal(null);
      await reload();
      toast.success(`ID Pelanggan ${issuedCustomerId} berhasil diterbitkan! Tagihan siap dibayar.`);
    } catch (err) {
      toast.error(err.message || "Gagal menerbitkan ID Pelanggan.");
    } finally {
      setSaving(false);
    }
  };

  // 5. ACTION: Konfirmasi Pembayaran Pertama Lunas (dan teruskan ke NC)
  const handleInitialPaymentSuccess = async (receipt) => {
    try {
      const ncStatus = statuses.find((s) => /pemasangan|nc/i.test(s.status_name)) || statuses[4];
      await updateRegistration(record.id, {
        initial_payment_status: "paid",
        initial_paid_at: receipt.paidAt,
        initial_payment_method: receipt.channel,
        initial_payment_trx: receipt.transactionId,
      });
      await updateRegistrationStatus(record, ncStatus, `Pembayaran pertama lunas Rp ${receipt.total.toLocaleString("id-ID")}. Diteruskan ke Tim NC untuk pengecekan lokasi.`, {
        userId,
        actorName: profile?.full_name,
      });
      setActiveModal(null);
      await reload();
      toast.success("Pembayaran sambungan baru lunas! Berkas diteruskan ke Tim NC.");
    } catch (err) {
      toast.error(err.message || "Gagal memperbarui status pembayaran.");
    }
  };

  // 6. ACTION: Tim NC Pengecekan Lokasi (Reguler vs Non-Reguler)
  const handleNcSiteCheck = async () => {
    setSaving(true);
    try {
      if (ncCategory === "regular") {
        // Reguler: bisa langsung pasang meter
        await updateRegistration(record.id, {
          nc_category: "regular",
          nc_checked_at: new Date().toISOString(),
          nc_checked_by: profile?.full_name || "Tim NC",
          nc_notes: ncNotes || "Lokasi reguler, jarak pipa <= 6m, meteran siap dipasang.",
        });
        toast.success("Lokasi terkonfirmasi REGULER. Meteran air bisa langsung dipasang!");
        setActiveModal(null);
        await reload();
      } else {
        // Non-Reguler: perlu penambahan panjang pipa & ID Non-Reguler
        const totalExtraCost = extraPipeLength * pipeCostPerMeter;
        await updateRegistration(record.id, {
          nc_category: "non-regular",
          extra_pipe_length: Number(extraPipeLength),
          pipe_cost_permeter: Number(pipeCostPerMeter),
          extra_pipe_total_cost: totalExtraCost,
          non_regular_payment_status: "pending",
          nc_checked_at: new Date().toISOString(),
          nc_checked_by: profile?.full_name || "Tim NC",
          nc_notes: ncNotes || `Dibutuhkan penambahan pipa sepanjang ${extraPipeLength} meter.`,
        });
        toast.info("Pengajuan Non-Reguler dikirim ke CS untuk penerbitan ID Non-Reguler!");
        setActiveModal(null);
        await reload();
      }
    } catch (err) {
      toast.error(err.message || "Gagal menyimpan hasil pengecekan NC.");
    } finally {
      setSaving(false);
    }
  };

  // 7. ACTION: CS Terbitkan ID Non-Reguler
  const handleIssueNonRegId = async () => {
    if (!issuedNonRegId.trim()) {
      toast.warning("Nomor ID Non-Reguler wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      await updateRegistration(record.id, {
        non_regular_id: issuedNonRegId.trim(),
        non_regular_id_issued_at: new Date().toISOString(),
      });
      setActiveModal(null);
      await reload();
      toast.success(`ID Non-Reguler ${issuedNonRegId} berhasil diterbitkan dan dikirim ke pelanggan!`);
    } catch (err) {
      toast.error(err.message || "Gagal menerbitkan ID Non-Reguler.");
    } finally {
      setSaving(false);
    }
  };

  // 8. ACTION: Pembayaran Penambahan Pipa Non-Reguler Lunas
  const handleNonRegPaymentSuccess = async (receipt) => {
    try {
      await updateRegistration(record.id, {
        non_regular_payment_status: "paid",
        non_regular_paid_at: receipt.paidAt,
        non_regular_trx: receipt.transactionId,
      });
      setActiveModal(null);
      await reload();
      toast.success("Biaya penambahan pipa terbayar lunas! Tim NC siap kembali memasang meteran.");
    } catch (err) {
      toast.error(err.message || "Gagal memperbarui status pembayaran non-reguler.");
    }
  };

  // 9. ACTION: Tim NC Selesai Pemasangan Meteran
  const handleNcComplete = async () => {
    if (!ncCompletionData.meterNo.trim()) {
      toast.warning("Nomor seri meteran air wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const activeStatus = statuses.find((s) => /aktif|selesai/i.test(s.status_name)) || statuses[5];
      await updateRegistration(record.id, {
        nc_completion: ncCompletionData,
        meter_serial_number: ncCompletionData.meterNo,
        initial_stand: ncCompletionData.initialStand,
        meter_diameter: ncCompletionData.meterDiameter,
        installed_at: new Date().toISOString(),
        installed_by: ncCompletionData.installerName,
      });
      await updateRegistrationStatus(record, activeStatus, `Pemasangan meteran selesai oleh ${ncCompletionData.installerName}. No Seri: ${ncCompletionData.meterNo}, Stand Awal: ${ncCompletionData.initialStand} m3. Sambungan aktif.`, {
        userId,
        actorName: profile?.full_name,
        customerNumber: record.customer_number,
        meterDiameter: ncCompletionData.meterDiameter,
      });
      setActiveModal(null);
      await reload();
      toast.success("Pemasangan meteran selesai! Sambungan air kini AKTIF.");
    } catch (err) {
      toast.error(err.message || "Gagal menyelesaikan pemasangan.");
    } finally {
      setSaving(false);
    }
  };

  // 10. ACTION: Pelanggan Memberikan Rating CSAT
  const handleSubmitCsat = async () => {
    setSaving(true);
    try {
      const ratingPayload = {
        stars: ratingStars,
        review: ratingReview.trim(),
        rated_at: new Date().toISOString(),
        rated_by: profile?.full_name || record.customer_name,
      };
      await updateRegistration(record.id, { customer_rating: ratingPayload });
      setActiveModal(null);
      await reload();
      toast.success("Terima kasih atas ulasan kepuasan Anda!");
    } catch (err) {
      toast.error(err.message || "Gagal menyimpan rating.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner label="Memuat berkas pendaftaran…" className="py-20" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!record) return <EmptyState title="Berkas tidak ditemukan" description="Data mungkin telah dihapus." />;

  const isConnected = isActiveConnection(currentStatus) || record.installed_at;
  const isRejected = /ditolak|tidak dapat/i.test(currentStatus?.status_name ?? "");

  return (
    <div className="space-y-6">
      {/* Top Bar Header */}
      <div className="print-hide flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="mt-1 grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-brand-700">{record.ticket_number}</span>
              {record.sales_code && (
                <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                  Kode Sales: {record.sales_code}
                </span>
              )}
              {record.customer_number && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 font-mono">
                  ID Pelanggan: {record.customer_number}
                </span>
              )}
              {record.non_regular_id && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200 font-mono">
                  ID Non-Reguler: {record.non_regular_id}
                </span>
              )}
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold text-slate-900">{record.customer_name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={currentStatus} />
              <Badge tone="neutral">{record.service_type || "Sambungan Baru"}</Badge>
              {record.assigned_sales_name && (
                <Badge tone="brand">Sales: {record.assigned_sales_name}</Badge>
              )}
              {record.customer_rating && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                  <Star size={12} className="fill-amber-400 text-amber-400" />
                  {record.customer_rating.stars}/5 CSAT
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
            Cetak Berkas
          </Button>
          {isConnected && !record.customer_rating && (
            <Button
              icon={Star}
              onClick={() => setActiveModal("csat")}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Beri Rating CSAT
            </Button>
          )}
        </div>
      </div>

      {/* ALERT PENOLAKAN SALES (JIKA DITOLAK SEBELUMNYA) */}
      {record.sales_rejected && (
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/80 p-5 shadow-xs flex items-start gap-4 animate-fade-in">
          <AlertTriangle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-rose-900">
              Perhatian: Tugas Survei Ditolak oleh {record.sales_rejected_by || "Sales"}
            </h4>
            <p className="mt-1 text-xs text-rose-700">
              <span className="font-semibold">Alasan Penolakan:</span> "{record.sales_rejection_reason}"
            </p>
            <p className="mt-1 text-[11px] text-rose-500">
              Ditolak pada {formatDateTime(record.sales_rejected_at)}. SPV Sales perlu mendelegasikan ulang ke Sales lain.
            </p>
          </div>
          {(isSpvSales || isAdmin) && (
            <Button
              size="sm"
              onClick={() => setActiveModal("delegate_sales")}
              className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delegasikan Ulang
            </Button>
          )}
        </div>
      )}

      {/* WORKFLOW ACTION PANEL (SESUAI TAHAP AKTIF) */}
      <div className="rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50/80 to-blue-50/50 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
                Pusat Kendali Tahapan Layanan
              </p>
              <h3 className="text-sm font-bold text-slate-800">
                {currentStatus?.status_name || "Tahap Aktif"}
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* CS FORWARD TO SPV SALES (Alur 1 tanpa kode sales & Alur 2 walk-in) */}
            {!record.assigned_sales_id && !record.forwarded_to_spv && (isCS || isAdmin) && (
              <Button
                icon={Send}
                onClick={handleForwardToSpvSales}
                loading={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Kirim Konfirmasi ke SPV Sales
              </Button>
            )}

            {/* SPV SALES DELEGATION */}
            {(!record.assigned_sales_id || record.sales_rejected) && (isSpvSales || isAdmin) && (
              <Button
                icon={UserCheck}
                onClick={() => setActiveModal("delegate_sales")}
              >
                Delegasikan ke Sales
              </Button>
            )}

            {/* SALES ACCEPT / REJECT / SURVEY */}
            {record.assigned_sales_id && !record.survey_result && (isSales || isAdmin) && (
              <>
                <Button
                  variant="secondary"
                  icon={XCircle}
                  onClick={() => setActiveModal("reject_sales")}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  Tolak Tugas Survei
                </Button>
                <Button
                  icon={CheckCircle2}
                  onClick={() => setActiveModal("survey")}
                  className="bg-brand-600 text-white"
                >
                  Isi Form Survei Lapangan
                </Button>
              </>
            )}

            {/* CS ISSUE CUSTOMER ID */}
            {record.survey_result && !record.customer_number && (isCS || isAdmin) && (
              <Button
                icon={ShieldCheck}
                onClick={() => setActiveModal("issue_customer_id")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Terbitkan ID Pelanggan
              </Button>
            )}

            {/* INITIAL PAYMENT */}
            {record.customer_number && record.initial_payment_status !== "paid" && (
              <Button
                icon={CreditCard}
                onClick={() => setActiveModal("pay_initial")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Bayar Sambungan Baru (Rp 1.650.000)
              </Button>
            )}

            {/* NC SITE CHECK (REGULER / NON-REGULER) */}
            {record.initial_payment_status === "paid" && !record.nc_category && (isNC || isAdmin) && (
              <Button
                icon={Wrench}
                onClick={() => setActiveModal("nc_check")}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                Pengecekan Tim NC (Pipa)
              </Button>
            )}

            {/* CS ISSUE NON-REGULER ID */}
            {record.nc_category === "non-regular" && !record.non_regular_id && (isCS || isAdmin) && (
              <Button
                icon={ShieldCheck}
                onClick={() => setActiveModal("issue_nonreg_id")}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Terbitkan ID Non-Reguler
              </Button>
            )}

            {/* NON-REGULER PAYMENT */}
            {record.non_regular_id && record.non_regular_payment_status !== "paid" && (
              <Button
                icon={CreditCard}
                onClick={() => setActiveModal("pay_nonreg")}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Bayar Pipa Non-Reguler ({formatRupiah(record.extra_pipe_total_cost || 1200000)})
              </Button>
            )}

            {/* NC FINAL COMPLETION */}
            {((record.nc_category === "regular" && record.initial_payment_status === "paid") ||
              (record.nc_category === "non-regular" && record.non_regular_payment_status === "paid")) &&
              !record.installed_at && (isNC || isAdmin) && (
                <Button
                  icon={Gauge}
                  onClick={() => setActiveModal("nc_complete")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Selesaikan Pemasangan Meter
                </Button>
              )}
          </div>
        </div>
      </div>

      {/* Main Grid: Data & Details */}
      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          {/* 1. Identitas Pemohon */}
          <Card>
            <CardHeader
              title="Data Pemohon & Pendaftaran"
              subtitle="Data awal yang didaftarkan mandiri atau via Customer Service"
              icon={ShieldCheck}
            />
            <CardBody className="grid gap-x-6 gap-y-4 sm:grid-cols-2 text-xs">
              <InfoRow label="Nama Lengkap" value={record.customer_name} />
              <InfoRow label="NIK Penanggung Jawab" value={record.identity_number} mono />
              <InfoRow label="WhatsApp / HP" value={record.phone_number} mono />
              <InfoRow label="Email" value={record.email || "—"} />
              <InfoRow label="Peruntukan Sambungan" value={record.service_type || "Rumah Tangga"} />
              <InfoRow label="Kode Referral Sales" value={record.sales_code || "— (Pendaftaran Mandiri / Walk-in)"} mono />
              <InfoRow label="Status Pendaftaran" value={currentStatus?.status_name} />
              <InfoRow label="Waktu Terdaftar" value={formatDateTime(record.created_at)} />
            </CardBody>
          </Card>

          {/* 2. Lokasi Pemasangan */}
          <Card>
            <CardHeader
              title="Lokasi & Titik Pasang"
              subtitle="Acuan survei tim sales dan pemasangan tim NC"
              icon={MapPin}
            />
            <CardBody className="space-y-4 text-xs">
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <InfoRow label="Kecamatan" value={record.district || "—"} />
                <InfoRow label="Kelurahan / Desa" value={record.village || "—"} />
                <InfoRow label="Alamat Lengkap" value={record.address} className="sm:col-span-2" />
                <InfoRow label="Kepemilikan Properti" value={record.property_ownership || "Milik Sendiri"} />
                <InfoRow label="Ukuran Meter Standar" value={record.meter_diameter || "15 mm (1/2 inci)"} />
              </div>
            </CardBody>
          </Card>

          {/* 3. Hasil Survei Lapangan Sales */}
          {record.survey_result && (
            <Card className="border-l-4 border-l-brand-600">
              <CardHeader
                title="Hasil Survei Lapangan Staf Sales"
                subtitle={`Disurvei oleh ${record.surveyed_by || "Sarah Wijaya"} pada ${formatDateTime(record.surveyed_at)}`}
                icon={CheckCircle2}
              />
              <CardBody className="space-y-3 text-xs">
                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <InfoRow label="Kelayakan Pemasangan" value={record.survey_result.eligibility} />
                  <InfoRow label="Jarak ke Pipa Distribusi" value={`${record.survey_result.distance} meter`} mono />
                  <InfoRow label="Tekanan Air Sekitar" value={`${record.survey_result.waterPressure} bar`} mono />
                  <InfoRow label="Kondisi Permukaan Jalur" value={record.survey_result.groundCondition} />
                  <InfoRow label="Catatan Petugas Sales" value={record.survey_result.notes} className="sm:col-span-2" />
                </div>
                {record.survey_result.sitePhoto && (
                  <div className="mt-3">
                    <p className="text-[11px] font-bold text-slate-500 mb-1">Foto Titik Meter Survei:</p>
                    <img
                      src={record.survey_result.sitePhoto}
                      alt="Survei Lapangan"
                      className="h-44 w-auto rounded-xl border border-slate-200 object-cover"
                    />
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* 4. Hasil Pengecekan NC & Penambahan Pipa */}
          {record.nc_category && (
            <Card className={cn("border-l-4", record.nc_category === "non-regular" ? "border-l-amber-500" : "border-l-emerald-500")}>
              <CardHeader
                title={record.nc_category === "non-regular" ? "Hasil Pengecekan NC: Non-Reguler (Perlu Pipa Tambahan)" : "Hasil Pengecekan NC: Reguler (Langsung Pasang)"}
                subtitle={`Diperiksa oleh ${record.nc_checked_by || "Tim NC"} pada ${formatDateTime(record.nc_checked_at)}`}
                icon={Wrench}
              />
              <CardBody className="space-y-3 text-xs">
                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <InfoRow label="Kategori Pemasangan" value={record.nc_category === "non-regular" ? "Non-Reguler" : "Reguler (Pipa <= 6m)"} />
                  {record.nc_category === "non-regular" && (
                    <>
                      <InfoRow label="Panjang Pipa Tambahan" value={`${record.extra_pipe_length} meter`} mono />
                      <InfoRow label="Biaya per Meter" value={formatRupiah(record.pipe_cost_permeter || 80000)} mono />
                      <InfoRow label="Total Biaya Penambahan" value={formatRupiah(record.extra_pipe_total_cost || 1200000)} mono />
                      <InfoRow label="Status Pembayaran Pipa" value={record.non_regular_payment_status === "paid" ? "LUNAS (Terbayar)" : "MENUNGGU PEMBAYARAN"} />
                    </>
                  )}
                  <InfoRow label="Catatan Teknis NC" value={record.nc_notes || "—"} className="sm:col-span-2" />
                </div>
              </CardBody>
            </Card>
          )}

          {/* 5. Data Meteran Terpasang (Pemasangan Selesai) */}
          {record.installed_at && (
            <Card className="border-l-4 border-l-emerald-600">
              <CardHeader
                title="Pemasangan Meteran Selesai · Sambungan Aktif"
                subtitle={`Dipasang oleh ${record.installed_by || "Tim NC"} pada ${formatDateTime(record.installed_at)}`}
                icon={Gauge}
              />
              <CardBody className="space-y-4 text-xs">
                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <InfoRow label="Nomor Seri Meter" value={record.meter_serial_number || record.nc_completion?.meterNo} mono />
                  <InfoRow label="Stand Awal Meter" value={`${record.initial_stand || record.nc_completion?.initialStand || "0.00"} m3`} mono />
                  <InfoRow label="Diameter Meter" value={record.meter_diameter || "15 mm (1/2 inci)"} />
                  <InfoRow label="Merek Meter Air" value={record.nc_completion?.meterBrand || "Itron"} />
                  <InfoRow label="Catatan Pengujian Aliran" value={record.nc_completion?.notes || "Air mengalir normal, segel terpasang rapi."} className="sm:col-span-2" />
                </div>
                {record.nc_completion?.photoUrl && (
                  <div className="mt-3">
                    <p className="text-[11px] font-bold text-slate-500 mb-1">Foto Bukti Meter Terpasang:</p>
                    <img
                      src={record.nc_completion.photoUrl}
                      alt="Meteran Terpasang"
                      className="h-48 w-auto rounded-xl border border-slate-200 object-cover"
                    />
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* 6. Ulasan Kepuasan Pelanggan (CSAT) */}
          {record.customer_rating && (
            <Card className="border border-amber-200 bg-amber-50/30">
              <CardHeader
                title="Survei Kepuasan Pelanggan (CSAT)"
                subtitle={`Diberikan oleh ${record.customer_rating.rated_by || record.customer_name} pada ${formatDateTime(record.customer_rating.rated_at)}`}
                icon={Star}
              />
              <CardBody className="space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-amber-500">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      size={18}
                      className={cn(i < record.customer_rating.stars ? "fill-amber-400 text-amber-400" : "text-slate-300")}
                    />
                  ))}
                  <span className="ml-2 font-bold text-slate-800 text-sm">
                    {record.customer_rating.stars} dari 5 Bintang
                  </span>
                </div>
                <p className="text-slate-700 italic bg-white p-3 rounded-xl border border-amber-100">
                  "{record.customer_rating.review}"
                </p>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Right Column: Timeline & Master Controls */}
        <div className="space-y-6">
          {/* Timeline Progres */}
          <Card>
            <CardHeader
              title="Kronologi & Jejak Status"
              subtitle="Riwayat perpindahan status real-time"
              icon={FileText}
            />
            <CardBody>
              <Timeline steps={steps} progressLabel={currentStatus?.status_name} />
            </CardBody>
          </Card>

          {/* Kartu Status Pembayaran Terintegrasi */}
          <Card>
            <CardHeader
              title="Informasi Tagihan & Kwitansi"
              subtitle="Status pembayaran biaya sambungan & pipa tambahan"
              icon={CreditCard}
            />
            <CardBody className="space-y-3 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Sambungan Standar:</span>
                  <span className="font-bold text-slate-900">Rp 1.650.000</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Status Pembayaran:</span>
                  {record.initial_payment_status === "paid" ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                      Lunas ({record.initial_payment_method || "VA"})
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800">
                      Menunggu Pembayaran
                    </span>
                  )}
                </div>
                {record.initial_payment_trx && (
                  <p className="text-[10px] text-slate-400 font-mono">
                    No. Trx: {record.initial_payment_trx}
                  </p>
                )}
              </div>

              {record.nc_category === "non-regular" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-900">
                      Pipa Tambahan ({record.extra_pipe_length}m):
                    </span>
                    <span className="font-bold text-amber-950 font-mono">
                      {formatRupiah(record.extra_pipe_total_cost || 1200000)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-amber-700">Status ID Non-Reguler:</span>
                    {record.non_regular_payment_status === "paid" ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                        Lunas
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-200 px-2 py-0.5 font-bold text-amber-900">
                        Belum Terbayar
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Master Override Controls for Admin Aetra */}
          {isAdmin && (
            <Card className="border border-brand-200">
              <CardHeader
                title="Master Override (Admin Aetra)"
                subtitle="Hak akses penuh untuk memindahkan status atau menetapkan data langsung"
                icon={Sparkles}
              />
              <CardBody className="space-y-3">
                <Field label="Pindahkan Status Manual">
                  <Select
                    value={manualTargetId}
                    onChange={(e) => setManualTargetId(e.target.value)}
                  >
                    <option value="">— Pilih Status Tujuan —</option>
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.step_order}. {s.status_name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Catatan Perubahan Manual">
                  <Input
                    value={manualNote}
                    onChange={(e) => setManualNote(e.target.value)}
                    placeholder="Instruksi khusus admin pusat..."
                  />
                </Field>
                <Button
                  className="w-full"
                  disabled={!manualTargetId}
                  loading={saving}
                  onClick={async () => {
                    const target = statuses.find((s) => s.id === manualTargetId);
                    if (!target) return;
                    setSaving(true);
                    try {
                      await updateRegistrationStatus(record, target, manualNote || "Diubah manual oleh Admin Aetra", {
                        userId,
                        actorName: "Admin Aetra",
                      });
                      setManualTargetId("");
                      setManualNote("");
                      await reload();
                      toast.success(`Status berhasil diubah ke ${target.status_name}`);
                    } catch (err) {
                      toast.error(err.message || "Gagal mengubah status.");
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Eksekusi Perpindahan Status
                </Button>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* ================= MODALS SECTION ================= */}

      {/* 1. MODAL DELEGASI SPV SALES */}
      <Modal
        open={activeModal === "delegate_sales"}
        onClose={() => setActiveModal(null)}
        title="Delegasikan Tugas Survei ke Staf Sales"
        subtitle={`Nomor Pendaftaran: ${record.ticket_number}`}
        icon={UserCheck}
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-3 text-xs text-brand-900">
            Pilih staf Sales dari tim Anda. Sales terpilih akan menerima notifikasi tugas survei dan memiliki hak untuk Menerima atau Menolak tugas.
          </div>
          <Field label="Pilih Staf Sales Penanggung Jawab" required>
            <Select
              value={selectedSalesId}
              onChange={(e) => setSelectedSalesId(e.target.value)}
            >
              {salesStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.email}) {s.sales_code ? `· Kode: ${s.sales_code}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Catatan / Arahan Khusus untuk Sales">
            <Textarea
              rows={3}
              value={delegationNotes}
              onChange={(e) => setDelegationNotes(e.target.value)}
              placeholder="Contoh: Jadwalkan survei hari ini sebelum pukul 15.00 WIB."
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setActiveModal(null)}>
              Batal
            </Button>
            <Button loading={saving} onClick={handleDelegateSales}>
              Kirim Delegasi Tugas
            </Button>
          </div>
        </div>
      </Modal>

      {/* 2. MODAL PENOLAKAN TUGAS SALES */}
      <Modal
        open={activeModal === "reject_sales"}
        onClose={() => setActiveModal(null)}
        title="Tolak Tugas Survei Lapangan"
        subtitle="Alasan penolakan akan dikirimkan kembali ke SPV Sales untuk delegasi ulang"
        icon={XCircle}
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-800">
            Sesuai SOP Aetra, Anda wajib mengisikan alasan penolakan secara jelas agar SPV Sales dapat mengatur ulang jadwal survei ke staf lain.
          </div>
          <Field label="Alasan Penolakan Tugas" required>
            <Textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Contoh: Lokasi berada di luar wilayah operasional saya (Sepatan Timur), atau kapasitas survei hari ini sudah penuh (5 titik)."
              autoFocus
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setActiveModal(null)}>
              Batal
            </Button>
            <Button
              loading={saving}
              onClick={handleRejectTask}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Konfirmasi Tolak Tugas
            </Button>
          </div>
        </div>
      </Modal>

      {/* 3. MODAL FORM SURVEI SALES */}
      <Modal
        open={activeModal === "survey"}
        onClose={() => setActiveModal(null)}
        title="Form Survei Lokasi Lapangan"
        subtitle="Diisi oleh Staf Sales saat mengecek fisik titik pemasangan"
        icon={MapPin}
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-3 text-xs text-brand-900">
            Data survei akan diterima oleh Customer Service untuk penetapan kelayakan dan penerbitan ID Pelanggan.
          </div>
          <Field label="Hasil Kelayakan Pemasangan" required>
            <Select
              value={surveyData.eligibility}
              onChange={(e) => setSurveyData({ ...surveyData, eligibility: e.target.value })}
            >
              <option value="Layak Pasang (Jaringan Tersedia)">Layak Pasang (Jaringan Tersedia)</option>
              <option value="Layak Bersyarat (Perlu Penambahan Pipa)">Layak Bersyarat (Perlu Penambahan Pipa)</option>
              <option value="Tidak Layak (Jaringan Belum Menjangkau)">Tidak Layak (Jaringan Belum Menjangkau)</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Jarak ke Pipa Distribusi" required>
              <div className="flex">
                <Input
                  type="number"
                  value={surveyData.distance}
                  onChange={(e) => setSurveyData({ ...surveyData, distance: e.target.value })}
                  placeholder="5"
                  className="rounded-r-none"
                />
                <span className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-slate-200 bg-slate-100 text-xs font-semibold text-slate-700">
                  meter
                </span>
              </div>
            </Field>
            <Field label="Tekanan Air Sekitar" required>
              <div className="flex">
                <Input
                  type="number"
                  step="0.1"
                  value={surveyData.waterPressure}
                  onChange={(e) => setSurveyData({ ...surveyData, waterPressure: e.target.value })}
                  placeholder="1.6"
                  className="rounded-r-none"
                />
                <span className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-slate-200 bg-slate-100 text-xs font-semibold text-slate-700">
                  bar
                </span>
              </div>
            </Field>
          </div>
          <Field label="Kondisi Permukaan Jalur Pipa">
            <Select
              value={surveyData.groundCondition}
              onChange={(e) => setSurveyData({ ...surveyData, groundCondition: e.target.value })}
            >
              <option value="Tanah Biasa">Tanah Biasa</option>
              <option value="Paving Block">Paving Block</option>
              <option value="Aspal Jalan">Aspal Jalan</option>
              <option value="Cor Beton / Semen">Cor Beton / Semen</option>
            </Select>
          </Field>
          <Field label="Catatan Survei Lapangan" required>
            <Textarea
              rows={3}
              value={surveyData.notes}
              onChange={(e) => setSurveyData({ ...surveyData, notes: e.target.value })}
              placeholder="Kondisi rute pipa, izin lingkungan, atau koordinasi dengan warga..."
            />
          </Field>

          {/* Render custom fields from Form Management if any */}
          {surveyCustomSchema && surveyCustomSchema.length > 0 && (
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <p className="text-xs font-bold text-slate-700">Field Tambahan dari Admin Aetra:</p>
              <DynamicFormRenderer
                schema={surveyCustomSchema}
                values={surveyData}
                onChange={(updated) => setSurveyData({ ...surveyData, ...updated })}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setActiveModal(null)}>
              Batal
            </Button>
            <Button loading={saving} icon={Send} onClick={handleSubmitSurvey}>
              Kirim Hasil Survei ke CS
            </Button>
          </div>
        </div>
      </Modal>

      {/* 4. MODAL CS TERBITKAN ID PELANGGAN */}
      <Modal
        open={activeModal === "issue_customer_id"}
        onClose={() => setActiveModal(null)}
        title="Terbitkan ID Pelanggan Resmi"
        subtitle="Customer Service menetapkan ID dan membuka tagihan pembayaran pertama"
        icon={ShieldCheck}
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-emerald-900">
            Berdasarkan hasil survei Sales, lokasi pemohon dinyatakan layak dipasang. Terbitkan ID Pelanggan untuk melanjutkan proses pembayaran.
          </div>
          <Field label="Nomor ID Pelanggan Aetra" required>
            <Input
              value={issuedCustomerId}
              onChange={(e) => setIssuedCustomerId(e.target.value)}
              className="font-mono font-bold text-brand-700"
            />
          </Field>
          <Field label="Biaya Pasang Sambungan Baru Standar (Rp)">
            <Input
              type="number"
              value={initialAmount}
              onChange={(e) => setInitialAmount(Number(e.target.value))}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setActiveModal(null)}>
              Batal
            </Button>
            <Button
              loading={saving}
              onClick={handleIssueCustomerId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Terbitkan ID & Buka Tagihan
            </Button>
          </div>
        </div>
      </Modal>

      {/* 5. MODAL PEMBAYARAN PERTAMA */}
      <PaymentModal
        open={activeModal === "pay_initial"}
        onClose={() => setActiveModal(null)}
        invoiceNumber={record.customer_number || record.ticket_number}
        customerName={record.customer_name}
        customerId={record.customer_number}
        type="initial"
        amount={record.initial_payment_amount || 1650000}
        details="Biaya Pemasangan Sambungan Air Bersih Standar"
        onSuccess={handleInitialPaymentSuccess}
      />

      {/* 6. MODAL NC PENGECEKAN REGULER / NON-REGULER */}
      <Modal
        open={activeModal === "nc_check"}
        onClose={() => setActiveModal(null)}
        title="Pengecekan Lokasi oleh Tim NC"
        subtitle="Tentukan apakah pemasangan termasuk Reguler atau Non-Reguler (perlu pipa tambahan)"
        icon={Wrench}
        size="md"
      >
        <div className="space-y-4">
          <Field label="Kategori Pemasangan" required>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNcCategory("regular")}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all cursor-pointer",
                  ncCategory === "regular"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                )}
              >
                <span className="block text-xs">REGULER</span>
                <span className="block text-[10px] text-slate-500 font-normal mt-0.5">
                  Pipa &lt;= 6m, meteran bisa langsung dipasang
                </span>
              </button>
              <button
                type="button"
                onClick={() => setNcCategory("non-regular")}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all cursor-pointer",
                  ncCategory === "non-regular"
                    ? "border-amber-600 bg-amber-50 text-amber-950 font-bold shadow-xs"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                )}
              >
                <span className="block text-xs">NON-REGULER</span>
                <span className="block text-[10px] text-slate-500 font-normal mt-0.5">
                  Perlu penambahan panjang pipa & ID Non-Reguler
                </span>
              </button>
            </div>
          </Field>

          {ncCategory === "non-regular" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
              <p className="text-xs font-bold text-amber-900">Perhitungan Penambahan Panjang Pipa:</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Panjang Pipa Tambahan" required>
                  <div className="flex">
                    <Input
                      type="number"
                      value={extraPipeLength}
                      onChange={(e) => setExtraPipeLength(Number(e.target.value))}
                      className="rounded-r-none font-bold"
                    />
                    <span className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-slate-200 bg-slate-100 text-xs font-bold text-slate-700">
                      meter
                    </span>
                  </div>
                </Field>
                <Field label="Biaya per Meter (Rp)" required>
                  <Input
                    type="number"
                    value={pipeCostPerMeter}
                    onChange={(e) => setPipeCostPerMeter(Number(e.target.value))}
                    className="font-bold"
                  />
                </Field>
              </div>
              <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-xs font-bold text-amber-950">
                <span>Total Estimasi Biaya Tambahan:</span>
                <span className="text-sm font-mono text-amber-900">
                  {formatRupiah(extraPipeLength * pipeCostPerMeter)}
                </span>
              </div>
            </div>
          )}

          <Field label="Catatan Teknis Tim NC">
            <Textarea
              rows={3}
              value={ncNotes}
              onChange={(e) => setNcNotes(e.target.value)}
              placeholder="Kondisi jalur galian, perlintasan drainase, atau koordinasi lapangan..."
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setActiveModal(null)}>
              Batal
            </Button>
            <Button loading={saving} onClick={handleNcSiteCheck}>
              Simpan & Lanjutkan
            </Button>
          </div>
        </div>
      </Modal>

      {/* 7. MODAL CS TERBITKAN ID NON-REGULER */}
      <Modal
        open={activeModal === "issue_nonreg_id"}
        onClose={() => setActiveModal(null)}
        title="Terbitkan ID Non-Reguler untuk Tambahan Pipa"
        subtitle="Customer Service menerbitkan tagihan penambahan pipa ke pelanggan"
        icon={ShieldCheck}
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-900">
            Tim NC membutuhkan penambahan pipa sepanjang {record.extra_pipe_length} meter dengan total biaya {formatRupiah(record.extra_pipe_total_cost || 1200000)}. Terbitkan ID Non-Reguler ini agar pelanggan dapat membayar.
          </div>
          <Field label="Nomor ID Non-Reguler" required>
            <Input
              value={issuedNonRegId}
              onChange={(e) => setIssuedNonRegId(e.target.value)}
              className="font-mono font-bold text-amber-800"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setActiveModal(null)}>
              Batal
            </Button>
            <Button
              loading={saving}
              onClick={handleIssueNonRegId}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Terbitkan ID Non-Reguler & Kirim Tagihan
            </Button>
          </div>
        </div>
      </Modal>

      {/* 8. MODAL PEMBAYARAN NON-REGULER */}
      <PaymentModal
        open={activeModal === "pay_nonreg"}
        onClose={() => setActiveModal(null)}
        invoiceNumber={record.non_regular_id || `NONREG-${record.ticket_number}`}
        customerName={record.customer_name}
        customerId={record.non_regular_id}
        type="non_regular"
        amount={record.extra_pipe_total_cost || 1200000}
        details={`Biaya Penambahan Panjang Pipa Non-Reguler (${record.extra_pipe_length || 15} meter)`}
        onSuccess={handleNonRegPaymentSuccess}
      />

      {/* 9. MODAL NC SELESAI PENGERJAAN PEMASANGAN METER */}
      <Modal
        open={activeModal === "nc_complete"}
        onClose={() => setActiveModal(null)}
        title="Form Selesai Pemasangan Meteran Air"
        subtitle="Diisi oleh Tim NC saat meter air terpasang dan siap dialirkan"
        icon={Gauge}
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-900">
            Pastikan meteran air sudah terpasang kokoh, segel resmi terpasang, dan air diuji mengalir dengan baik.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nomor Seri Meter Air" required>
              <Input
                value={ncCompletionData.meterNo}
                onChange={(e) => setNcCompletionData({ ...ncCompletionData, meterNo: e.target.value })}
                placeholder="MTR-2026-XXXX"
                className="font-mono font-bold"
              />
            </Field>
            <Field label="Stand Meter Awal (m3)" required>
              <Input
                value={ncCompletionData.initialStand}
                onChange={(e) => setNcCompletionData({ ...ncCompletionData, initialStand: e.target.value })}
                placeholder="0.00"
                className="font-mono"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ukuran Diameter Meter">
              <Select
                value={ncCompletionData.meterDiameter}
                onChange={(e) => setNcCompletionData({ ...ncCompletionData, meterDiameter: e.target.value })}
              >
                <option value="15 mm (1/2 inci)">15 mm (1/2 inci)</option>
                <option value="20 mm (3/4 inci)">20 mm (3/4 inci)</option>
                <option value="25 mm (1 inci)">25 mm (1 inci)</option>
                <option value="40 mm (1.5 inci)">40 mm (1.5 inci)</option>
              </Select>
            </Field>
            <Field label="Merek / Pabrikan Meter">
              <Select
                value={ncCompletionData.meterBrand}
                onChange={(e) => setNcCompletionData({ ...ncCompletionData, meterBrand: e.target.value })}
              >
                <option value="Itron">Itron</option>
                <option value="B&R Water Meter">B&R Water Meter</option>
                <option value="Barindo">Barindo</option>
                <option value="Ningbo Water">Ningbo Water</option>
              </Select>
            </Field>
          </div>
          <Field label="Nama Teknisi Pelaksana" required>
            <Input
              value={ncCompletionData.installerName}
              onChange={(e) => setNcCompletionData({ ...ncCompletionData, installerName: e.target.value })}
            />
          </Field>
          <Field label="Catatan Hasil Pengujian Air Mengalir" required>
            <Textarea
              rows={2}
              value={ncCompletionData.notes}
              onChange={(e) => setNcCompletionData({ ...ncCompletionData, notes: e.target.value })}
            />
          </Field>

          {/* Dynamic fields from Form Management */}
          {ncCompleteCustomSchema && ncCompleteCustomSchema.length > 0 && (
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <p className="text-xs font-bold text-slate-700">Field Tambahan dari Admin Aetra:</p>
              <DynamicFormRenderer
                schema={ncCompleteCustomSchema}
                values={ncCompletionData}
                onChange={(updated) => setNcCompletionData({ ...ncCompletionData, ...updated })}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setActiveModal(null)}>
              Batal
            </Button>
            <Button
              loading={saving}
              icon={CheckCircle2}
              onClick={handleNcComplete}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Simpan & Aktifkan Sambungan
            </Button>
          </div>
        </div>
      </Modal>

      {/* 10. MODAL CSAT RATING */}
      <Modal
        open={activeModal === "csat"}
        onClose={() => setActiveModal(null)}
        title="Survei Kepuasan Pelanggan (CSAT)"
        subtitle="Berikan penilaian terhadap kecepatan dan kualitas pelayanan PT Aetra Air Tangerang"
        icon={Star}
        size="md"
      >
        <div className="space-y-4">
          <div className="text-center py-3">
            <p className="text-xs text-slate-500 mb-2">Berapa tingkat kepuasan Anda terhadap layanan kami?</p>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingStars(star)}
                  className="p-1.5 transition-transform hover:scale-125 cursor-pointer"
                >
                  <Star
                    size={32}
                    className={cn(star <= ratingStars ? "fill-amber-400 text-amber-400" : "text-slate-300")}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs font-bold text-slate-700 mt-2">
              {["Sangat Kecewa", "Kurang Puas", "Cukup Baik", "Puas", "Sangat Puas & Luar Biasa"][ratingStars - 1]}
            </p>
          </div>
          <Field label="Ulasan & Saran Anda" required>
            <Textarea
              rows={3}
              value={ratingReview}
              onChange={(e) => setRatingReview(e.target.value)}
              placeholder="Tuliskan pengalaman Anda dalam proses pemasangan sambungan air..."
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setActiveModal(null)}>
              Batal
            </Button>
            <Button
              loading={saving}
              onClick={handleSubmitCsat}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Kirim Ulasan Kepuasan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoRow({ label, value, mono = false, className = "" }) {
  return (
    <div className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={cn("mt-0.5 text-xs text-slate-800", mono && "font-mono font-medium")}>{value || "—"}</p>
    </div>
  );
}
