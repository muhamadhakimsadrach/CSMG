import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isDemoMode, parseError, db as supabase } from "@/lib/dbClient";
import { createLocalSupabase } from "@/lib/localBackend";
import { nowIso } from "@/lib/utils";
import { DEMO_ACCOUNTS } from "@/lib/seedData";

const AuthContext = createContext(null);

/**
 * AuthContext - sesi autentikasi database terpadu + profil, peran, serta matriks izin granular.
 * Menyediakan helper `can(modul, aksi)` yang dipakai seluruh UI untuk gating.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [booting, setBooting] = useState(true);
  const [actionError, setActionError] = useState(null);

  const loadDirectory = useCallback(async (currentUser) => {
    try {
      const [profRes, roleRes, permRes] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name", { ascending: true }),
        supabase.from("roles").select("*").order("role_name", { ascending: true }),
        supabase.from("permissions").select("*"),
      ]);
      const list = profRes.error ? [] : profRes.data ?? [];
      let activeProfile = currentUser ? list.find((p) => String(p.id) === String(currentUser.id)) ?? null : null;

      if (!activeProfile && currentUser) {
        activeProfile = {
          id: currentUser.id,
          full_name: currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "Pengguna Baru",
          email: currentUser.email ?? null,
          phone_number: currentUser.user_metadata?.phone_number ?? null,
          role_id: null,
          is_active: true,
          created_at: nowIso(),
          updated_at: nowIso(),
        };
        list.unshift(activeProfile);
      }

      setProfiles(list);
      setRoles(roleRes.error ? [] : roleRes.data ?? []);
      setPermissions(permRes.error ? [] : permRes.data ?? []);
      setProfile(activeProfile);
      return { profiles: list, profile: activeProfile };
    } catch (err) {
      console.warn("loadDirectory fallback:", err);
      const fallbackProfile = {
        id: currentUser?.id || "usr_fallback",
        full_name: currentUser?.user_metadata?.full_name || currentUser?.email?.split("@")[0] || "Administrator",
        email: currentUser?.email || "admin@aetra.demo",
        is_active: true,
      };
      setProfiles([fallbackProfile]);
      setRoles([]);
      setPermissions([]);
      setProfile(fallbackProfile);
      return { profiles: [fallbackProfile], profile: fallbackProfile };
    }
  }, []);

  const bootstrap = useCallback(async () => {
    setBooting(true);
    try {
      const { data } = await supabase.auth.getSession();
      let activeSession = data?.session ?? null;
      // Only the isolated local adapter opens a demonstration session automatically.
      if (!activeSession && isDemoMode && window.localStorage.getItem("aetra.demo.signed-out") !== "true") {
        const demo = await supabase.auth.signInWithPassword(DEMO_ACCOUNTS[0]);
        activeSession = demo.data?.session ?? null;
      }
      setSession(activeSession);
      if (activeSession?.user) {
        await loadDirectory(activeSession.user);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("[sigap] bootstrap sesi gagal", error);
      setActionError(error.message);
    } finally {
      setBooting(false);
    }
  }, [loadDirectory]);

  useEffect(() => {
    bootstrap();
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT") {
        setSession(null);
        setProfile(null);
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        setSession(nextSession);
        if (nextSession?.user) {
          window.setTimeout(() => loadDirectory(nextSession.user).catch((error) => setActionError(error.message)), 0);
        }
      }
    });
    return () => {
      data?.subscription?.unsubscribe?.();
      data?.subscription?.remove?.();
    };
  }, [bootstrap, loadDirectory]);

  const signIn = useCallback(
    async ({ email, password }) => {
      setActionError(null);
      try {
        const authRes = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authRes.error) throw new Error(parseError(authRes.error, "Gagal masuk. Periksa kredensial Anda."));
        if (isDemoMode) window.localStorage.removeItem("aetra.demo.signed-out");
        setSession(authRes.data.session);
        const dir = await loadDirectory(authRes.data.session.user);
        return dir;
      } catch (error) {
        setActionError(error.message);
        throw error;
      }
    },
    [loadDirectory]
  );

  const signUp = useCallback(async ({ email, password, fullName, roleId, phoneNumber, department }) => {
    setActionError(null);
    try {
      if (!isDemoMode) {
        const { data, error } = await supabase.functions.invoke("manage-users", { body: {
          action: "create", email: email.trim(), password, full_name: fullName, role_id: roleId, phone_number: phoneNumber, department,
        } });
        if (error || data?.error) throw new Error(data?.error || "Pembuatan akun memerlukan Edge Function manage-users. Pastikan fungsi sudah diterapkan dan sesi Admin Pusat masih aktif.");
        return data.user;
      }
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName, role_id: roleId ?? null, phone_number: phoneNumber ?? null, department: department ?? null },
        },
      });
      if (error) throw new Error(parseError(error, "Gagal membuat akun."));
      return true;
    } catch (error) {
      setActionError(error.message);
      throw error;
    }
  }, []);

  const signInCustomer = useCallback(
    async (customerId) => {
      setActionError(null);
      const clean = String(customerId || "").trim().toUpperCase();
      if (!clean) throw new Error("Masukkan ID Pelanggan atau nomor pendaftaran Anda.");

      let matchedReg = null;
      try {
        const { data: reg } = await supabase
          .from("registrations")
          .select("*")
          .or(`customer_number.ilike.%${clean}%,ticket_number.ilike.%${clean}%,registration_no.ilike.%${clean}%,non_regular_id.ilike.%${clean}%`)
          .maybeSingle();
        if (reg) matchedReg = reg;
      } catch (err) {
        console.warn("Check reg error:", err);
      }

      if (!matchedReg) {
        const local = JSON.parse(window.localStorage.getItem("app_registrations") || "[]");
        matchedReg = local.find(
          (r) =>
            r.customer_number?.toUpperCase() === clean ||
            r.ticket_number?.toUpperCase() === clean ||
            r.registration_no?.toUpperCase() === clean ||
            r.non_regular_id?.toUpperCase() === clean
        );
      }

      const matchedProfile = (profiles ?? []).find(
        (p) => p.customer_id && p.customer_id.toUpperCase() === clean
      );

      if (matchedReg) {
        window.localStorage.setItem("aetra.active_customer_ticket", matchedReg.ticket_number || matchedReg.registration_no);
        window.localStorage.setItem("aetra.active_customer_name", matchedReg.customer_name);
        window.localStorage.setItem("aetra.active_customer_id", clean);
      } else if (matchedProfile) {
        window.localStorage.setItem("aetra.active_customer_name", matchedProfile.full_name);
        window.localStorage.setItem("aetra.active_customer_id", clean);
      } else {
        window.localStorage.setItem("aetra.active_customer_id", clean);
      }

      const email = matchedProfile?.email || "pelanggan@aetra.demo";
      const password = "Pelanggan123!";
      return await signIn({ email, password });
    },
    [profiles, signIn]
  );

  const signOut = useCallback(async () => {
    if (isDemoMode) window.localStorage.setItem("aetra.demo.signed-out", "true");
    window.localStorage.removeItem("aetra.active_customer_ticket");
    window.localStorage.removeItem("aetra.active_customer_name");
    window.localStorage.removeItem("aetra.active_customer_id");
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await loadDirectory(data?.session?.user ?? null);
  }, [loadDirectory]);

  const isAdmin = useMemo(
    () => {
      if (!profile || profile.is_active === false) return false;
      const rName = String(profile?.role_name ?? roles.find((r) => r.id === profile?.role_id)?.role_name ?? "");
      return /admin/i.test(rName);
    },
    [profile, roles]
  );

  const activeRole = useMemo(() => roles.find((r) => r.id === profile?.role_id) ?? null, [roles, profile]);

  const value = useMemo(() => {
    const user = session?.user ?? null;
    const myPerms = permissions.filter((p) => p.role_id === profile?.role_id);
    const can = (module, action = "read") => {
      if (!profile || profile.is_active === false) return false;
      if (isAdmin) return true;
      return myPerms.some((p) => p.module_name === module && Boolean(p[`can_${action}`]));
    };
    const roleStr = String(activeRole?.role_name || profile?.role_name || "").toLowerCase();
    const isCS = /customer service|cs/i.test(roleStr);
    const isSpvSales = /spv sales/i.test(roleStr);
    const isSpvTech = /spv tech/i.test(roleStr);
    const isSales = /sales/i.test(roleStr) && !isSpvSales;
    const isNC = /nc|new connection/i.test(roleStr);
    const isMinorRepair = /minor repair|repair/i.test(roleStr) && !isSpvTech;
    const isCustomer = /pelanggan/i.test(roleStr);

    return {
      session,
      user,
      userId: user?.id ?? null,
      email: user?.email ?? profile?.email ?? null,
      profile,
      profiles,
      roles,
      permissions,
      activeRole,
      roleName: activeRole?.role_name ?? (isAdmin ? "Admin Pusat" : "Belum memiliki peran"),
      isAdmin,
      isCS,
      isSpvSales,
      isSpvTech,
      isSales,
      isNC,
      isMinorRepair,
      isCustomer,
      isDemoMode,
      booting,
      actionError,
      setActionError,
      can,
      canAny: (module) => ["create", "read", "update", "delete"].some((a) => can(module, a)),
      signIn,
      signInCustomer,
      signUp,
      signOut,
      refresh,
      loadDirectory,
    };
  }, [session, profile, profiles, roles, permissions, activeRole, isAdmin, booting, actionError, signIn, signInCustomer, signUp, signOut, refresh, loadDirectory]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider.");
  return ctx;
}
