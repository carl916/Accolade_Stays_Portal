import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BedroomsSection } from "@/components/admin/BedroomsSection";
import { PropertyDetailsForm } from "@/components/admin/PropertyDetailsForm";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
type BedroomRow = Database["public"]["Tables"]["bedrooms"]["Row"] & {
  bedroom_permitted_configurations: Database["public"]["Tables"]["bedroom_permitted_configurations"]["Row"][];
};

type PropertyDetailPageProps = {
  params: Promise<{
    propertyId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function PropertyDetailPage({ params, searchParams }: PropertyDetailPageProps) {
  await requireRole(["administrator"]);
  const { propertyId } = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: propertyData } = await supabase.from("properties").select("*").eq("id", propertyId).maybeSingle();
  const property = propertyData as PropertyRow | null;

  if (!property) {
    notFound();
  }

  const { data: bedroomData, error: bedroomError } = await supabase
    .from("bedrooms")
    .select("*,bedroom_permitted_configurations(*)")
    .eq("property_id", property.id)
    .order("name");
  const bedrooms = (bedroomData ?? []) as BedroomRow[];

  return (
    <section className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
      <div>
        <Link href="/admin/properties" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-moss">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Properties
        </Link>
      </div>

      {resolvedSearchParams?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {resolvedSearchParams.error}
        </p>
      ) : null}

      <PropertyDetailsForm property={property} />

      <BedroomsSection propertyId={property.id} bedrooms={bedrooms} errorMessage={bedroomError?.message} />
    </section>
  );
}
