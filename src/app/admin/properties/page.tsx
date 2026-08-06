import { PropertiesListClient, type PropertyCardProperty } from "@/components/admin/PropertiesListClient";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    .select(
      "id,name,address_line_1,address_line_2,town,county,postcode,notes,is_active,default_cleaning_duration_minutes,bedrooms(id,name,current_configuration,physical_bed_type,is_active)"
    )
    .order("name")
    .order("name", { referencedTable: "bedrooms" });
  const properties = (data ?? []) as PropertyCardProperty[];

  return (
    <PropertiesListClient
      properties={properties}
      errorMessage={error?.message}
      searchError={resolvedSearchParams?.error}
    />
  );
}
