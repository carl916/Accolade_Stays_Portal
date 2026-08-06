"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth/actions";
import { getRoleHomePath } from "@/lib/domain/operations";
import type { Database } from "@/lib/supabase/types";

type AuthProfile = Database["public"]["Tables"]["profiles"]["Row"];

type PrimaryNavigationProps = {
  profile: AuthProfile | null;
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

function navClassName(isActive: boolean) {
  return [
    "rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2",
    isActive
      ? "bg-brand-navActive text-brand-ink"
      : "text-stone-700 hover:bg-brand-navActive hover:text-brand-darkSlate"
  ].join(" ");
}

export function PrimaryNavigation({ profile }: PrimaryNavigationProps) {
  const pathname = usePathname();

  if (!profile) {
    if (pathname === "/" || pathname === "/login") {
      return null;
    }

    return (
      <nav aria-label="Primary navigation" className="flex items-center gap-2">
        <Link href="/login" className={navClassName(isActivePath(pathname, "/login"))}>
          Login
        </Link>
      </nav>
    );
  }

  const homePath = getRoleHomePath(profile.role);

  return (
    <nav aria-label="Primary navigation" className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
      <Link href={homePath} className={navClassName(pathname === homePath)}>
        Dashboard
      </Link>
      {profile.role === "administrator" ? (
        <>
          <Link href="/admin/jobs" className={navClassName(isActivePath(pathname, "/admin/jobs"))}>
            Jobs
          </Link>
          <Link href="/admin/properties" className={navClassName(isActivePath(pathname, "/admin/properties"))}>
            Properties
          </Link>
        </>
      ) : null}
      <span className="hidden items-center px-2 py-2 text-sm text-stone-600 sm:inline-flex">{profile.full_name}</span>
      <form action={signOut}>
        <button type="submit" className={navClassName(false)}>
          Sign out
        </button>
      </form>
    </nav>
  );
}
