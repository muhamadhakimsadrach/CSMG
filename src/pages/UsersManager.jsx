import { useCallback, useMemo, useState } from "react";
import { IdCard, ShieldCheck, Trash2, UserPlus, Users2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card, PageHeader } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { SearchInput, Select, Toggle } from "@/components/common/Field";
import { EmptyState, ErrorState, LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Modal } from "@/components/common/Modal";
import { Reveal } from "@/components/common/Reveal";
import { Pagination, Table } from "@/components/common/Table";
import { UserForm } from "@/components/forms/UserForm";
import { useAuth } from "@/context/AuthContext";
import { useConfirm, useToast } from "@/context/ToastContext";
import { logActivity } from "@/lib/audit";
import { isDemoMode, parseError, supabase } from "@/lib/supabaseClient";
import { MODULES } from "@/lib/seedData";
import { formatDate, initials } from "@/lib/utils";
import { cn } from "@/utils/cn";

const PER_PAGE = 8;
const ACTIONS = ["can_create", "can_read", "can_update", "can_delete"];

/**
 * MODUL C.a - User & Granular Access Control Manager.
 * Seluruh aksi (tambah/edit/hapus/ubah status) disembunyikan bila peran
 * aktif tidak memiliki izin pada modul 'pengguna'.
 */
