"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { bedConfigurations, physicalBedTypes } from "@/lib/domain/operations";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type PropertyInsert = Database["public"]["Tables"]["properties"]["Insert"];
type PropertyUpdate = Database["public"]["Tables"]["properties"]["Update"];
type BedroomInsert = Database["public"]["Tables"]["bedrooms"]["Insert"];
type BedroomUpdate = Database["public"]["Tables"]["bedrooms"]["Update"];
type BedroomPermittedConfigurationInsert =
  Database["public"]["Tables"]["bedroom_permitted_configurations"]["Insert"];
type BedroomPermittedConfigurationUpdate =
  Database["public"]["Tables"]["bedroom_permitted_configurations"]["Update"];

const propertySchema = z.object({
  name: z.string().trim().min(1, "Property name is required."),
  address: z.string().trim().optional(),
  defaultCleaningDurationMinutes: z.coerce.number().int().positive().default(180),
  notes: z.string().trim().optional()
});

const propertyUpdateSchema = propertySchema.extend({
  propertyId: z.string().uuid(),
  isActive: z.coerce.boolean().default(false)
});

const bedroomSchema = z
  .object({
    propertyId: z.string().uuid(),
    bedroomId: z.string().uuid().optional(),
    name: z.string().trim().min(1, "Bedroom name is required."),
    physicalBedType: z.enum(physicalBedTypes),
    defaultConfiguration: z.enum(bedConfigurations),
    currentConfiguration: z.enum(bedConfigurations),
    permittedConfigurations: z.array(z.enum(bedConfigurations)).min(1),
    isActive: z.coerce.boolean().default(false)
  })
  .refine((value) => value.permittedConfigurations.includes(value.defaultConfiguration), {
    message: "Default configuration must be permitted.",
    path: ["defaultConfiguration"]
  })
  .refine((value) => value.permittedConfigurations.includes(value.currentConfiguration), {
    message: "Current configuration must be permitted.",
    path: ["currentConfiguration"]
  });

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getFormStringArray(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === "string");
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createProperty(formData: FormData) {
  await requireRole(["administrator"]);

  const parsed = propertySchema.safeParse({
    name: getFormString(formData, "name"),
    address: getFormString(formData, "address"),
    defaultCleaningDurationMinutes: getFormString(formData, "defaultCleaningDurationMinutes"),
    notes: getFormString(formData, "notes")
  });

  if (!parsed.success) {
    redirectWithError("/admin/properties", parsed.error.issues[0]?.message ?? "Check the property details.");
  }

  const supabase = await createSupabaseServerClient();
  const newProperty = {
    name: parsed.data.name,
    address: parsed.data.address || null,
    default_cleaning_duration_minutes: parsed.data.defaultCleaningDurationMinutes,
    notes: parsed.data.notes || ""
  } satisfies PropertyInsert;
  const { data, error } = await supabase
    .from("properties")
    .insert(newProperty as never)
    .select("id")
    .single();

  const property = data as { id: string } | null;

  if (error || !property) {
    redirectWithError("/admin/properties", error?.message ?? "Property could not be created.");
  }

  revalidatePath("/admin/properties");
  redirect(`/admin/properties/${property.id}`);
}

export async function updateProperty(formData: FormData) {
  await requireRole(["administrator"]);

  const propertyId = getFormString(formData, "propertyId");
  const parsed = propertyUpdateSchema.safeParse({
    propertyId,
    name: getFormString(formData, "name"),
    address: getFormString(formData, "address"),
    defaultCleaningDurationMinutes: getFormString(formData, "defaultCleaningDurationMinutes"),
    notes: getFormString(formData, "notes"),
    isActive: formData.has("isActive")
  });
  const errorPath = propertyId ? `/admin/properties/${propertyId}` : "/admin/properties";

  if (!parsed.success) {
    redirectWithError(errorPath, parsed.error.issues[0]?.message ?? "Check the property details.");
  }

  const supabase = await createSupabaseServerClient();
  const propertyUpdate = {
    name: parsed.data.name,
    address: parsed.data.address || null,
    default_cleaning_duration_minutes: parsed.data.defaultCleaningDurationMinutes,
    notes: parsed.data.notes || "",
    is_active: parsed.data.isActive
  } satisfies PropertyUpdate;
  const { error } = await supabase
    .from("properties")
    .update(propertyUpdate as never)
    .eq("id", parsed.data.propertyId);

  if (error) {
    redirectWithError(errorPath, error.message);
  }

  revalidatePath("/admin/properties");
  revalidatePath(errorPath);
  redirect(errorPath);
}

