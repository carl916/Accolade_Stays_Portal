"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { syncSmoobuReservations } from "@/lib/smoobu/sync";

type SmoobuPropertyMappingInsert = Database["public"]["Tables"]["smoobu_property_mappings"]["Insert"];
type SmoobuPropertyMappingUpdate = Database["public"]["Tables"]["smoobu_property_mappings"]["Update"];

const mappingSchema = z.object({
  propertyId: z.string().uuid(),
  smoobuApartmentId: z.coerce.number().int().positive("Choose a Smoobu apartment."),
  smoobuApartmentName: z.string().trim().min(1, "Apartment name is required.")
});

const syncSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function redirectWithError(path: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}error=${encodeURIComponent(message)}`);
}

export async function saveSmoobuPropertyMapping(formData: FormData) {
  await requireRole(["administrator"]);

  const propertyId = getFormString(formData, "propertyId");
  const errorPath = propertyId ? `/admin/properties/${propertyId}` : "/admin/properties";
  const parsed = mappingSchema.safeParse({
    propertyId,
    smoobuApartmentId: getFormString(formData, "smoobuApartmentId"),
    smoobuApartmentName: getFormString(formData, "smoobuApartmentName")
  });

  if (!parsed.success) {
    redirectWithError(errorPath, parsed.error.issues[0]?.message ?? "Check the Smoobu mapping.");
  }

  const supabase = await createSupabaseServerClient();
  const mapping = {
    property_id: parsed.data.propertyId,
    provider: "smoobu",
    smoobu_apartment_id: parsed.data.smoobuApartmentId,
    smoobu_apartment_name: parsed.data.smoobuApartmentName,
    is_active: true,
    last_verified_at: new Date().toISOString()
  } satisfies SmoobuPropertyMappingInsert;
  const { error } = await supabase.from("smoobu_property_mappings").upsert(mapping as never, {
    onConflict: "property_id,provider"
  });

  if (error) {
    redirectWithError(errorPath, error.message);
  }

  revalidatePath(errorPath);
  revalidatePath("/admin/jobs");
  redirect(errorPath);
}

export async function disconnectSmoobuPropertyMapping(formData: FormData) {
  await requireRole(["administrator"]);

  const propertyId = getFormString(formData, "propertyId");
  const errorPath = propertyId ? `/admin/properties/${propertyId}` : "/admin/properties";
  const parsed = z.object({ propertyId: z.string().uuid() }).safeParse({ propertyId });

  if (!parsed.success) {
    redirectWithError(errorPath, "Choose a property.");
  }

  const supabase = await createSupabaseServerClient();
  const update = {
    is_active: false
  } satisfies SmoobuPropertyMappingUpdate;
  const { error } = await supabase
    .from("smoobu_property_mappings")
    .update(update as never)
    .eq("property_id", parsed.data.propertyId)
    .eq("provider", "smoobu");

  if (error) {
    redirectWithError(errorPath, error.message);
  }

  revalidatePath(errorPath);
  revalidatePath("/admin/jobs");
  redirect(errorPath);
}

export async function syncSmoobuBookingsNow(formData: FormData) {
  const profile = await requireRole(["administrator"]);
  const parsed = syncSchema.safeParse({
    from: getFormString(formData, "from") || undefined,
    to: getFormString(formData, "to") || undefined
  });

  if (!parsed.success) {
    redirectWithError("/admin/jobs", parsed.error.issues[0]?.message ?? "Check the sync date range.");
  }

  try {
    await syncSmoobuReservations({
      syncType: "manual",
      range: parsed.data.from || parsed.data.to ? { from: parsed.data.from, to: parsed.data.to } : undefined,
      createdBy: profile.id
    });
  } catch (error) {
    redirectWithError("/admin/jobs", error instanceof Error ? error.message : "Smoobu sync failed.");
  }

  revalidatePath("/admin/jobs");
  redirect("/admin/jobs");
}
