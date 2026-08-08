"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import {
  bedConfigurationSchema,
  cleaningTypeSchema,
  getDefaultGuestArrivalDeadlineIso,
  supportedCleaningDurationSchema
} from "@/lib/domain/operations";
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
    bookingId: z.string().uuid().optional(),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a cleaning date."),
    expectedStartTime: z.string().optional(),
    guestArrivalDeadline: z.string().optional(),
    cleaningType: cleaningTypeSchema,
    instructions: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    requiredConfigurations: z.record(z.string().uuid(), bedConfigurationSchema)
  });
const jobMutationSchema = z.object({
  jobId: z.string().uuid("Choose a cleaning job."),
  returnPath: z.string().min(1)
});
const updateCleaningJobReviewSchema = jobMutationSchema.extend({
  instructions: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  expectedDurationMinutes: supportedCleaningDurationSchema,
  requiredConfigurations: z.record(z.string().uuid(), bedConfigurationSchema)
});
const assignCleanerSchema = jobMutationSchema.extend({
  cleaningResourceId: z.string().uuid().optional()
});
const addCommentSchema = jobMutationSchema.extend({
  comment: z.string().trim().min(1, "Add a comment before posting.").max(2000, "Keep comments under 2000 characters.")
});

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function redirectWithError(path: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}error=${encodeURIComponent(message)}`);
}

function redirectWithSuccess(path: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}success=${encodeURIComponent(message)}`);
}

function getSafeReturnPath(path: string) {
  if (path.startsWith("/admin/jobs/") || path.startsWith("/manager/jobs/")) {
    return path;
  }

  return "/admin/jobs";
}

function isMissingRpcSignatureError(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "PGRST202" ||
        error.message?.includes("schema cache") ||
        error.message?.includes("Could not find the function"))
  );
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

async function recordJobAuditEvent(args: {
  jobId: string;
  userId: string;
  action: string;
  previousValue?: Json | null;
  newValue?: Json | null;
}) {
  const supabase = await createSupabaseServerClient();

  await supabase.from("cleaning_job_audit_events").insert({
    cleaning_job_id: args.jobId,
    user_id: args.userId,
    action: args.action,
    previous_value: args.previousValue ?? null,
    new_value: args.newValue ?? null
  } as never);
}

function revalidateJobViews(jobId: string) {
  revalidatePath("/admin/jobs");
  revalidatePath("/manager");
  revalidatePath(`/admin/jobs/${jobId}`);
  revalidatePath(`/manager/jobs/${jobId}`);
}

