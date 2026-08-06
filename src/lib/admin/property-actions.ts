"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  bedroomSetupBedConfigurations,
  bedroomSetupPhysicalBedTypes,
  supportedCleaningDurationSchema,
  zipAndLinkBedConfigurations
} from "@/lib/domain/operations";
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

export type UpdateBedroomCurrentSetupResult = {
  error?: string;
};

const propertySchema = z.object({
  name: z.string().trim().min(1, "Property name is required."),
  addressLine1: z.string().trim().optional(),
  addressLine2: z.string().trim().optional(),
  town: z.string().trim().optional(),
  county: z.string().trim().optional(),
  postcode: z.string().trim().optional(),
  defaultCleaningDurationMinutes: supportedCleaningDurationSchema.default(180),
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
    physicalBedType: z.enum(bedroomSetupPhysicalBedTypes),
    currentConfiguration: z.enum(bedroomSetupBedConfigurations).optional(),
    isActive: z.coerce.boolean().default(false)
  })
  .transform((value) => {
    if (value.physicalBedType === "fixed_double") {
      return {
        ...value,
        defaultConfiguration: "double" as const,
        currentConfiguration: "double" as const,
        permittedConfigurations: ["double" as const]
      };
    }

    return {
      ...value,
      defaultConfiguration: value.currentConfiguration,
      permittedConfigurations: [...zipAndLinkBedConfigurations]
    };
  })
  .refine((value) => value.physicalBedType !== "zip_and_link" || Boolean(value.currentConfiguration), {
    message: "Current setup is required for a zip-and-link bed.",
    path: ["currentConfiguration"]
  })
  .refine(
    (value) =>
      value.physicalBedType !== "zip_and_link" ||
      (zipAndLinkBedConfigurations as readonly string[]).includes(value.currentConfiguration ?? ""),
    {
      message: "Zip-and-link current setup must be King or Twin.",
      path: ["currentConfiguration"]
    }
  )
  .refine((value) => (value.permittedConfigurations as readonly string[]).includes(value.currentConfiguration ?? ""), {
    message: "Current setup must be permitted.",
    path: ["currentConfiguration"]
  });

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createProperty(formData: FormData) {
  await requireRole(["administrator"]);

  const parsed = propertySchema.safeParse({
    name: getFormString(formData, "name"),
    addressLine1: getFormString(formData, "addressLine1"),
    addressLine2: getFormString(formData, "addressLine2"),
    town: getFormString(formData, "town"),
    county: getFormString(formData, "county"),
    postcode: getFormString(formData, "postcode"),
    defaultCleaningDurationMinutes: getFormString(formData, "defaultCleaningDurationMinutes"),
    notes: getFormString(formData, "notes")
  });

  if (!parsed.success) {
    redirectWithError("/admin/properties", parsed.error.issues[0]?.message ?? "Check the property details.");
  }

  const supabase = await createSupabaseServerClient();
  const newProperty = {
    name: parsed.data.name,
    address_line_1: parsed.data.addressLine1 || "",
    address_line_2: parsed.data.addressLine2 || "",
    town: parsed.data.town || "",
    county: parsed.data.county || "",
    postcode: parsed.data.postcode || "",
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
    addressLine1: getFormString(formData, "addressLine1"),
    addressLine2: getFormString(formData, "addressLine2"),
    town: getFormString(formData, "town"),
    county: getFormString(formData, "county"),
    postcode: getFormString(formData, "postcode"),
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
    address_line_1: parsed.data.addressLine1 || "",
    address_line_2: parsed.data.addressLine2 || "",
    town: parsed.data.town || "",
    county: parsed.data.county || "",
    postcode: parsed.data.postcode || "",
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
    currentConfiguration: getFormString(formData, "currentConfiguration"),
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
    currentConfiguration: getFormString(formData, "currentConfiguration"),
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

export async function updateBedroomCurrentSetup(input: {
  propertyId: string;
  bedroomId: string;
  currentConfiguration: unknown;
}): Promise<UpdateBedroomCurrentSetupResult> {
  await requireRole(["administrator"]);

  const parsed = z
    .object({
      propertyId: z.string().uuid(),
      bedroomId: z.string().uuid(),
      currentConfiguration: z.enum(zipAndLinkBedConfigurations)
    })
    .safeParse(input);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Choose King or Twin."
    };
  }

  const supabase = await createSupabaseServerClient();
  const bedroomUpdate = {
    current_configuration: parsed.data.currentConfiguration,
    default_configuration: parsed.data.currentConfiguration
  } satisfies BedroomUpdate;
  const { error } = await supabase
    .from("bedrooms")
    .update(bedroomUpdate as never)
    .eq("id", parsed.data.bedroomId)
    .eq("property_id", parsed.data.propertyId)
    .eq("physical_bed_type", "zip_and_link");

  if (error) {
    return {
      error: error.message
    };
  }

  revalidatePath(`/admin/properties/${parsed.data.propertyId}`);
  return {};
}