export function UsersManagerPage() {
  const { can, isAdmin, profiles, roles, permissions, userId, refresh, booting, signUp } = useAuth();
  const toast = useToast();
  const confirmAction = useConfirm();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // { mode: 'create' | 'edit', user }
  const [busy, setBusy] = useState(false);

  const canCreate = can("pengguna", "create") || isAdmin;
  const canUpdate = can("pengguna", "update") || isAdmin;
  const canDelete = can("pengguna", "delete") || isAdmin;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (profiles ?? []).filter((p) => {
      if (roleFilter && String(p.role_id) !== String(roleFilter)) return false;
      if (statusFilter === "active" && p.is_active === false) return false;
      if (statusFilter === "inactive" && p.is_active !== false) return false;
      if (!term) return true;
      const role = roles.find((r) => r.id === p.role_id)?.role_name ?? "";
      return [p.full_name, p.email, p.department, role].join(" ").toLowerCase().includes(term);
    });
  }, [profiles, roleFilter, search, statusFilter, roles]);

  const pageData = useMemo(() => {
    const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const safe = Math.min(page, pages);
    return { rows: filtered.slice((safe - 1) * PER_PAGE, safe * PER_PAGE), pages, safe };
  }, [filtered, page]);

  const permissionSummary = useCallback(
    (roleId) => {
      if (roles.find((r) => r.id === roleId)?.role_name === "Admin Pusat") return [{ short: "Semua Modul", tone: "success" }];
      const rows = permissions.filter((p) => String(p.role_id) === String(roleId));
      return rows
        .map((p) => ({
          short: MODULES.find((m) => m.key === p.module_name)?.short ?? p.module_name,
          tone: p.can_delete ? "danger" : p.can_update ? "brand" : p.can_create ? "info" : "neutral",
          actions: ACTIONS.filter((a) => p[a]).map((a) => a.replace("can_", "")).join("/"),
        }))
        .slice(0, 3);
    },
    [permissions, roles]
  );

  const toggleActive = useCallback(
    async (target) => {
      if (!canUpdate) {
        toast.warning("Peran Anda tidak dapat mengubah status akun.");
        return;
      }
      if (String(target.id) === String(userId)) {
        toast.error("Anda tidak dapat menonaktifkan akun sendiri.");
        return;
      }
      const next = target.is_active === false;
      setBusy(true);
      try {
        const { error } = await supabase.from("profiles").update({ is_active: next, updated_at: new Date().toISOString() }).eq("id", target.id);
        if (error) throw new Error(parseError(error, "Gagal memperbarui status akun."));
        await logActivity({
          userId,
          action: next ? "Mengaktifkan kembali akun pengguna" : "Menonaktifkan akun pengguna",
          entityName: "pengguna",
          entityId: target.id,
          details: { full_name: target.full_name, email: target.email },
        });
        await refresh();
        toast.success(`${target.full_name} kini ${next ? "aktif" : "dinonaktifkan"}.`, { title: "Status Akun Diperbarui" });
      } catch (err) {
        toast.error(err.message, { title: "Perubahan Gagal" });
      } finally {
        setBusy(false);
      }
    },
    [canUpdate, refresh, toast, userId]
  );

  const saveUser = useCallback(
    async (form) => {
      setBusy(true);
      try {
        if (modal?.mode === "edit" && modal.user.id === userId && (form.is_active === false || roles.find((role) => role.id === form.role_id)?.role_name !== "Admin Pusat")) {
          throw new Error("Anda tidak dapat menonaktifkan atau mencabut peran Admin Pusat dari akun sendiri.");
        }
        if (modal?.mode === "create") {
          await signUp({
            email: form.email,
            password: form.password,
            fullName: form.full_name,
            roleId: form.role_id,
            phoneNumber: form.phone_number,
            department: form.department,
          });
          // Baris profil dibuat otomatis oleh sistem database.
        } else {
          const updatePayload = {
            full_name: form.full_name.trim(),
            email: (form.email ?? "").trim().toLowerCase() || null,
            role_id: form.role_id || null,
            phone_number: form.phone_number || null,
            department: form.department || null,
            sales_code: form.sales_code?.trim() ? form.sales_code.trim().toUpperCase() : null,
            customer_id: form.customer_id?.trim() ? form.customer_id.trim().toUpperCase() : null,
            is_active: form.is_active !== false,
            updated_at: new Date().toISOString(),
          };
          const { error } = await supabase
            .from("profiles")
            .update(updatePayload)
            .eq("id", modal.user.id);
          if (error) throw new Error(parseError(error, "Gagal memperbarui profil pengguna."));

          // If password was entered during edit, update credentials
          if (form.password?.trim()) {
            await supabase.from("auth_users").update({ password: form.password.trim() }).eq("email", form.email.toLowerCase());
          }
        }

        if (form.matrix?.length) {
          for (const row of form.matrix) {
            const payload = {
              role_id: form.role_id,
              module_name: row.module,
              can_create: row.can_create,
              can_read: row.can_read,
              can_update: row.can_update,
              can_delete: row.can_delete,
            };
            const { error: pErr } = await supabase.from("permissions").upsert(payload, { onConflict: "role_id,module_name" });
            if (pErr) {
              const { error: uErr } = await supabase
                .from("permissions")
                .update({ can_create: payload.can_create, can_read: payload.can_read, can_update: payload.can_update, can_delete: payload.can_delete })
                .eq("role_id", form.role_id)
                .eq("module_name", row.module);
              if (uErr) throw new Error(parseError(uErr, "Gagal menyimpan matriks izin peran."));
            }
          }
        }

        await logActivity({
          userId,
          action: modal?.mode === "create" ? "Membuat akun pengguna baru" : "Memperbarui profil & izin pengguna",
          entityName: "pengguna",
          entityId: modal?.user?.id ?? null,
          details: { full_name: form.full_name, role_name: roles.find((r) => r.id === form.role_id)?.role_name, modules: form.matrix?.length ?? 0 },
        });
        await refresh();
        setModal(null);
        toast.success(modal?.mode === "create" ? "Akun pengguna baru berhasil dibuat." : "Profil dan matriks izin tersimpan.", {
          title: "Pengguna Tersimpan",
        });
      } catch (err) {
        toast.error(err.message ?? "Gagal menyimpan pengguna.", { title: "Penyimpanan Gagal" });
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [modal, refresh, roles, toast, userId, signUp]
  );

  const removeUser = useCallback(
    async (target) => {
      const ok = await confirmAction({
        title: "Cabut Akses Pengguna",
        message: `Baris profil ${target.full_name} akan dihapus dari tabel profiles. Akses login dicabut pada sinkronisasi berikutnya.`,
        confirmLabel: "Ya, Cabut Akses",
      });
      if (!ok) return;
      setBusy(true);
      try {
        const { error, data } = await supabase.from("profiles").delete().eq("id", target.id);
        if (data?.error) throw new Error(data.error);
        if (error) throw new Error(parseError(error, "Gagal mencabut akses pengguna."));
        await logActivity({
          userId,
          action: "Mencabut akses pengguna",
          entityName: "pengguna",
          entityId: target.id,
          details: { full_name: target.full_name, email: target.email },
        });
        await refresh();
        toast.success("Akses pengguna dicabut.", { title: "Selesai" });
      } catch (err) {
        toast.error(err.message, { title: "Gagal Menghapus" });
      } finally {
        setBusy(false);
      }
    },
    [confirmAction, refresh, toast, userId]
  );

  if (booting) return <LoadingSpinner label="Memuat direktori pengguna…" className="py-20" />;

  const columns = [
    {
      key: "full_name",
      header: "Pengguna",
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-800 font-display text-[12px] font-semibold text-white">
            {initials(row.full_name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-slate-900">
              {row.full_name}
              {String(row.id) === String(userId) ? <span className="ml-1.5 text-[11px] font-medium text-slate-400">(Anda)</span> : null}
            </p>
            <p className="truncate text-[11.5px] text-slate-500">{row.email ?? "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role_id",
      header: "Peran",
      render: (row) => {
        const role = roles.find((r) => r.id === row.role_id);
        return (
          <div className="flex flex-col items-start gap-1">
            <Badge tone={role?.role_name === "Admin Pusat" ? "success" : "brand"} dot>
              {role?.role_name ?? "Tanpa Peran"}
            </Badge>
            <span className="text-[11px] text-slate-400">{row.department ?? "Unit tidak disebutkan"}</span>
          </div>
        );
      },
    },
    {
      key: "permissions",
      header: "Cakupan Izin",
      render: (row) => {
        const summary = permissionSummary(row.role_id);
        if (!summary.length) return <span className="text-[12px] text-slate-400">Belum ada izin modul</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {summary.map((s) => (
              <Badge key={s.short} tone={s.tone} size="sm">
                {s.short}
                {s.actions ? <span className="ml-1 font-mono text-[10px] opacity-70">{s.actions}</span> : null}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      key: "is_active",
      header: "Status",
      align: "center",
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Toggle checked={row.is_active !== false} disabled={!canUpdate || busy} onChange={() => toggleActive(row)} label={row.is_active === false ? "Nonaktif" : "Aktif"} />
        </div>
      ),
    },
    { key: "created_at", header: "Terdaftar", align: "right", render: (row) => <span className="text-[12px] text-slate-500">{formatDate(row.created_at)}</span> },
    {
      key: "actions",
      header: "Aksi",
      align: "right",
      render: (row) =>
        canUpdate || canDelete ? (
          <div className="flex items-center justify-end gap-1">
            {canUpdate ? (
              <Button size="xs" variant="ghost" icon={IdCard} onClick={(e) => { e.stopPropagation(); setModal({ mode: "edit", user: row }); }}>
                Kelola
              </Button>
            ) : null}
            {canDelete && String(row.id) !== String(userId) ? (
              <Button size="xs" variant="ghost" icon={Trash2} className="text-rose-600 hover:bg-rose-50" onClick={(e) => { e.stopPropagation(); removeUser(row); }}>
                <span className="sr-only">Cabut akses</span>
              </Button>
            ) : null}
          </div>
        ) : (
          <span className="text-[11.5px] text-slate-300">hanya baca</span>
        ),
    },
  ];

  const isAdminOnly = !can("pengguna", "read") && !isAdmin;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengguna & Matriks Izin Akses"
        description="Kelola akun petugas, tentukan peran kerja, dan atur hak create/read/update/delete pada tiap modul aplikasi."
        actions={
          canCreate ? (
            <Button icon={UserPlus} onClick={() => setModal({ mode: "create", user: null })}>
              Tambah Pengguna
            </Button>
          ) : null
        }
      />

      {isAdminOnly ? (
        <Card>
          <EmptyState
            icon={ShieldCheck}
            title="Khusus Admin Pusat"
            description="Manajemen pengguna dan matriks izin hanya dapat dibuka oleh peran Admin Pusat sesuai kebijakan RLS."
          />
        </Card>
      ) : (
        <Reveal>
          <Card>
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <div className="sm:max-w-xs sm:flex-1">
                  <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari nama, email, atau unit…" />
                </div>
                <div className="flex gap-2">
                  <Select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="h-10 w-full sm:w-44">
                    <option value="">Seluruh peran</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.role_name}
                      </option>
                    ))}
                  </Select>
                  <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="h-10 w-full sm:w-36">
                    <option value="">Semua status</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </Select>
                </div>
              </div>
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500">
                <Users2 className="h-4 w-4 text-slate-400" aria-hidden />
                {filtered.length} akun
              </p>
            </div>

            <Table
              columns={columns}
              rows={pageData.rows}
              sort={null}
              emptyState={
                <EmptyState
                  icon={Users2}
                  title="Tidak ada akun yang cocok"
                  description="Ubah kata kunci pencarian atau filter peran/status untuk melihat akun lain."
                  action={
                    canCreate ? (
                      <Button size="sm" icon={UserPlus} onClick={() => setModal({ mode: "create", user: null })}>
                        Tambah Pengguna
                      </Button>
                    ) : null
                  }
                />
              }
              rowCard={(row) => {
                const role = roles.find((r) => r.id === row.role_id);
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink-800 text-[12px] font-semibold text-white">{initials(row.full_name)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-slate-900">{row.full_name}</p>
                        <p className="truncate text-[11.5px] text-slate-500">{row.email ?? "—"}</p>
                      </div>
                      <Badge tone={role?.role_name === "Admin Pusat" ? "success" : "brand"}>{role?.role_name ?? "Tanpa Peran"}</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Toggle checked={row.is_active !== false} disabled={!canUpdate} onChange={() => toggleActive(row)} label={row.is_active === false ? "Nonaktif" : "Aktif"} />
                      {canUpdate ? (
                        <Button size="xs" variant="secondary" icon={IdCard} onClick={() => setModal({ mode: "edit", user: row })}>
                          Kelola Izin
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              }}
            />
            <Pagination page={pageData.safe} pages={pageData.pages} total={filtered.length} perPage={PER_PAGE} onPageChange={setPage} />
          </Card>
        </Reveal>
      )}

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal?.mode === "create" ? "Tambah Pengguna Baru" : `Kelola Akses - ${modal?.user?.full_name ?? ""}`}
        subtitle="Data akun, peran kerja, dan matriks izin per modul berada pada satu formulir."
        icon={IdCard}
        size="lg"
      >
        {modal ? (
          <UserForm
            editingUser={modal?.mode === "edit" ? modal.user : null}
            roles={roles}
            permissions={permissions}
            onCancel={() => setModal(null)}
            onSubmit={saveUser}
          />
        ) : null}
      </Modal>


    </div>
  );
}

export default UsersManagerPage;
