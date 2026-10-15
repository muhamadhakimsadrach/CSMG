import { useState } from "react";
import {
  CreditCard,
  QrCode,
  Building2,
  CheckCircle2,
  Printer,
  Copy,
  Clock,
  Sparkles,
  ShieldCheck,
  Store,
  ChevronRight,
  ArrowRight,
  Download,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { Badge } from "@/components/common/Badge";
import { useToast } from "@/context/ToastContext";
import { formatRupiah } from "@/lib/utils";

const PAYMENT_CHANNELS = [
  {
    id: "bca_va",
    category: "Virtual Account",
    name: "BCA Virtual Account",
    code: "8088 1029 4819 001",
    fee: 0,
    logo: "BCA",
    color: "bg-blue-600 text-white",
  },
  {
    id: "mandiri_va",
    category: "Virtual Account",
    name: "Mandiri Virtual Account",
    code: "8910 8291 0481 02",
    fee: 0,
    logo: "Mandiri",
    color: "bg-amber-600 text-white",
  },
  {
    id: "bri_va",
    category: "Virtual Account",
    name: "BRI Virtual Account",
    code: "1289 0192 8491 82",
    fee: 0,
    logo: "BRI",
    color: "bg-blue-700 text-white",
  },
  {
    id: "qris",
    category: "Instant QR",
    name: "QRIS Nasional (Gopay / OVO / Dana / ShopeePay)",
    code: "NMID: ID1020039481928",
    fee: 0,
    logo: "QRIS",
    color: "bg-rose-600 text-white",
  },
  {
    id: "retail",
    category: "Gerai Ritel",
    name: "Indomaret / Alfamart",
    code: "AETRA-90218",
    fee: 2500,
    logo: "Ritel",
    color: "bg-emerald-600 text-white",
  },
];

export function PaymentModal({
  open,
  onClose,
  title = "Pembayaran Layanan Air Aetra",
  invoiceNumber,
  customerName,
  customerId,
  type = "initial", // "initial" | "non_regular"
  amount = 1650000,
  details = "Biaya Pemasangan Sambungan Air Bersih Standar",
  onSuccess,
}) {
  const toast = useToast();
  const [selectedChannel, setSelectedChannel] = useState(PAYMENT_CHANNELS[0].id);
  const [step, setStep] = useState("select"); // "select" | "processing" | "success"
  const [receiptData, setReceiptData] = useState(null);

  const activeChannel = PAYMENT_CHANNELS.find((c) => c.id === selectedChannel) || PAYMENT_CHANNELS[0];
  const totalAmount = amount + (activeChannel.fee || 0);

  const handlePay = () => {
    setStep("processing");
    setTimeout(() => {
      const receipt = {
        transactionId: `TRX-${Date.now().toString().slice(-8)}`,
        invoiceNumber,
        customerName,
        customerId,
        type,
        amount,
        fee: activeChannel.fee,
        total: totalAmount,
        channel: activeChannel.name,
        paidAt: new Date().toISOString(),
      };
      setReceiptData(receipt);
      setStep("success");
      toast.success("Pembayaran berhasil diverifikasi secara real-time!");
      onSuccess?.(receipt);
    }, 1200);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.info("Nomor Virtual Account disalin ke clipboard!");
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (step === "processing") return;
        setStep("select");
        onClose();
      }}
      title={step === "success" ? "Bukti Pembayaran Lunas" : title}
      subtitle={
        step === "success"
          ? "Transaksi resmi terverifikasi sistem PT Aetra Air Tangerang"
          : `Tagihan No. ${invoiceNumber}`
      }
      icon={step === "success" ? CheckCircle2 : CreditCard}
      size="md"
    >
      {step === "processing" && (
        <div className="py-12 text-center space-y-4">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <div>
            <h3 className="text-base font-bold text-slate-800">Menghubungkan ke Saluran Pembayaran...</h3>
            <p className="text-xs text-slate-500 mt-1">Memproses verifikasi mutasi dana secara otomatis.</p>
          </div>
        </div>
      )}

      {step === "select" && (
        <div className="space-y-5">
          {/* Invoice Summary Box */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Nama Pelanggan:</span>
              <span className="font-bold text-slate-800">{customerName}</span>
            </div>
            {customerId && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">ID Pelanggan / Non-Reguler:</span>
                <span className="font-mono font-bold text-brand-700">{customerId}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Uraian Tagihan:</span>
              <span className="font-medium text-slate-700">{details}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Total Tagihan:</span>
              <span className="text-lg font-bold font-mono text-emerald-600">
                {formatRupiah ? formatRupiah(amount) : `Rp ${amount.toLocaleString("id-ID")}`}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Pilih Media Pembayaran:
            </label>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {PAYMENT_CHANNELS.map((ch) => {
                const selected = ch.id === selectedChannel;
                return (
                  <div
                    key={ch.id}
                    onClick={() => setSelectedChannel(ch.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      selected
                        ? "border-brand-600 bg-brand-50/50 shadow-xs ring-1 ring-brand-500"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${ch.color}`}>
                        {ch.logo}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{ch.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{ch.code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400">
                        {ch.fee === 0 ? "Bebas Biaya" : `+Rp ${ch.fee.toLocaleString("id-ID")}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Channel Details */}
          <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-brand-900">
                {activeChannel.name}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(activeChannel.code)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:underline"
              >
                <Copy size={12} /> Salin Kode
              </button>
            </div>
            <div className="rounded-lg bg-white p-2.5 border border-brand-200 flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-slate-800 tracking-wider">
                {activeChannel.code}
              </span>
              <span className="text-[10px] text-slate-400">Atas nama: PT Aetra Air Tangerang</span>
            </div>
            {activeChannel.id === "qris" && (
              <div className="text-center py-2 bg-white rounded-lg border border-slate-200 mt-2">
                <div className="mx-auto w-32 h-32 bg-slate-100 rounded-lg flex items-center justify-center border border-dashed border-slate-300">
                  <QrCode size={90} className="text-slate-800" />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Pindai kode QRIS dengan e-wallet atau m-banking</p>
              </div>
            )}
          </div>

          {/* Pay Button */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button
              className="flex-1 h-11"
              iconRight={ArrowRight}
              onClick={handlePay}
            >
              Bayar Sekarang ({formatRupiah ? formatRupiah(totalAmount) : `Rp ${totalAmount.toLocaleString("id-ID")}`})
            </Button>
          </div>
        </div>
      )}

      {step === "success" && receiptData && (
        <div className="space-y-5 animate-fade-in">
          {/* Printable Receipt */}
          <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/30 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  PT AETRA AIR TANGERANG
                </p>
                <h4 className="text-base font-bold text-slate-900">Kwitansi Pembayaran Resmi</h4>
              </div>
              <div className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs">
                LUNAS
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <p className="text-slate-400 text-[10px]">No. Transaksi</p>
                <p className="font-mono font-bold text-slate-800">{receiptData.transactionId}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Waktu Pembayaran</p>
                <p className="font-medium text-slate-800">
                  {new Date(receiptData.paidAt).toLocaleString("id-ID")}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Nama Pelanggan</p>
                <p className="font-bold text-slate-800">{receiptData.customerName}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">ID Pelanggan</p>
                <p className="font-mono font-bold text-brand-700">
                  {receiptData.customerId || receiptData.invoiceNumber}
                </p>
              </div>
              <div className="col-span-2 pt-2 border-t border-emerald-200/60">
                <p className="text-slate-400 text-[10px]">Metode Pembayaran</p>
                <p className="font-semibold text-slate-800">{receiptData.channel}</p>
              </div>
            </div>

            <div className="rounded-xl bg-white p-3 border border-emerald-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Jumlah Dibayar:</span>
              <span className="text-lg font-bold font-mono text-emerald-600">
                {formatRupiah ? formatRupiah(receiptData.total) : `Rp ${receiptData.total.toLocaleString("id-ID")}`}
              </span>
            </div>

            <p className="text-[10px] text-slate-400 text-center italic">
              Simpan bukti ini sebagai konfirmasi pembayaran sah. Sistem otomatis meneruskan status ke tim terkait.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              icon={Printer}
              onClick={() => window.print()}
            >
              Cetak Kwitansi
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setStep("select");
                onClose();
              }}
            >
              Selesai & Lanjutkan
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
