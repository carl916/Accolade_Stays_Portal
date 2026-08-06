"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { bedConfigurationSchema, cleaningTypeSchema, supportedCleaningDurationSchema } from "@/lib/domain/operations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";

type CreateCleaningJobArgs = Database["public"]["Functions"]["create_cleaning_job_with_bedroom_snapshots"]["Args"];

const createCleaningJobSchema = z
  .object({
    propertyId: z.string().uuid("Choose a property."),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a cleaning date."),
    expectedStartTime: z.string().optional(),
    expectedStartTimeWindowEnd: z.string().optional(),
    guestArrivalDeadline: z.string().optional(),
    expectedDurationMinutes: supportedCleaningDurationSchema,
    cleaningType: cleaningTypeSchema,
    instructions: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    requiredConfigurations: z.record(z.string().uuid(), bedConfigurationSchema)
  })
  .refine(
    (value) =>
      !value.expectedStartTime ||
      !value.expectedStartTimeWindowEnd ||
      value.expectedStartTimeWindowEnd >= value.expectedStartTime,
    {
      message: "The end of the time window cannot be before the start time.",
      path: ["expectedStartTimeWindowEnd"]
    }
  );

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
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
  const errorPath = propertyId ? `/admin/jobs/new?propertyId=${encodeURIComponent(propertyId)}` : "/admin/jobs/new";
  const parsed = createCleaningJobSchema.safeParse({
    propertyId,
    scheduledDate: getFormString(formData, "scheduledDate"),
    expectedStartTime: getFormString(formData, "expectedStartTime") || null,
    expectedStartTimeWindowEnd: getFormString(formData, "expectedStartTimeWindowEnd") || null,
    guestArrivalDeadline: getFormString(formData, "guestArrivalDeadline") || null,
    expectedDurationMinutes: getFormString(formData, "expectedDurationMinutes"),
    cleaningType: getFormString(formData, "cleaningType"),
    instructions: getFormString(formData, "instructions"),
    notes: getFormString(formData, "notes"),
    requiredConfigurations: getRequiredConfigurations(formData)
  });

  if (!parsed.success) {
    redirectWithError(errorPath, parsed.error.issues[0]?.message ?? "Check the cleaning job details.");
  }

  const supabase = await createSupabaseServerClient();
  const args = {
    p_property_id: parsed.data.propertyId,
    p_scheduled_date: parsed.data.scheduledDate,
    p_expected_start_time: parsed.data.expectedStartTime || null,
    p_expected_start_time_window_end: parsed.data.expectedStartTimeWindowEnd || null,
    p_guest_arrival_deadline: parsed.data.guestArrivalDeadline
      ? new Date(parsed.data.guestArrivalDeadline).toISOString()
      : null,
    p_expected_duration_minutes: parsed.data.expectedDurationMinutes,
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
