import { useState } from "react";
import { ArrowRight, ExternalLink, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Field, Input, Select } from "@/components/common/Field";
import { BrandWordmark } from "@/components/common/BrandMark";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";
import { useToast } from "@/context/ToastContext";
import { DEMO_ACCOUNTS } from "@/lib/seedData";
import { COMPANY } from "@/lib/waterDomain";

export function LoginPage() {
  const { signIn, isDemoMode } = useAuth();
  const { settings } = useBranding();
  const toast = useToast();
  const [values, setValues] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [demoRole, setDemoRole] = useState(0);
  const submit = async (event) => {
    event.preventDefault(); setError(null);
    if (!values.email.trim() || !values.password) { setError("Masukkan email dan kata sandi akun Anda."); return; }
    setBusy(true);
    try { await signIn(values); window.location.hash = "/dashboard"; toast.success("Anda berhasil masuk ke portal layanan air."); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <div className="grid min-h-dvh bg-white lg:grid-cols-[0.85fr_1.15fr]">
    <section className="relative flex min-h-dvh flex-col px-7 pb-7 pt-5 sm:px-12 xl:px-20">
      <BrandWordmark className="h-20 w-36" />
      <div className="mx-auto flex w-full max-w-[360px] flex-1 flex-col justify-center py-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600">{settings.tagline}</p>
        <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-1px] text-[#25415c]">Masuk ke portal.</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-slate-400">Satu akses untuk pendaftaran sambungan air dan layanan pelanggan Aetra Tangerang.</p>
        <form onSubmit={submit} className="mt-8 space-y-5">
          {error && <p role="alert" className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-3 text-xs leading-relaxed text-rose-600">{error}</p>}
          <Field label="Email akun" required><Input type="email" icon={Mail} autoComplete="username" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} placeholder="Email pengguna terdaftar" required /></Field>
          <Field label="Kata sandi" required><Input type="password" icon={LockKeyhole} autoComplete="current-password" value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} placeholder="Masukkan kata sandi" required /></Field>
          <Button type="submit" className="h-11 w-full" loading={busy} iconRight={ArrowRight}>Masuk ke dasbor</Button>
        </form>
                {isDemoMode && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <ShieldCheck size={13} className="text-brand-500" />
              Demo Cepat: Klik peran untuk masuk 1-klik
            </p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setValues({ email: account.email, password: account.password });
                    setBusy(true);
                    setError(null);
                    try {
                      await signIn({ email: account.email, password: account.password });
                      window.location.hash = "/dashboard";
                      toast.success(`Masuk sebagai ${account.label}`);
                    } catch (err) {
                      setError(err.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="flex flex-col items-start rounded-lg border border-slate-200 bg-slate-50 p-2 text-left transition-all hover:border-brand-500 hover:bg-brand-50/40 focus:outline-none cursor-pointer"
                >
                  <span className="text-[11px] font-semibold text-slate-800">{account.label}</span>
                  <span className="text-[9px] text-slate-400 truncate w-full">{account.email}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-5 text-[10px] text-slate-400"><span>&copy; {new Date().getFullYear()} PT Aetra Air Tangerang</span><a href={COMPANY.informationUrl} target="_blank" rel="noreferrer" className="hover:text-brand-600">Bantuan layanan</a></div>
    </section>
    <section className="water-banner relative hidden min-h-dvh flex-col justify-between p-12 text-white lg:flex xl:p-16">
      <p className="text-xs font-medium tracking-[0.18em] text-white/60">PT AETRA AIR TANGERANG</p>
      <div className="animate-fade-up"><p className="text-[70px] font-semibold leading-[1.07] tracking-[-4px] xl:text-[85px]">Aetra<br />Tangerang<span className="text-[#76d9db]">.</span></p><h2 className="mt-7 text-[25px] font-medium leading-snug tracking-[-0.5px]">Air bersih,<br />kehidupan lebih baik.</h2><p className="mt-5 max-w-sm text-sm leading-[1.9] text-white/60">Mendekatkan layanan air perpipaan dengan masyarakat. Dari sambungan pertama, untuk setiap kebutuhan pelanggan.</p></div>
      <a href={COMPANY.website} target="_blank" rel="noreferrer" className="flex w-fit items-center gap-2 text-xs font-medium text-white/70 transition-colors hover:text-white">Kenali Aetra Tangerang<ExternalLink size={13} /></a>
    </section>
  </div>;
}
export default LoginPage;