export async function createBedroom(formData: FormData) {
  await requireRole(["administrator"]);

  const propertyId = getFormString(formData, "propertyId");
  const parsed = bedroomSchema.safeParse({
    propertyId,
    name: getFormString(formData, "name"),
    physicalBedType: getFormString(formData, "physicalBedType"),
    defaultConfiguration: getFormString(formData, "defaultConfiguration"),
    currentConfiguration: getFormString(formData, "currentConfiguration"),
    permittedConfigurations: getFormStringArray(formData, "permittedConfigurations"),
    isActive: true
  });
  const errorPath = `/admin/properties/${propertyId}`;

  if (!parsed.success) {
    redirectWithError(errorPath, parsed.error.issues[0]?.message ?? "Check the bedroom details.");
  }

  const supabase = await createSupabaseServerClient();
  const newBedroom = {
    property_id: parsed.data.propertyId,
    name: parsed.data.name,
    physical_bed_type: parsed.data.physicalBedType,
    default_configuration: parsed.data.defaultConfiguration,
    current_configuration: parsed.data.currentConfiguration,
    is_active: true
  } satisfies BedroomInsert;
  const { data: bedroomData, error: bedroomError } = await supabase
    .from("bedrooms")
    .insert(newBedroom as never)
    .select("id")
    .single();
  const bedroom = bedroomData as { id: string } | null;

  if (bedroomError || !bedroom) {
    redirectWithError(errorPath, bedroomError?.message ?? "Bedroom could not be created.");
  }

  const permittedRows = parsed.data.permittedConfigurations.map((configuration) => ({
      bedroom_id: bedroom.id,
      configuration,
      is_active: true
    })) satisfies BedroomPermittedConfigurationInsert[];
  const { error: permittedError } = await supabase
    .from("bedroom_permitted_configurations")
    .insert(permittedRows as never[]);

  if (permittedError) {
    redirectWithError(errorPath, permittedError.message);
  }

  revalidatePath(errorPath);
  redirect(errorPath);
}

export async function updateBedroom(formData: FormData) {
  await requireRole(["administrator"]);

  const propertyId = getFormString(formData, "propertyId");
  const bedroomId = getFormString(formData, "bedroomId");
  const parsed = bedroomSchema.safeParse({
    propertyId,
    bedroomId,
    name: getFormString(formData, "name"),
    physicalBedType: getFormString(formData, "physicalBedType"),
    defaultConfiguration: getFormString(formData, "defaultConfiguration"),
    currentConfiguration: getFormString(formData, "currentConfiguration"),
    permittedConfigurations: getFormStringArray(formData, "permittedConfigurations"),
    isActive: formData.has("isActive")
  });
  const errorPath = `/admin/properties/${propertyId}`;

  if (!parsed.success || !parsed.data.bedroomId) {
    redirectWithError(errorPath, parsed.error?.issues[0]?.message ?? "Check the bedroom details.");
  }

  const supabase = await createSupabaseServerClient();
  const bedroomUpdate = {
    name: parsed.data.name,
    physical_bed_type: parsed.data.physicalBedType,
    default_configuration: parsed.data.defaultConfiguration,
    current_configuration: parsed.data.currentConfiguration,
    is_active: parsed.data.isActive
  } satisfies BedroomUpdate;
  const { error: bedroomError } = await supabase
    .from("bedrooms")
    .update(bedroomUpdate as never)
    .eq("id", parsed.data.bedroomId);

  if (bedroomError) {
    redirectWithError(errorPath, bedroomError.message);
  }

  const deactivatePermitted = { is_active: false } satisfies BedroomPermittedConfigurationUpdate;
  const { error: deactivateError } = await supabase
    .from("bedroom_permitted_configurations")
    .update(deactivatePermitted as never)
    .eq("bedroom_id", parsed.data.bedroomId);

  if (deactivateError) {
    redirectWithError(errorPath, deactivateError.message);
  }

  for (const configuration of parsed.data.permittedConfigurations) {
    const permittedRow = {
      bedroom_id: parsed.data.bedroomId,
      configuration,
      is_active: true
    } satisfies BedroomPermittedConfigurationInsert;
    const { error } = await supabase.from("bedroom_permitted_configurations").upsert(
      permittedRow as never,
      {
        onConflict: "bedroom_id,configuration"
      }
    );

    if (error) {
      redirectWithError(errorPath, error.message);
    }
  }

  revalidatePath(errorPath);
  redirect(errorPath);
}
