import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import { createProperty } from "@/lib/admin/property-actions";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type PropertyRow = Pick<
  Database["public"]["Tables"]["properties"]["Row"],
  "id" | "name" | "address" | "is_active" | "default_cleaning_duration_minutes"
>;

type PropertiesPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function AdminPropertiesPage({ searchParams }: PropertiesPageProps) {
  await requireRole(["administrator"]);
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("properties")
    .select("id,name,address,is_active,default_cleaning_duration_minutes")
    .order("name");
  const properties = (data ?? []) as PropertyRow[];

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-brand-moss">Administrator</p>
          <h1 className="mt-2 text-3xl font-semibold text-brand-ink">Properties</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            Manage property records and bedroom setup templates for cleaning jobs.
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-brand-ink transition hover:bg-brand-mint focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2"
        >
          Admin dashboard
        </Link>
      </div>

      {resolvedSearchParams?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {resolvedSearchParams.error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="grid gap-3">
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error.message}
            </p>
          ) : null}

          {properties.map((property) => (
            <Link
              key={property.id}
              href={`/admin/properties/${property.id}`}
              className="flex min-h-28 flex-col justify-between rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition hover:border-brand-moss hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2 sm:flex-row sm:items-center"
            >
              <div className="flex items-start gap-3">
                <Building2 className="mt-1 h-5 w-5 text-brand-moss" aria-hidden="true" />
                <div>
                  <h2 className="text-lg font-semibold text-brand-ink">{property.name}</h2>
                  <p className="mt-1 text-sm text-stone-600">{property.address || "No address recorded"}</p>
                  <p className="mt-2 text-sm text-stone-600">
                    Default duration: {property.default_cleaning_duration_minutes} minutes
                  </p>
                </div>
              </div>
              <span className="mt-3 inline-flex w-fit rounded-full bg-brand-mint px-3 py-1 text-sm font-semibold text-brand-moss sm:mt-0">
                {property.is_active ? "Active" : "Inactive"}
              </span>
            </Link>
          ))}
        </div>

        <form action={createProperty} className="grid h-fit gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-brand-moss" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-brand-ink">Add property</h2>
          </div>
          <label className="grid gap-2 text-sm font-medium text-brand-ink" htmlFor="name">
            Name
            <input
              id="name"
              name="name"
              required
              className="min-h-12 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-brand-ink" htmlFor="address">
            Address
            <textarea
              id="address"
              name="address"
              rows={3}
              className="rounded-md border border-stone-300 px-3 py-2 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-brand-ink" htmlFor="defaultCleaningDurationMinutes">
            Default duration minutes
            <input
              id="defaultCleaningDurationMinutes"
              name="defaultCleaningDurationMinutes"
              type="number"
              min={1}
              defaultValue={180}
              required
              className="min-h-12 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-brand-ink" htmlFor="notes">
            Notes
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="rounded-md border border-stone-300 px-3 py-2 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
            />
          </label>
          <button
            type="submit"
            className="min-h-12 rounded-md bg-brand-moss px-4 text-base font-semibold text-white transition hover:bg-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2"
          >
            Create property
          </button>
        </form>
      </div>
    </section>
  );
}
