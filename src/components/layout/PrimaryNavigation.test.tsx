import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PrimaryNavigation } from "@/components/layout/PrimaryNavigation";
import type { Database } from "@/lib/supabase/types";

const navigationMock = vi.hoisted(() => ({
  pathname: "/admin"
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMock.pathname
}));

vi.mock("@/lib/auth/actions", () => ({
  signOut: vi.fn()
}));

const administratorProfile = {
  id: "profile-1",
  email: "carl@example.com",
  full_name: "Carl Gilbert",
  mobile_number: null,
  role: "administrator",
  cleaner_type: null,
  is_active: true,
  created_at: "2026-08-06T00:00:00.000Z",
  updated_at: "2026-08-06T00:00:00.000Z"
} satisfies Database["public"]["Tables"]["profiles"]["Row"];

describe("PrimaryNavigation", () => {
  it("marks the active primary navigation item without using the account menu styling", () => {
    navigationMock.pathname = "/admin/jobs";

    render(<PrimaryNavigation profile={administratorProfile} />);

    const desktopNavigation = screen.getByRole("navigation", { name: "Primary navigation" });
    const jobsLink = within(desktopNavigation).getByRole("link", { name: "Jobs" });

    expect(jobsLink).toHaveAttribute("aria-current", "page");
    expect(jobsLink).toHaveClass("border-brand-primary");
    expect(jobsLink).toHaveClass("text-brand-primary");
    expect(desktopNavigation).not.toHaveClass("overflow-x-auto");
  });

  it("opens and closes the account menu from the signed-in user trigger", () => {
    navigationMock.pathname = "/admin";

    render(<PrimaryNavigation profile={administratorProfile} />);

    fireEvent.click(screen.getByRole("button", { name: /Carl Gilbert/i }));
    expect(screen.getByRole("menu", { name: "Account menu" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Account menu" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Carl Gilbert/i }));
    expect(screen.getByRole("menu", { name: "Account menu" })).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu", { name: "Account menu" })).not.toBeInTheDocument();
  });

  it("opens the mobile menu and shows the current page", () => {
    navigationMock.pathname = "/admin/properties";

    render(<PrimaryNavigation profile={administratorProfile} />);

    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));

    const mobileNavigation = screen.getByRole("navigation", { name: "Mobile navigation" });
    const propertiesLink = within(mobileNavigation).getByRole("link", { name: "Properties" });

    expect(propertiesLink).toHaveAttribute("aria-current", "page");
    expect(propertiesLink).toHaveClass("bg-brand-light");

    fireEvent.click(screen.getByRole("button", { name: "Close navigation menu" }));
    expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).not.toBeInTheDocument();
  });
});
