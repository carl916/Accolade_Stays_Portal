import { getPublicAppEnv } from "@/lib/env";

export function EnvironmentBanner() {
  const appEnv = getPublicAppEnv();

  if (appEnv === "Production") {
    return null;
  }

  return (
    <div className="bg-brand-brass px-4 py-2 text-center text-sm font-semibold text-white">
      {appEnv} environment
    </div>
  );
}
