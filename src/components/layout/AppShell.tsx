import Link from "next/link";
import type { ReactNode } from "react";
import { EnvironmentBanner } from "@/components/layout/EnvironmentBanner";

const navItems = [
  { href: "/admin", label: "Admin" },
  { href: "/manager", label: "Manager" },
  { href: "/cleaner", label: "Cleaner" },
  { href: "/login", label: "Login" }
];

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <EnvironmentBanner />
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-semibold text-brand-ink">
            Accolade Stays
          </Link>
          <nav aria-label="Primary navigation" className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-brand-mint hover:text-brand-moss focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex flex-1">{children}</main>
    </div>
  );
}
