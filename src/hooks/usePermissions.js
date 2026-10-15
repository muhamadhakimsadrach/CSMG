import { useAuth } from "@/context/AuthContext";
import { MODULES } from "@/lib/seedData";

/**
 * usePermissions - pembungkus matriks izin granular.
 * Dipakai seluruh komponen UI untuk menyembunyikan/menonaktifkan tombol aksi.
 */
export function usePermissions() {
  const { can, canAny, isAdmin, profile, roles, activeRole, permissions, userId, email, user, signOut, booting } = useAuth();

  const matrixFor = (roleId) => MODULES.map((m) => {
    const row = permissions.find((p) => String(p.role_id) === String(roleId) && p.module_name === m.key);
    return {
      module: m.key,
      label: m.label,
      short: m.short,
      can_create: Boolean(row?.can_create),
      can_read: Boolean(row?.can_read),
      can_update: Boolean(row?.can_update),
      can_delete: Boolean(row?.can_delete),
    };
  });

  return { can, canAny, isAdmin, matrixFor, profile, roles, activeRole, permissions, userId, email, user, signOut, booting };
}

export const MODULE_LIST = MODULES;
export default usePermissions;
