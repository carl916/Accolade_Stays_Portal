import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { UserAdminPanel, type UserAdminProfile } from "@/components/admin/UserAdminPanel";

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "email" | "full_name" | "role" | "cleaner_type" | "is_active"
>;

type AdminUsersPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
    inviteLink?: string;
  }>;
};

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  await requireRole(["administrator"]);
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,cleaner_type,is_active")
    .order("full_name", { ascending: true });
  const profiles = (data ?? []) as ProfileRow[];

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-normal text-brand-moss">Administrator</p>
        <h1 className="mt-2 text-3xl font-semibold text-brand-ink">Users</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Invite operational users and keep their role, cleaner type and active status up to date.
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
      {params?.inviteLink ? (
        <div className="grid gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-3">
          <p className="text-sm font-semibold text-amber-900">Copy this one-time invite link and send it to the user.</p>
          <input
            readOnly
            value={params.inviteLink}
            className="min-h-11 rounded-md border border-amber-300 bg-white px-3 text-sm text-brand-ink outline-none focus:ring-2 focus:ring-brand-focus/30"
          />
        </div>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error.message}
        </p>
      ) : null}

      <UserAdminPanel profiles={profiles as UserAdminProfile[]} />
    </section>
  );
}