export async function createCleaningJob(formData: FormData) {
  const bookingId = getFormString(formData, "bookingId");
  await requireRole(bookingId ? ["administrator", "cleaning_manager"] : ["administrator"]);

  const propertyId = getFormString(formData, "propertyId");
  const scheduledDate = getFormString(formData, "scheduledDate");
  const errorPathSearchParams = new URLSearchParams({ addClean: "1" });
  if (propertyId) {
    errorPathSearchParams.set("propertyId", propertyId);
  }
  if (bookingId) {
    errorPathSearchParams.set("bookingId", bookingId);
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
    bookingId: bookingId || undefined,
    scheduledDate,
    expectedStartTime: getFormString(formData, "expectedStartTime") || undefined,
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
  const bookingArgs = {
    p_booking_id: parsed.data.bookingId ?? "",
    p_expected_start_time: parsed.data.expectedStartTime || null,
    p_guest_arrival_deadline: parsed.data.guestArrivalDeadline
      ? new Date(parsed.data.guestArrivalDeadline).toISOString()
      : getDefaultGuestArrivalDeadlineIso(parsed.data.scheduledDate),
    p_expected_duration_minutes: propertyDefaults.default_cleaning_duration_minutes,
    p_cleaning_type: parsed.data.cleaningType,
    p_instructions: parsed.data.instructions || "",
    p_notes: parsed.data.notes || "",
    p_required_configurations: parsed.data.requiredConfigurations as Json
  };
  const legacyManualArgs = {
    p_property_id: parsed.data.propertyId,
    p_scheduled_date: parsed.data.scheduledDate,
    p_guest_arrival_deadline: parsed.data.guestArrivalDeadline
      ? new Date(parsed.data.guestArrivalDeadline).toISOString()
      : getDefaultGuestArrivalDeadlineIso(parsed.data.scheduledDate),
    p_expected_duration_minutes: propertyDefaults.default_cleaning_duration_minutes,
    p_cleaning_type: parsed.data.cleaningType,
    p_instructions: parsed.data.instructions || "",
    p_notes: parsed.data.notes || "",
    p_required_configurations: parsed.data.requiredConfigurations as Json
  };
  let createResult = parsed.data.bookingId
    ? await supabase.rpc("create_cleaning_job_from_booking_with_bedroom_snapshots", bookingArgs as never)
    : await supabase.rpc("create_cleaning_job_with_bedroom_snapshots", args as never);

  if (!parsed.data.bookingId && isMissingRpcSignatureError(createResult.error)) {
    createResult = await supabase.rpc("create_cleaning_job_with_bedroom_snapshots", legacyManualArgs as never);
  }

  const jobId = createResult.data as string | null;

  if (createResult.error || !jobId) {
    redirectWithError(errorPath, createResult.error?.message ?? "Cleaning job could not be created.");
  }

  revalidatePath("/admin/jobs");
  revalidatePath(`/admin/jobs/${jobId}`);
  redirect("/admin/jobs");
}

export async function updateCleaningJobReview(formData: FormData) {
  const profile = await requireRole(["administrator", "cleaning_manager"]);
  const parsed = updateCleaningJobReviewSchema.safeParse({
    jobId: getFormString(formData, "jobId"),
    returnPath: getSafeReturnPath(getFormString(formData, "returnPath")),
    instructions: getFormString(formData, "instructions"),
    notes: getFormString(formData, "notes"),
    expectedDurationMinutes: getFormString(formData, "expectedDurationMinutes"),
    requiredConfigurations: getRequiredConfigurations(formData)
  });
  const returnPath = parsed.success ? parsed.data.returnPath : getSafeReturnPath(getFormString(formData, "returnPath"));

  if (!parsed.success) {
    redirectWithError(returnPath, parsed.error.issues[0]?.message ?? "Check the cleaning job details.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: jobData, error: jobError } = await supabase
    .from("cleaning_jobs")
    .select("id,status,instructions,notes,expected_duration_minutes")
    .eq("id", parsed.data.jobId)
    .maybeSingle();
  const job = jobData as Pick<
    Database["public"]["Tables"]["cleaning_jobs"]["Row"],
    "id" | "status" | "instructions" | "notes" | "expected_duration_minutes"
  > | null;

  if (jobError || !job) {
    redirectWithError(returnPath, jobError?.message ?? "Cleaning job not found.");
  }

  if (job.status === "cancelled" || job.status === "completed") {
    redirectWithError(returnPath, "Completed or cancelled cleans cannot be changed here.");
  }

  const { data: bedroomData, error: bedroomsError } = await supabase
    .from("cleaning_job_bedrooms")
    .select("id,bedroom_id,bedroom_name,required_configuration,bedrooms(bedroom_permitted_configurations(configuration,is_active))")
    .eq("cleaning_job_id", parsed.data.jobId)
    .order("bedroom_name");

  if (bedroomsError) {
    redirectWithError(returnPath, bedroomsError.message);
  }

  const bedrooms = (bedroomData ?? []) as {
    id: string;
    bedroom_id: string | null;
    bedroom_name: string;
    required_configuration: Database["public"]["Enums"]["bed_configuration"];
    bedrooms: {
      bedroom_permitted_configurations: {
        configuration: Database["public"]["Enums"]["bed_configuration"];
        is_active: boolean;
      }[];
    } | null;
  }[];

  for (const bedroom of bedrooms) {
    const requiredConfiguration = parsed.data.requiredConfigurations[bedroom.id];

    if (!requiredConfiguration) {
      redirectWithError(returnPath, `Choose the required setup for ${bedroom.bedroom_name}.`);
    }

    const permittedConfigurations =
      bedroom.bedrooms?.bedroom_permitted_configurations
        .filter((configuration) => configuration.is_active)
        .map((configuration) => configuration.configuration) ?? [bedroom.required_configuration];

    if (!permittedConfigurations.includes(requiredConfiguration)) {
      redirectWithError(returnPath, `${requiredConfiguration} is not permitted for ${bedroom.bedroom_name}.`);
    }
  }

  const { error: updateError } = await supabase
    .from("cleaning_jobs")
    .update({
      instructions: parsed.data.instructions ?? "",
      notes: parsed.data.notes ?? "",
      expected_duration_minutes: parsed.data.expectedDurationMinutes
    } as never)
    .eq("id", parsed.data.jobId);

  if (updateError) {
    redirectWithError(returnPath, updateError.message);
  }

  for (const bedroom of bedrooms) {
    const requiredConfiguration = parsed.data.requiredConfigurations[bedroom.id];
    const { error } = await supabase
      .from("cleaning_job_bedrooms")
      .update({ required_configuration: requiredConfiguration } as never)
      .eq("id", bedroom.id)
      .eq("cleaning_job_id", parsed.data.jobId);

    if (error) {
      redirectWithError(returnPath, error.message);
    }
  }

  await recordJobAuditEvent({
    jobId: parsed.data.jobId,
    userId: profile.id,
    action: "clean_details_updated",
    previousValue: {
      instructions: job.instructions,
      notes: job.notes,
      expected_duration_minutes: job.expected_duration_minutes
    },
    newValue: {
      instructions: parsed.data.instructions ?? "",
      notes: parsed.data.notes ?? "",
      expected_duration_minutes: parsed.data.expectedDurationMinutes
    }
  });

  revalidateJobViews(parsed.data.jobId);
  redirectWithSuccess(returnPath, "Clean details saved.");
}

export async function confirmCleaningJob(formData: FormData) {
  const profile = await requireRole(["administrator", "cleaning_manager"]);
  const parsed = jobMutationSchema.safeParse({
    jobId: getFormString(formData, "jobId"),
    returnPath: getSafeReturnPath(getFormString(formData, "returnPath"))
  });
  const returnPath = parsed.success ? parsed.data.returnPath : getSafeReturnPath(getFormString(formData, "returnPath"));

  if (!parsed.success) {
    redirectWithError(returnPath, parsed.error.issues[0]?.message ?? "Choose a cleaning job.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: jobData, error: jobError } = await supabase
    .from("cleaning_jobs")
    .select("id,status")
    .eq("id", parsed.data.jobId)
    .maybeSingle();
  const job = jobData as Pick<Database["public"]["Tables"]["cleaning_jobs"]["Row"], "id" | "status"> | null;

  if (jobError || !job) {
    redirectWithError(returnPath, jobError?.message ?? "Cleaning job not found.");
  }

  if (job.status === "cancelled" || job.status === "completed") {
    redirectWithError(returnPath, "Completed or cancelled cleans cannot be confirmed.");
  }

  const { error } = await supabase
    .from("cleaning_jobs")
    .update({
      status: "awaiting_cleaner_response",
      cleaning_manager_id: profile.id,
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
      requires_review: false,
      booking_change_requires_review: false,
      booking_change_reason: null
    } as never)
    .eq("id", parsed.data.jobId);

  if (error) {
    redirectWithError(returnPath, error.message);
  }

  revalidateJobViews(parsed.data.jobId);
  redirectWithSuccess(returnPath, "Clean confirmed.");
}

export async function assignCleanerToJob(formData: FormData) {
  const profile = await requireRole(["administrator", "cleaning_manager"]);
  const parsed = assignCleanerSchema.safeParse({
    jobId: getFormString(formData, "jobId"),
    returnPath: getSafeReturnPath(getFormString(formData, "returnPath")),
    cleaningResourceId: getFormString(formData, "cleaningResourceId") || getFormString(formData, "cleanerId") || undefined
  });
  const returnPath = parsed.success ? parsed.data.returnPath : getSafeReturnPath(getFormString(formData, "returnPath"));

  if (!parsed.success) {
    redirectWithError(returnPath, parsed.error.issues[0]?.message ?? "Choose a cleaner or team.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: jobData, error: jobError } = await supabase
    .from("cleaning_jobs")
    .select("id,status,assigned_cleaner_id,assigned_cleaning_resource_id,started_at")
    .eq("id", parsed.data.jobId)
    .maybeSingle();
  const job = jobData as Pick<
    Database["public"]["Tables"]["cleaning_jobs"]["Row"],
    "id" | "status" | "assigned_cleaner_id" | "assigned_cleaning_resource_id" | "started_at"
  > | null;

  if (jobError || !job) {
    redirectWithError(returnPath, jobError?.message ?? "Cleaning job not found.");
  }

  if (job.status === "cancelled" || job.status === "completed") {
    redirectWithError(returnPath, "Completed or cancelled cleans cannot be reassigned.");
  }

  if (job.started_at) {
    redirectWithError(returnPath, "Cleans that have already started cannot be reassigned here.");
  }

  let cleaningResource:
    | Pick<
        Database["public"]["Tables"]["cleaning_resources"]["Row"],
        "id" | "name" | "resource_type" | "labour_multiplier" | "primary_user_id" | "is_active"
      >
    | null = null;

  if (parsed.data.cleaningResourceId) {
    const { data: resourceData, error: resourceError } = await supabase
      .from("cleaning_resources")
      .select("id,name,resource_type,labour_multiplier,primary_user_id,is_active")
      .eq("id", parsed.data.cleaningResourceId)
      .eq("is_active", true)
      .maybeSingle();
    const resource = resourceData as Pick<
      Database["public"]["Tables"]["cleaning_resources"]["Row"],
      "id" | "name" | "resource_type" | "labour_multiplier" | "primary_user_id" | "is_active"
    > | null;

    if (resourceError || !resource) {
      redirectWithError(returnPath, resourceError?.message ?? "Choose an active cleaner or team.");
    }

    if (!resource.primary_user_id) {
      redirectWithError(returnPath, "Choose a cleaner or team with a primary login.");
    }

    const { data: primaryUserData, error: primaryUserError } = await supabase
      .from("profiles")
      .select("id,role,is_active")
      .eq("id", resource.primary_user_id)
      .eq("role", "cleaner")
      .eq("is_active", true)
      .maybeSingle();

    if (primaryUserError || !primaryUserData) {
      redirectWithError(returnPath, primaryUserError?.message ?? "The selected resource needs an active cleaner login.");
    }

    cleaningResource = resource;
  }

  const { error } = await supabase
    .from("cleaning_jobs")
    .update({
      assigned_cleaning_resource_id: cleaningResource?.id ?? null,
      assigned_cleaning_resource_name: cleaningResource?.name ?? null,
      assigned_cleaning_resource_type: cleaningResource?.resource_type ?? null,
      assigned_cleaning_resource_labour_multiplier: cleaningResource?.labour_multiplier ?? null,
      assigned_cleaner_id: cleaningResource?.primary_user_id ?? null,
      assigned_at: cleaningResource ? new Date().toISOString() : null,
      working_mode: null,
      effective_labour_multiplier: cleaningResource?.labour_multiplier ?? null,
      status: job.status === "awaiting_approval" ? "awaiting_cleaner_response" : job.status
    } as never)
    .eq("id", parsed.data.jobId);

  if (error) {
    redirectWithError(returnPath, error.message);
  }

  await recordJobAuditEvent({
    jobId: parsed.data.jobId,
    userId: profile.id,
    action: cleaningResource ? "cleaning_resource_assigned" : "cleaning_resource_unassigned",
    previousValue: {
      assigned_cleaner_id: job.assigned_cleaner_id,
      assigned_cleaning_resource_id: job.assigned_cleaning_resource_id
    },
    newValue: cleaningResource
      ? {
          assigned_cleaning_resource_id: cleaningResource.id,
          cleaning_resource_name: cleaningResource.name,
          cleaning_resource_type: cleaningResource.resource_type,
          labour_multiplier: cleaningResource.labour_multiplier,
          primary_user_id: cleaningResource.primary_user_id
        }
      : {
          assigned_cleaning_resource_id: null,
          assigned_cleaner_id: null
        }
  });

  revalidateJobViews(parsed.data.jobId);
  redirectWithSuccess(returnPath, cleaningResource ? "Cleaner / team assigned." : "Cleaner / team removed.");
}

export async function addCleaningJobComment(formData: FormData) {
  const profile = await requireRole(["administrator", "cleaning_manager", "cleaner"]);
  const parsed = addCommentSchema.safeParse({
    jobId: getFormString(formData, "jobId"),
    returnPath: getSafeReturnPath(getFormString(formData, "returnPath")),
    comment: getFormString(formData, "comment")
  });
  const returnPath = parsed.success ? parsed.data.returnPath : getSafeReturnPath(getFormString(formData, "returnPath"));

  if (!parsed.success) {
    redirectWithError(returnPath, parsed.error.issues[0]?.message ?? "Add a comment before posting.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("cleaning_job_comments").insert({
    cleaning_job_id: parsed.data.jobId,
    author_id: profile.id,
    body: parsed.data.comment
  } as never);

  if (error) {
    redirectWithError(returnPath, error.message);
  }

  revalidateJobViews(parsed.data.jobId);
  redirectWithSuccess(returnPath, "Comment added.");
}
