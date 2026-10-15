import { Droplets } from "lucide-react";
import { useBranding } from "@/context/BrandingContext";
import { cn } from "@/utils/cn";
import { COMPANY } from "@/lib/waterDomain";

export function BrandMark({ className, size = "md", withRing = false }) {
  const { settings } = useBranding();
  return (
    <span className={cn("inline-grid shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-50 text-brand-600", size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-10 w-10", withRing && "ring-1 ring-brand-200", className)}>
      {settings.logo_url ? <img src={settings.logo_url} alt={settings.app_name} className="h-full w-full bg-white object-contain p-1" /> : <Droplets className="h-[60%] w-[60%]" strokeWidth={1.7} aria-hidden />}
    </span>
  );
}

export function BrandWordmark({ className, compact = false }) {
  const { settings } = useBranding();
  return <img src={settings.logo_url || "/images/aetra-logo.png"} alt={settings.logo_url ? settings.app_name : COMPANY.name} className={cn("object-contain", compact ? "h-9 w-24" : "h-[66px] w-[154px]", className)} />;
}
export default BrandMark;
