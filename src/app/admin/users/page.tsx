import { UserPlus, Users } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { inviteUser, updateUserProfile } from "@/lib/admin/user-actions";
import { appRoles, type AppRole } from "@/lib/domain/operations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { FormSubmitButton } from "@/components/admin/FormSubmitButton";

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "email" | "full_name" | "role" | "is_active"
>;

type AdminUsersPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

const roleLabels = {
  administrator: "Administrator",
  cleaning_manager: "Cleaning Manager",
  cleaner: "Cleaner"
} satisfies Record<AppRole, string>;

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  await requireRole(["administrator"]);
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,is_active")
    .order("full_name", { ascending: true });
  const profiles = (data ?? []) as ProfileRow[];

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-normal text-brand-moss">Administrator</p>
        <h1 className="mt-2 text-3xl font-semibold text-brand-ink">Users</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Invite operational users and keep their role and active status up to date.
        </p>
      </div>

      {params?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {params.error}
        </p>
      ) : null}
      {params?.success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          {params.success}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error.message}
        </p>
      ) : null}

      <form action={inviteUser} className="grid gap-3 rounded-lg border border-brand-border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-brand-moss" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-brand-ink">Invite user</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(12rem,0.8fr)_auto] md:items-end">
          <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
            Name
            <input
              name="fullName"
              required
              className="min-h-11 rounded-md border border-brand-border px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
            Email
            <input
              name="email"
              type="email"
              required
              className="min-h-11 rounded-md border border-brand-border px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
            Role
            <select
              name="role"
              defaultValue="cleaner"
              className="min-h-11 rounded-md border border-brand-border bg-white px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
            >
              {appRoles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
          <FormSubmitButton pendingLabel="Inviting..." className="md:w-auto">
            Invite
          </FormSubmitButton>
        </div>
      </form>

      <section className="grid gap-3 rounded-lg border border-brand-border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-brand-moss" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-brand-ink">User access</h2>
        </div>
        <div className="grid gap-2">
          {profiles.map((profile) => (
            <form
              key={profile.id}
              action={updateUserProfile}
              className="grid gap-3 rounded-md border border-brand-border p-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(11rem,0.7fr)_minmax(9rem,0.6fr)_auto] lg:items-end"
            >
              <input type="hidden" name="profileId" value={profile.id} />
              <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
                Name
                <input
                  name="fullName"
                  defaultValue={profile.full_name}
                  required
                  className="min-h-11 rounded-md border border-brand-border px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
                />
              </label>
              <div className="grid gap-1.5 text-sm font-medium text-brand-ink">
                Email
                <p className="flex min-h-11 items-center truncate rounded-md bg-brand-muted px-3 text-base text-stone-700">
                  {profile.email ?? "No email recorded"}
                </p>
              </div>
              <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
                Role
                <select
                  name="role"
                  defaultValue={profile.role}
                  className="min-h-11 rounded-md border border-brand-border bg-white px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
                >
                  {appRoles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
                Status
                <select
                  name="isActive"
                  defaultValue={profile.is_active ? "active" : "inactive"}
                  className="min-h-11 rounded-md border border-brand-border bg-white px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <FormSubmitButton pendingLabel="Saving..." className="lg:w-auto">
                Save
              </FormSubmitButton>
            </form>
          ))}
          {profiles.length === 0 ? (
            <p className="rounded-md bg-brand-muted px-3 py-3 text-sm text-stone-600">No users found.</p>
          ) : null}
        </div>
      </section>
    </section>
  );
}
