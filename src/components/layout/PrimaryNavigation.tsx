"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { useEffect, useRef, useState } from "react";
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

function primaryNavClassName(isActive: boolean) {
  return [
    "inline-flex min-h-11 items-center border-b-2 px-1 pt-1 text-sm font-semibold transition focus:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-4",
    isActive
      ? "border-brand-primary text-brand-primary"
      : "border-transparent text-stone-700 hover:border-brand-mid hover:text-brand-primary"
  ].join(" ");
}

function mobileNavClassName(isActive: boolean) {
  return [
    "flex min-h-11 items-center rounded-md px-3 text-base font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2",
    isActive ? "bg-brand-light text-brand-ink" : "text-stone-700 hover:bg-brand-muted hover:text-brand-primary"
  ].join(" ");
}

function accountButtonClassName() {
  return "inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-sm font-semibold text-stone-700 transition hover:bg-brand-muted hover:text-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2";
}

export function PrimaryNavigation({ profile }: PrimaryNavigationProps) {
  const pathname = usePathname();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (accountRef.current && !accountRef.current.contains(target)) {
        setIsAccountOpen(false);
      }

      if (mobileRef.current && !mobileRef.current.contains(target)) {
        setIsMobileOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAccountOpen(false);
        setIsMobileOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!profile) {
    if (pathname === "/" || pathname === "/login") {
      return null;
    }

    return (
      <nav aria-label="Primary navigation" className="flex items-center gap-2">
        <Link href="/login" className={primaryNavClassName(isActivePath(pathname, "/login"))}>
          Login
        </Link>
      </nav>
    );
  }

  const homePath = getRoleHomePath(profile.role);
  const navItems = [
    {
      href: homePath,
      label: "Dashboard",
      isActive: pathname === homePath
    },
    ...(profile.role === "administrator" || profile.role === "cleaning_manager"
      ? [
          {
            href: "/admin/jobs",
            label: "Jobs",
            isActive: isActivePath(pathname, "/admin/jobs")
          }
        ]
      : []),
    ...(profile.role === "administrator"
      ? [
          {
            href: "/admin/properties",
            label: "Properties",
            isActive: isActivePath(pathname, "/admin/properties")
          },
          {
            href: "/admin/users",
            label: "Users",
            isActive: isActivePath(pathname, "/admin/users")
          }
        ]
      : [])
  ];

  return (
    <div className="relative flex flex-1 items-center justify-end">
      <div className="hidden flex-1 items-center justify-between gap-6 md:flex">
        <nav aria-label="Primary navigation" className="ml-8 flex items-center gap-6 whitespace-nowrap">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.isActive ? "page" : undefined}
              className={primaryNavClassName(item.isActive)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div ref={accountRef} className="relative flex items-center border-l border-brand-border pl-5">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={isAccountOpen}
            onClick={() => setIsAccountOpen((current) => !current)}
            className={accountButtonClassName()}
          >
            <span>{profile.full_name}</span>
            <ChevronDown
              className={`h-4 w-4 transition ${isAccountOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
          {isAccountOpen ? (
            <div
              role="menu"
              aria-label="Account menu"
              className="absolute right-0 top-full z-20 mt-2 min-w-40 rounded-md border border-brand-border bg-white p-1 shadow-lg"
            >
              <form action={signOut}>
                <button
                  type="submit"
                  role="menuitem"
                  className="flex min-h-10 w-full items-center rounded-sm px-3 text-left text-sm font-semibold text-stone-700 transition hover:bg-brand-muted hover:text-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>

      <div ref={mobileRef} className="md:hidden">
        <button
          type="button"
          aria-label={isMobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMobileOpen}
          onClick={() => setIsMobileOpen((current) => !current)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-brand-ink transition hover:bg-brand-muted hover:text-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2"
        >
          {isMobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>

        {isMobileOpen ? (
          <div className="absolute right-0 top-full z-20 mt-3 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-brand-border bg-white p-3 shadow-lg">
            <nav aria-label="Mobile navigation" className="grid gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={item.isActive ? "page" : undefined}
                  onClick={() => setIsMobileOpen(false)}
                  className={mobileNavClassName(item.isActive)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-3 border-t border-brand-border pt-3">
              <p className="px-3 pb-2 text-sm font-semibold text-brand-ink">{profile.full_name}</p>
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex min-h-11 w-full items-center rounded-md px-3 text-left text-base font-semibold text-stone-700 transition hover:bg-brand-muted hover:text-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
