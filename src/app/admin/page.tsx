import { PlaceholderPage } from "@/components/PlaceholderPage";
import { requireRole } from "@/lib/auth/session";
import Link from "next/link";

export default async function AdminPage() {
  const profile = await requireRole(["administrator"]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
      <PlaceholderPage
        eyebrow="Administrator"
        title="Admin workspace"
        description="Create cleaning jobs, manage properties, and review operational exceptions."
        nextAction={`Signed in as ${profile.full_name}. Manage property and bedroom setup before creating jobs.`}
      />
      <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <Link
          href="/admin/properties"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-brand-moss px-4 text-base font-semibold text-white transition hover:bg-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2 sm:w-auto"
        >
          Manage properties
        </Link>
      </div>
    </div>
  );
}
