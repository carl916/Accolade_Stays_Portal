import { getPublicAppEnv } from "@/lib/env";

export function EnvironmentBanner() {
  const appEnv = getPublicAppEnv();

  if (appEnv === "Production") {
    return null;
  }

  const bannerClassName =
    appEnv === "Staging" ? "bg-brand-mid text-brand-ink" : "bg-brand-pale text-brand-ink";

  return <div className={`${bannerClassName} px-4 py-1.5 text-center text-sm font-semibold`}>{appEnv} environment</div>;
}
