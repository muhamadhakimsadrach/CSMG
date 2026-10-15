import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, FileText, MapPin, Printer, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card, CardBody, CardHeader } from "@/components/common/Card";
import { Badge, StatusBadge } from "@/components/common/Badge";
import { Field, Input, Select, Textarea } from "@/components/common/Field";
import { EmptyState, ErrorState, LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Reveal } from "@/components/common/Reveal";
import { Timeline } from "@/components/common/Timeline";
import { BrandWordmark } from "@/components/common/BrandMark";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";
import { useToast } from "@/context/ToastContext";
import { useWorkflow } from "@/context/WorkflowContext";
import { useRegistrationDetail } from "@/hooks/useRegistrations";
import { formatDate, formatDateTime } from "@/lib/utils";
import { cn } from "@/utils/cn";
import { isActiveConnection } from "@/lib/waterDomain";

/**
 * Halaman detail pendaftaran: data lengkap, lampiran, visual timeline
 * progres, panel perpindahan status, serta cetak bukti pendaftaran.
 */
export function RegistrationDetailPage({ id, onBack }) {
  const { can, isAdmin, userId, profile, profiles } = useAuth();
  const { settings } = useBranding();
  const { statusesFor, statusOf, canMoveTo } = useWorkflow();
  const toast = useToast();
  const { record, history, loading, error, reload } = useRegistrationDetail(id);
  const [note, setNote] = useState("");
  const [targetId, setTargetId] = useState("");
  const [saving, setSaving] = useState(false);
  const [customerNumber, setCustomerNumber] = useState("");
  const [meterDiameter, setMeterDiameter] = useState("15 mm (1/2 inci)");

  const canUpdate = can("pendaftaran", "update") || isAdmin;
  const statuses = statusesFor("REGISTRATION");
  const peopleMap = useMemo(() => new Map((profiles ?? []).map((p) => [String(p.id), p.full_name])), [profiles]);

  const currentStatus = statusOf(record?.current_status_id);

  const steps = useMemo(() => {
    if (!record) return [];
    const visited = new Map(history.map((h) => [String(h.to_status_id), h]));
    const terminal = statuses.find((status) => status.id === record.current_status_id);
    const rejected = /ditolak|tidak dapat/i.test(terminal?.status_name ?? "");
    const path = statuses.filter((status) => rejected ? visited.has(String(status.id)) : !/ditolak|tidak dapat/i.test(status.status_name));
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

  const allowedTargets = useMemo(
    () => statuses.filter((s) => String(s.id) !== String(record?.current_status_id) && canMoveTo(s)),
    [canMoveTo, record, statuses]
  );

  const submitStatus = useCallback(async () => {
    if (!targetId) {
      toast.warning("Pilih status tujuan terlebih dahulu.");
      return;
    }
    const target = statuses.find((s) => String(s.id) === String(targetId));
    setSaving(true);
    try {
      const { updateRegistrationStatus } = await import("@/lib/api/registrations");
      if (isActiveConnection(target) && !customerNumber.trim() && !record.customer_number) throw new Error("Isi nomor pelanggan dari sistem Aetra sebelum mengaktifkan sambungan.");
      await updateRegistrationStatus(record, target, note, { userId, actorName: profile?.full_name, customerNumber: customerNumber || record.customer_number, meterDiameter });
      setNote("");
      setTargetId("");
      await reload();
      toast.success(`Status pendaftaran diubah menjadi "${target.status_name}".`, { title: "Status Diperbarui" });
    } catch (err) {
      toast.error(err.message ?? "Gagal mengubah status.", { title: "Perubahan Ditolak" });
    } finally {
      setSaving(false);
    }
  }, [note, profile, record, reload, statuses, targetId, toast, userId, customerNumber, meterDiameter]);

  if (loading) return <LoadingSpinner label="Memuat berkas pendaftaran…" className="py-20" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!record) return <EmptyState title="Berkas tidak ditemukan" description="Data mungkin telah dihapus atau akses Anda dibatasi kebijakan RLS." />;

  const attachments = Array.isArray(record.attachment_urls) ? record.attachment_urls : [];

  return (
    <div className="space-y-5">
      <div className="print-hide flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="mt-1 grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
            aria-label="Kembali ke daftar pendaftaran"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="font-mono text-[12.5px] font-semibold text-brand-700">{record.ticket_number}</p>
            <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-slate-900">{record.customer_name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={currentStatus} />
              <Badge tone="neutral">{record.service_type ?? "Pasang Baru"}</Badge>
              {record.verified_at ? (
                <Badge tone="success" dot>
                  Diverifikasi {formatDate(record.verified_at)}
                </Badge>
              ) : (
                <Badge tone="warning" dot>
                  Menunggu verifikasi
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
            Cetak Bukti
          </Button>
          <Button variant="secondary" icon={FileText} onClick={() => toast.info(`Riwayat perpindahan status: ${history.length} catatan tersimpan.`)}>
            Riwayat ({history.length})
          </Button>
        </div>
      </div>

      <div className="print-hide grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4">
          <Reveal>
            <Card>
              <CardHeader title="Identitas Pemohon" subtitle="Data diri yang disampaikan pada langkah pertama formulir." icon={ShieldCheck} />
              <CardBody className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <InfoRow label="Nama Lengkap" value={record.customer_name} />
                <InfoRow label="NIK penanggung jawab" value={record.identity_number} mono />
                <InfoRow label="Nomor WhatsApp" value={record.phone_number} mono />
                <InfoRow label="Email" value={record.email || "—"} />
                <InfoRow label="Peruntukan sambungan" value={record.service_type || "Belum ditentukan"} />
                <InfoRow label="Nomor pelanggan" value={record.customer_number || "Belum ditetapkan oleh petugas"} mono />
                <InfoRow label="Petugas Penerima" value={peopleMap.get(String(record.created_by)) ?? "Portal Mandiri"} />
              </CardBody>
            </Card>
          </Reveal>

          <Reveal delay={70}>
            <Card>
              <CardHeader
                title="Alamat & Titik Pasang Baru"
                subtitle="Acuan tim survei lapangan dalam menentukan rute jaringan terdekat."
                icon={MapPin}
                action={
                  record.latitude && record.longitude ? (
                    <a
                      href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2 py-1 text-[11.5px] font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                    >
                      Buka Peta <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  ) : null
                }
              />
              <CardBody className="space-y-4">
                <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <InfoRow label="Provinsi" value={record.province || "—"} />
                  <InfoRow label="Kota / Kabupaten" value={record.city || "—"} />
                  <InfoRow label="Kecamatan" value={record.district || "—"} />
                  <InfoRow label="Kelurahan" value={record.village || "—"} />
                  <InfoRow label="Koordinat" value={record.latitude && record.longitude ? `${record.latitude}, ${record.longitude}` : "Belum dikunci"} mono />
                  <InfoRow label="Alamat Lengkap" value={record.address} />
                  <InfoRow label="Kepemilikan bangunan" value={record.property_ownership || "Belum diisi"} />
                  <InfoRow label="Luas bangunan" value={record.building_area ? `${record.building_area} m2` : "Belum diisi"} />
                  <InfoRow label="Jumlah penghuni" value={record.occupants ? `${record.occupants} orang` : "Belum diisi"} />
                  <InfoRow label="Ukuran meter" value={record.meter_diameter || "Ditentukan setelah survei"} />
                </div>
              </CardBody>
            </Card>
          </Reveal>

          <Reveal delay={120}>
            <Card>
              <CardHeader title="Dokumen Permohonan" subtitle="KTP, KK, PBB, foto lokasi, dan dokumen usaha disimpan pada penyimpanan privat." icon={FileText} />
              <CardBody>
                {attachments.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 py-6 text-center text-[12.5px] text-slate-400">
                    Tidak ada berkas lampiran pada rekaman ini.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {attachments.map((url, i) => (
                      <figure key={`${record.id}-${i}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        <div className="h-40 overflow-hidden bg-white">
                          {url.includes("application/pdf") || /\.pdf(?:\?|$)/i.test(url) ? <a href={url} target="_blank" rel="noreferrer" className="flex h-full items-center justify-center gap-2 text-sm text-brand-600"><FileText size={28} />Buka dokumen PDF</a> : <img
                            src={url}
                            alt={`Lampiran ${i + 1}`}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />}
                        </div>
                        <figcaption className="flex items-center justify-between px-3 py-2 text-[11.5px] font-semibold text-slate-600">
                          <span>{record.attachment_labels?.[i] ?? (i === 0 ? "KTP pemohon" : `Dokumen ${i + 1}`)}</span>
                          <a href={url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                            Lihat
                          </a>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </Reveal>
        </div>

        <div className="space-y-4">
          <Reveal delay={40}>
            <Card>
              <CardHeader title="Progres Verifikasi" subtitle="Timeline real-time beserta nama petugas dan catatan tiap tahap." icon={FileText} />
              <CardBody>
                <Timeline steps={steps} progressLabel={currentStatus?.status_name} />
              </CardBody>
            </Card>
          </Reveal>

          <Reveal delay={90}>
            <Card className={cn(!canUpdate && "opacity-90")}>
              <CardHeader title="Pindahkan Status" subtitle={canUpdate ? "Hanya status yang diizinkan untuk peran Anda yang dapat dipilih." : "Peran Anda tidak memiliki izin mengubah status."} icon={Save} />
              <CardBody className="space-y-4">
                {!canUpdate ? (
                  <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-[12.5px] text-slate-500">
                    Panel ini dinonaktifkan otomatis karena izin <span className="font-semibold">can_update</span> pada modul
                    pendaftaran belum diberikan kepada peran Anda.
                  </p>
                ) : allowedTargets.length === 0 ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-700">
                    Tidak ada status tujuan yang tersedia untuk peran Anda pada tahap ini.
                  </p>
                ) : (
                  <>
                    <Field label="Status Tujuan" required>
                      <Select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                        <option value="">— Pilih status berikutnya —</option>
                        {allowedTargets.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.step_order}. {s.status_name}
                            {s.is_final ? " (final)" : ""}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    {isActiveConnection(statuses.find((status) => status.id === targetId)) && <div className="space-y-3 rounded-lg border border-brand-100 bg-brand-50/40 p-3"><Field label="Nomor pelanggan Aetra" required hint="Masukkan nomor yang telah diterbitkan sistem pelanggan Aetra, bukan nomor tiket permohonan."><Input value={customerNumber || record.customer_number || ""} onChange={(event) => setCustomerNumber(event.target.value)} placeholder="Nomor pelanggan dari sistem Aetra" /></Field><Field label="Ukuran meter terpasang"><Select value={meterDiameter} onChange={(event) => setMeterDiameter(event.target.value)}>{["15 mm (1/2 inci)", "20 mm (3/4 inci)", "25 mm (1 inci)", "40 mm (1 1/2 inci)", "50 mm (2 inci)", "Sesuai hasil survei teknis"].map((diameter) => <option key={diameter}>{diameter}</option>)}</Select></Field></div>}
                    <Field label="Catatan Verifikasi" hint="Catatan ini tampil pada timeline dan bukti cetak.">
                      <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: dokumen sesuai, jadwal survei 12 Mei pukul 09.00." />
                    </Field>
                    <Button className="w-full" loading={saving} onClick={submitStatus} disabled={!targetId}>
                      Simpan Perpindahan Status
                    </Button>
                  </>
                )}
                {record.verification_note ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Catatan Terakhir</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600">{record.verification_note}</p>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      {peopleMap.get(String(record.verified_by)) ?? "Petugas"} · {formatDateTime(record.verified_at)}
                    </p>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          </Reveal>
        </div>
      </div>

      {/* Blok khusus cetak - hanya tampil pada media print */}
      <div className="print-area hidden print:block">
        <div className="mb-4 flex items-center gap-3 border-b-2 border-slate-900 pb-3">
          <BrandWordmark className="h-12 w-28" />
          <div>
            <p className="font-display text-lg font-bold">{settings.app_name}</p>
            <p className="text-[11px]">{settings.tagline}</p>
            <p className="text-[10px] text-slate-500">
              {settings.support_email} · {settings.support_phone}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Bukti Pendaftaran</p>
            <p className="font-mono text-base font-bold">{record.ticket_number}</p>
          </div>
        </div>
        <table className="w-full text-[12px]">
          <tbody>
            {[
              ["Nama Pemohon", record.customer_name],
              ["NIK Penanggung Jawab", record.identity_number],
              ["Kontak", `${record.phone_number} / ${record.email ?? "—"}`],
              ["Peruntukan Sambungan Air", record.service_type ?? "Belum ditentukan"],
              ["Nomor Pelanggan", record.customer_number ?? "Belum diterbitkan"],
              ["Wilayah", [record.village, record.district, record.city, record.province].filter(Boolean).join(", ")],
              ["Alamat Pasang", record.address],
              ["Koordinat", record.latitude && record.longitude ? `${record.latitude}, ${record.longitude}` : "—"],
              ["Status Terkini", `${currentStatus?.status_name ?? "Menunggu"} - ${formatDateTime(record.updated_at)}`],
              ["Petugas", peopleMap.get(String(record.created_by)) ?? "Portal Mandiri"],
            ].map(([label, value]) => (
              <tr key={label}>
                <td className="w-40 py-1.5 align-top font-semibold text-slate-500">{label}</td>
                <td className="py-1.5 align-top">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-6 border-t border-dashed pt-3 text-[10.5px] leading-relaxed text-slate-500">
          Bukti ini diterbitkan secara elektronik oleh sistem {settings.app_name}. Simpan nomor tiket untuk memantau perkembangan
          permohonan Anda. Keputusan kelayakan pasang ditetapkan setelah survei lapangan oleh tim teknis.
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className={cn("mt-1 text-[13.5px] font-semibold leading-snug text-slate-800", mono && "font-mono text-[13px]")}>{value}</p>
    </div>
  );
}

export default RegistrationDetailPage;
