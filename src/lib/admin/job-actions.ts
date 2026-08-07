"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { bedConfigurationSchema, cleaningTypeSchema, getDefaultGuestArrivalDeadlineIso } from "@/lib/domain/operations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";

type CreateCleaningJobArgs = Database["public"]["Functions"]["create_cleaning_job_with_bedroom_snapshots"]["Args"];
type PropertyDefaults = Pick<
  Database["public"]["Tables"]["properties"]["Row"],
  "id" | "default_cleaning_duration_minutes"
>;

const createCleaningJobSchema = z
  .object({
    propertyId: z.string().uuid("Choose a property."),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a cleaning date."),
    guestArrivalDeadline: z.string().optional(),
    cleaningType: cleaningTypeSchema,
    instructions: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    requiredConfigurations: z.record(z.string().uuid(), bedConfigurationSchema)
  });

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function redirectWithError(path: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}error=${encodeURIComponent(message)}`);
}

function getRequiredConfigurations(formData: FormData) {
  const requiredConfigurations: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("requiredConfiguration:") && typeof value === "string") {
      requiredConfigurations[key.replace("requiredConfiguration:", "")] = value;
    }
  }

  return requiredConfigurations;
}

export async function createCleaningJob(formData: FormData) {
  await requireRole(["administrator"]);

  const propertyId = getFormString(formData, "propertyId");
  const scheduledDate = getFormString(formData, "scheduledDate");
  const errorPathSearchParams = new URLSearchParams({ addClean: "1" });
  if (propertyId) {
    errorPathSearchParams.set("propertyId", propertyId);
  }
  if (scheduledDate) {
    errorPathSearchParams.set("scheduledDate", scheduledDate);
  }
  if (getFormString(formData, "propertyLocked") === "1") {
    errorPathSearchParams.set("propertyLocked", "1");
  }
  const errorPath = `/admin/jobs?${errorPathSearchParams.toString()}`;
  const parsed = createCleaningJobSchema.safeParse({
    propertyId,
    scheduledDate,
    guestArrivalDeadline: getFormString(formData, "guestArrivalDeadline") || undefined,
    cleaningType: getFormString(formData, "cleaningType"),
    instructions: getFormString(formData, "instructions"),
    notes: getFormString(formData, "notes"),
    requiredConfigurations: getRequiredConfigurations(formData)
  });

  if (!parsed.success) {
    redirectWithError(errorPath, parsed.error.issues[0]?.message ?? "Check the cleaning job details.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id,default_cleaning_duration_minutes")
    .eq("id", parsed.data.propertyId)
    .eq("is_active", true)
    .maybeSingle();
  const propertyDefaults = property as PropertyDefaults | null;

  if (propertyError || !propertyDefaults) {
    redirectWithError(errorPath, propertyError?.message ?? "Choose an active property.");
  }

  if (propertyDefaults.default_cleaning_duration_minutes <= 0) {
    redirectWithError(errorPath, "The selected property needs a valid default cleaning duration.");
  }

  const args = {
    p_property_id: parsed.data.propertyId,
    p_scheduled_date: parsed.data.scheduledDate,
    p_expected_start_time: null,
    p_expected_start_time_window_end: null,
    p_guest_arrival_deadline: parsed.data.guestArrivalDeadline
      ? new Date(parsed.data.guestArrivalDeadline).toISOString()
      : getDefaultGuestArrivalDeadlineIso(parsed.data.scheduledDate),
    p_expected_duration_minutes: propertyDefaults.default_cleaning_duration_minutes,
    p_cleaning_type: parsed.data.cleaningType,
    p_instructions: parsed.data.instructions || "",
    p_notes: parsed.data.notes || "",
    p_required_configurations: parsed.data.requiredConfigurations as Json
  } satisfies CreateCleaningJobArgs;
  const { data, error } = await supabase.rpc("create_cleaning_job_with_bedroom_snapshots", args as never);
  const jobId = data as string | null;

  if (error || !jobId) {
    redirectWithError(errorPath, error?.message ?? "Cleaning job could not be created.");
  }

  revalidatePath("/admin/jobs");
  redirect(`/admin/jobs/${jobId}`);
}
