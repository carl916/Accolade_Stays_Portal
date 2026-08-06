import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/lib/auth/actions";
import { getRoleHomePath } from "@/lib/domain/operations";
import type { AuthProfile } from "@/lib/auth/session";
import { EnvironmentBanner } from "@/components/layout/EnvironmentBanner";

type AppShellProps = {
  children: ReactNode;
  profile: AuthProfile | null;
};

export function AppShell({ children, profile }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <EnvironmentBanner />
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-semibold text-brand-ink">
            Accolade Stays
          </Link>
          <nav aria-label="Primary navigation" className="flex flex-wrap gap-2">
            {profile ? (
              <>
                <Link
                  href={getRoleHomePath(profile.role)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-brand-mint hover:text-brand-moss focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2"
                >
                  Dashboard
                </Link>
                {profile.role === "administrator" ? (
                  <>
                    <Link
                      href="/admin/jobs"
                      className="rounded-md px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-brand-mint hover:text-brand-moss focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2"
                    >
                      Jobs
                    </Link>
                    <Link
                      href="/admin/properties"
                      className="rounded-md px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-brand-mint hover:text-brand-moss focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2"
                    >
                      Properties
                    </Link>
                  </>
                ) : null}
                <span className="hidden items-center px-2 py-2 text-sm text-stone-600 sm:inline-flex">
                  {profile.full_name}
                </span>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="rounded-md px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-brand-mint hover:text-brand-moss focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-brand-mint hover:text-brand-moss focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="flex flex-1">{children}</main>
    </div>
  );
}
