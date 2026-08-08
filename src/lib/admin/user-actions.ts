"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { appRoleSchema, cleaningResourceTypeSchema, getDefaultLabourMultiplier } from "@/lib/domain/operations";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

const inviteUserSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the user's name."),
  email: z.string().trim().email("Enter a valid email address.").toLowerCase(),
  role: appRoleSchema
});
const updateUserSchema = z.object({
  profileId: z.string().uuid("Choose a user."),
  fullName: z.string().trim().min(2, "Enter the user's name."),
  role: appRoleSchema,
  isActive: z.enum(["active", "inactive"])
});
const cleaningResourceFormSchema = z.object({
  name: z.string().trim().min(2, "Enter the cleaner or team name."),
  resourceType: cleaningResourceTypeSchema,
  primaryUserId: z.string().uuid("Choose a valid primary login.").optional(),
  isActive: z.enum(["active", "inactive"]).default("active")
});
const updateCleaningResourceFormSchema = cleaningResourceFormSchema.extend({
  resourceId: z.string().uuid("Choose a cleaning resource.")
});

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function redirectWithError(message: string): never {
  redirect(`/admin/users?error=${encodeURIComponent(message)}`);
}

function redirectWithSuccess(message: string): never {
  redirect(`/admin/users?success=${encodeURIComponent(message)}`);
}

async function validatePrimaryCleanerLogin(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string | undefined) {
  if (!userId) {
    return;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .eq("role", "cleaner")
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    redirectWithError(error?.message ?? "Choose an active cleaner as the primary login.");
  }
}

export async function inviteUser(formData: FormData) {
  await requireRole(["administrator"]);
  const parsed = inviteUserSchema.safeParse({
    fullName: getFormString(formData, "fullName"),
    email: getFormString(formData, "email"),
    role: getFormString(formData, "role")
  });

  if (!parsed.success) {
    redirectWithError(parsed.error.issues[0]?.message ?? "Check the user details.");
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: {
      full_name: parsed.data.fullName,
      role: parsed.data.role
    }
  });

  if (error || !data.user) {
    redirectWithError(error?.message ?? "Supabase did not return the invited user.");
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: data.user.id,
      email: parsed.data.email,
      full_name: parsed.data.fullName,
      role: parsed.data.role,
      is_active: true
    },
    { onConflict: "id" }
  );

  if (profileError) {
    redirectWithError(profileError.message);
  }

  if (parsed.data.role === "cleaner") {
    const { error: resourceError } = await supabase.from("cleaning_resources").upsert(
      {
        name: parsed.data.fullName,
        resource_type: "individual",
        labour_multiplier: 1,
        primary_user_id: data.user.id,
        is_active: true
      } satisfies Database["public"]["Tables"]["cleaning_resources"]["Insert"],
      { onConflict: "name" }
    );

    if (resourceError) {
      redirectWithError(resourceError.message);
    }
  }

  revalidatePath("/admin/users");
  redirectWithSuccess("Invite sent.");
}

export async function updateUserProfile(formData: FormData) {
  const currentProfile = await requireRole(["administrator"]);
  const parsed = updateUserSchema.safeParse({
    profileId: getFormString(formData, "profileId"),
    fullName: getFormString(formData, "fullName"),
    role: getFormString(formData, "role"),
    isActive: getFormString(formData, "isActive")
  });

  if (!parsed.success) {
    redirectWithError(parsed.error.issues[0]?.message ?? "Check the user details.");
  }

  if (parsed.data.profileId === currentProfile.id && parsed.data.isActive === "inactive") {
    redirectWithError("You cannot deactivate your own profile.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      role: parsed.data.role,
      is_active: parsed.data.isActive === "active"
    } as never)
    .eq("id", parsed.data.profileId);

  if (error) {
    redirectWithError(error.message);
  }

  revalidatePath("/admin/users");
  revalidatePath("/", "layout");
  redirectWithSuccess("User updated.");
}

export async function createCleaningResource(formData: FormData) {
  await requireRole(["administrator"]);
  const parsed = cleaningResourceFormSchema.safeParse({
    name: getFormString(formData, "name"),
    resourceType: getFormString(formData, "resourceType"),
    primaryUserId: getFormString(formData, "primaryUserId") || undefined,
    isActive: "active"
  });

  if (!parsed.success) {
    redirectWithError(parsed.error.issues[0]?.message ?? "Check the cleaner or team details.");
  }

  const supabase = await createSupabaseServerClient();
  await validatePrimaryCleanerLogin(supabase, parsed.data.primaryUserId);

  const resourceInsert = {
    name: parsed.data.name,
    resource_type: parsed.data.resourceType,
    labour_multiplier: getDefaultLabourMultiplier(parsed.data.resourceType),
    primary_user_id: parsed.data.primaryUserId ?? null,
    is_active: true
  } satisfies Database["public"]["Tables"]["cleaning_resources"]["Insert"];
  const { error } = await supabase.from("cleaning_resources").insert(resourceInsert as never);

  if (error) {
    redirectWithError(error.message);
  }

  revalidatePath("/admin/users");
  redirectWithSuccess("Cleaning resource created.");
}

export async function updateCleaningResource(formData: FormData) {
  await requireRole(["administrator"]);
  const parsed = updateCleaningResourceFormSchema.safeParse({
    resourceId: getFormString(formData, "resourceId"),
    name: getFormString(formData, "name"),
    resourceType: getFormString(formData, "resourceType"),
    primaryUserId: getFormString(formData, "primaryUserId") || undefined,
    isActive: getFormString(formData, "isActive")
  });

  if (!parsed.success) {
    redirectWithError(parsed.error.issues[0]?.message ?? "Check the cleaner or team details.");
  }

  const supabase = await createSupabaseServerClient();
  await validatePrimaryCleanerLogin(supabase, parsed.data.primaryUserId);

  const resourceUpdate = {
    name: parsed.data.name,
    resource_type: parsed.data.resourceType,
    labour_multiplier: getDefaultLabourMultiplier(parsed.data.resourceType),
    primary_user_id: parsed.data.primaryUserId ?? null,
    is_active: parsed.data.isActive === "active"
  } satisfies Database["public"]["Tables"]["cleaning_resources"]["Update"];
  const { error } = await supabase
    .from("cleaning_resources")
    .update(resourceUpdate as never)
    .eq("id", parsed.data.resourceId);

  if (error) {
    redirectWithError(error.message);
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/jobs");
  revalidatePath("/manager");
  redirectWithSuccess("Cleaning resource updated.");
}
