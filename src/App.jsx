import { useMemo } from "react";
import { Compass, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { BrandMark } from "@/components/common/BrandMark";
import { EmptyState, LoadingSpinner } from "@/components/common/LoadingSpinner";
import { AppShell } from "@/components/common/AppShell";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { BrandingProvider, useBranding } from "@/context/BrandingContext";
import { ToastProvider } from "@/context/ToastContext";
import { WorkflowProvider } from "@/context/WorkflowContext";
import { useRoute, navigate } from "@/lib/router";
import { ActivityLogPage } from "@/pages/ActivityLog";
import { DashboardPage } from "@/pages/Dashboard";
import { LoginPage } from "@/pages/Login";
import { RegistrationDetailPage } from "@/pages/RegistrationDetail";
import { RegistrationsPage } from "@/pages/Registrations";
import { RepairBoardPage } from "@/pages/RepairBoard";
import { SettingsPage } from "@/pages/Settings";
import { UsersManagerPage } from "@/pages/UsersManager";
import { WorkflowBuilderPage } from "@/pages/WorkflowBuilder";
import { FormManagementPage } from "@/pages/FormManagement";

/** Peta rute: judul navbar, kunci modul untuk gerbang izin, dan komponen halaman. */
const ROUTES = {
  "/dashboard": { title: "Dasbor Layanan", subtitle: "Ringkasan pendaftaran, perbaikan air, dan audit sistem", module: null, Page: DashboardPage },
  "/registrations": { title: "Pendaftaran Pelanggan", subtitle: "Portal berkas pasang baru & verifikasi", module: "pendaftaran", Page: RegistrationsPage },
  "/repairs": { title: "Gangguan & Perbaikan", subtitle: "Antrean pekerjaan, penugasan, dan SLA", module: "repair", Page: RepairBoardPage },
  "/forms": { title: "Manajemen Form", subtitle: "Editor formulir kustom ala Google Forms untuk seluruh divisi", module: "pengaturan", Page: FormManagementPage },
  "/workflow": { title: "Alur Kerja", subtitle: "Editor visual tahapan layanan", module: "workflow", Page: WorkflowBuilderPage },
  "/users": { title: "Pengguna & Izin", subtitle: "Akun, peran, dan matriks akses", module: "pengguna", Page: UsersManagerPage },
  "/logs": { title: "Log Aktivitas", subtitle: "Jejak audit perubahan data lintas layanan", module: "log_aktivitas", Page: ActivityLogPage },
  "/settings": { title: "Pusat Pengaturan", subtitle: "Branding, skema, dan keamanan", module: "pengaturan", Page: SettingsPage },
};

function Router() {
  const { path, segments } = useRoute();
  const { can, isAdmin } = useAuth();
  const { settings } = useBranding();

  const resolved = useMemo(() => {
    if (segments[0] === "registrations" && segments[1]) {
      return { meta: ROUTES["/registrations"], params: { id: segments[1] } };
    }
    if (segments[0] === "repairs" && segments[1]) {
      return { meta: ROUTES["/repairs"], params: { id: segments[1] } };
    }
    const meta = ROUTES[`/${segments[0] ?? ""}`] ?? null;
    return { meta, params: {} };
  }, [segments]);

  if (!resolved.meta) {
    return (
      <Card>
        <EmptyState
          icon={Compass}
          title="Halaman tidak ditemukan"
          description={`Rute "${path}" tidak tersedia pada aplikasi ini. Kembali ke dasbor untuk melanjutkan pekerjaan.`}
          action={<Button onClick={() => navigate("/dashboard")}>Ke Dasbor</Button>}
        />
      </Card>
    );
  }

  const { meta, params } = resolved;
  const denied = meta.module && !can(meta.module, "read") && !isAdmin;

  const Page = params.id && meta === ROUTES["/registrations"] ? RegistrationDetailPage : meta.Page;
  const extraProps = params.id
    ? meta === ROUTES["/registrations"]
      ? { id: params.id, onBack: () => navigate("/registrations") }
      : {}
    : {};

  return (
    <AppShell title={meta.title} subtitle={`${settings.app_name} · ${meta.subtitle}`} unread={0}>
      {denied ? (
        <Card>
          <EmptyState
            icon={ShieldQuestion}
            title="Akses Dibatasi Kebijakan RLS"
            description={`Peran Anda tidak memiliki izin baca pada modul “${meta.module}”. Hubungi Admin Pusat untuk penyesuaian matriks izin.`}
            action={<Button variant="secondary" onClick={() => navigate("/dashboard")}>Kembali ke Dasbor</Button>}
          />
        </Card>
      ) : (
        <Page {...extraProps} />
      )}
    </AppShell>
  );
}

function Gate() {
  const { booting, session } = useAuth();
  if (booting) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <BrandMark className="h-14 w-14 animate-pulse rounded-2xl" size="lg" />
          <LoadingSpinner label="Memulihkan sesi terautentikasi…" />
        </div>
      </div>
    );
  }
  if (!session) return <LoginPage />;
  return <Router />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrandingProvider>
          <WorkflowProvider>
            <Gate />
          </WorkflowProvider>
        </BrandingProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
