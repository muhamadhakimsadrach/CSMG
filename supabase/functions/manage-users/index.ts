import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const respond = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return respond(405, { error: "Metode tidak diizinkan." });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = request.headers.get("Authorization");
    if (!url || !anonKey || !serviceKey) return respond(500, { error: "Konfigurasi layanan administrasi belum tersedia." });
    if (!authorization?.startsWith("Bearer ")) return respond(401, { error: "Sesi autentikasi diperlukan." });

    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: identity, error: identityError } = await caller.auth.getUser(authorization.slice(7));
    if (identityError || !identity.user) return respond(401, { error: "Sesi tidak valid. Silakan masuk kembali." });
    const { data: permitted, error: permissionError } = await caller.rpc("is_admin_pusat");
    if (permissionError || permitted !== true) return respond(403, { error: "Hanya Admin Pusat yang boleh mengelola akun." });

    const input = await request.json();
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    if (input.action === "delete") {
      if (!input.id || input.id === identity.user.id) return respond(400, { error: "Akun sendiri tidak dapat dihapus." });
      const { error } = await admin.auth.admin.deleteUser(input.id);
      if (error) return respond(400, { error: "Akun tidak dapat dihapus. Periksa data yang masih terhubung." });
      await admin.from("activity_logs").insert({ user_id: identity.user.id, action: "Menghapus akun pengguna", entity_name: "pengguna", entity_id: input.id });
      return respond(200, { success: true });
    }
    if (input.action !== "create") return respond(400, { error: "Aksi administrasi tidak valid." });
    const fullName = String(input.full_name || "").trim();
    const email = String(input.email || "").trim().toLowerCase();
    const password = String(input.password || "");
    if (!fullName || fullName.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return respond(400, { error: "Nama, email valid, dan kata sandi minimal 8 karakter diperlukan." });
    }
    const { data: role } = await admin.from("roles").select("id").eq("id", input.role_id).maybeSingle();
    if (!role) return respond(400, { error: "Peran kerja yang dipilih tidak tersedia." });
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: fullName, phone_number: input.phone_number || null },
    });
    if (error || !data.user) return respond(400, { error: "Akun tidak dapat dibuat. Periksa apakah email sudah digunakan atau kata sandi memenuhi kebijakan." });
    const { error: profileError } = await admin.from("profiles").update({
      full_name: fullName, role_id: input.role_id, department: input.department || null,
      phone_number: input.phone_number || null, is_active: true,
    }).eq("id", data.user.id);
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return respond(500, { error: "Profil pengguna tidak dapat disimpan. Pembuatan akun dibatalkan." });
    }
    await admin.from("activity_logs").insert({ user_id: identity.user.id, action: "Membuat akun pengguna", entity_name: "pengguna", entity_id: data.user.id, details: { full_name: fullName, email } });
    return respond(200, { user: { id: data.user.id, email } });
  } catch {
    return respond(500, { error: "Layanan administrasi tidak dapat memproses permintaan. Silakan coba kembali." });
  }
});