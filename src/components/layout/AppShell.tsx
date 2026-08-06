import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import type { AuthProfile } from "@/lib/auth/session";
import { EnvironmentBanner } from "@/components/layout/EnvironmentBanner";
import { PrimaryNavigation } from "@/components/layout/PrimaryNavigation";

type AppShellProps = {
  children: ReactNode;
  profile: AuthProfile | null;
};

export function AppShell({ children, profile }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <EnvironmentBanner />
      <header className="border-b border-brand-border bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex min-h-11 shrink-0 items-center rounded-md focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
            aria-label="Accolade Stays home"
          >
            <Image
              src="/brand/accolade-stays-logo.png"
              alt="Accolade Stays"
              width={267}
              height={70}
              priority
              className="h-auto w-[148px] sm:w-[178px]"
            />
          </Link>
          <PrimaryNavigation profile={profile} />
        </div>
      </header>
      <main className="flex flex-1">{children}</main>
    </div>
  );
}
