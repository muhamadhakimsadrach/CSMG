import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { logActivity } from "@/lib/audit";
import { parseError, supabase } from "@/lib/supabaseClient";
import { readFileAsDataUrl, uploadFile } from "@/lib/storage";
import { nowIso } from "@/lib/utils";
import { COMPANY } from "@/lib/waterDomain";

const BrandingContext = createContext(null);

const FALLBACK_FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#0077BD"/><path d="M16 5C12 11 8 14 8 19a8 8 0 0016 0c0-5-4-8-8-14z" fill="white"/><path d="M12 20a4 4 0 004 4" fill="none" stroke="#00A8BC" stroke-width="2" stroke-linecap="round"/></svg>`
  );

const DEFAULT_SETTINGS = {
  id: null,
  app_name: COMPANY.appName,
  tagline: COMPANY.tagline,
  logo_url: null,
  favicon_url: null,
  accent_color: COMPANY.accent,
  support_email: "",
  support_phone: COMPANY.contactPhone,
};

/**
 * BrandingContext - nama aplikasi, logo, favicon, dan warna aksen bersifat
 * reaktif global (Navbar, Sidebar, Login, dokumen <title>) tanpa reload.
 */
export function BrandingProvider({ children }) {
  const { userId, loadDirectory } = useAuth();
  const toast = useToast();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const applyTheme = useCallback((next) => {
    const accent = next?.accent_color || DEFAULT_SETTINGS.accent_color;
    const root = document.documentElement;
    root.style.setProperty("--color-brand-600", accent);
    root.style.setProperty("--color-brand-500", `color-mix(in srgb, ${accent} 82%, white)`);
    root.style.setProperty("--color-brand-700", `color-mix(in srgb, ${accent} 82%, black)`);
    root.style.setProperty("--color-brand-50", `color-mix(in srgb, ${accent} 9%, white)`);
    root.style.setProperty("--color-brand-100", `color-mix(in srgb, ${accent} 16%, white)`);
    root.style.setProperty("--color-brand-200", `color-mix(in srgb, ${accent} 30%, white)`);
    const name = next?.app_name || DEFAULT_SETTINGS.app_name;
    document.title = `${name} | Portal Layanan Air`;
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = next?.favicon_url || next?.logo_url || FALLBACK_FAVICON;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: qErr } = await supabase.from("app_settings").select("*").maybeSingle();
      if (qErr) throw new Error(parseError(qErr, "Gagal memuat konfigurasi tampilan."));
      const merged = { ...DEFAULT_SETTINGS, ...(data ?? {}) };
      setSettings(merged);
      applyTheme(merged);
      setError(null);
    } catch (err) {
      setError(err.message);
      applyTheme(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, [applyTheme]);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = useCallback(
    async ({ ...form }) => {
      setSaving(true);
      try {
        let logoUrl = settings.logo_url ?? null;
        let faviconUrl = settings.favicon_url ?? null;

        if (form.logoFile instanceof File) {
          const res = await uploadFile(form.logoFile, { bucket: "assets", folder: "branding" });
          logoUrl = res.url;
        } else if (form.logoFile === null) {
          logoUrl = null;
        }

        if (form.faviconFile instanceof File) {
          const res = await uploadFile(form.faviconFile, { bucket: "assets", folder: "branding" });
          faviconUrl = res.url;
        } else if (form.faviconFile === null) {
          faviconUrl = null;
        }

        const payload = {
          app_name: form.app_name.trim(),
          tagline: (form.tagline ?? "").trim(),
          logo_url: logoUrl,
          favicon_url: faviconUrl,
          accent_color: form.accent_color,
          support_email: (form.support_email ?? "").trim(),
          support_phone: (form.support_phone ?? "").trim(),
          updated_by: userId,
          updated_at: nowIso(),
        };

        let saved = null;
        if (settings.id) {
          const { data, error: uErr } = await supabase.from("app_settings").update(payload).eq("id", settings.id).select().single();
          if (uErr) throw new Error(parseError(uErr, "Gagal menyimpan konfigurasi tampilan."));
          saved = data;
        } else {
          const { data, error: iErr } = await supabase.from("app_settings").insert(payload).select().single();
          if (iErr) throw new Error(parseError(iErr, "Gagal membuat konfigurasi tampilan."));
          saved = data;
        }

        const merged = { ...DEFAULT_SETTINGS, ...saved };
        setSettings(merged);
        applyTheme(merged);
        await logActivity({
          userId,
          action: "Memperbarui branding aplikasi",
          entityName: "pengaturan",
          entityId: merged.id,
          details: { app_name: merged.app_name, accent_color: merged.accent_color, logo: Boolean(merged.logo_url) },
        });
        toast.success("Konfigurasi tampilan berhasil disimpan dan langsung diterapkan.", { title: "Perubahan Tersimpan" });
        return true;
      } catch (err) {
        toast.error(err.message, { title: "Gagal Menyimpan" });
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [applyTheme, load, settings, toast, userId]
  );

  const previewFile = useCallback(async (file) => {
    if (!(file instanceof File)) return null;
    return readFileAsDataUrl(file);
  }, []);

  const value = useMemo(
    () => ({ settings, loading, saving, error, saveSettings, previewFile, reload: load, fallbackFavicon: FALLBACK_FAVICON, loadDirectory }),
    [settings, loading, saving, error, saveSettings, previewFile, load, loadDirectory]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding harus dipakai di dalam BrandingProvider.");
  return ctx;
}
