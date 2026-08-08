"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { appRoleSchema, cleanerTypeSchema } from "@/lib/domain/operations";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const inviteUserSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the user's name."),
  email: z.string().trim().email("Enter a valid email address.").toLowerCase(),
  role: appRoleSchema,
  cleanerType: cleanerTypeSchema.optional()
});
const updateUserSchema = z.object({
  profileId: z.string().uuid("Choose a user."),
  fullName: z.string().trim().min(2, "Enter the user's name."),
  role: appRoleSchema,
  isActive: z.enum(["active", "inactive"]),
  cleanerType: cleanerTypeSchema.optional()
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

function redirectWithInviteLink(message: string, inviteLink: string): never {
  const params = new URLSearchParams({
    success: message,
    inviteLink
  });

  redirect(`/admin/users?${params.toString()}`);
}

function isInviteEmailSendError(error: { message?: string } | null) {
  return Boolean(error?.message?.toLowerCase().includes("sending invite email"));
}

function getProfileCleanerType(role: z.infer<typeof appRoleSchema>, cleanerType: z.infer<typeof cleanerTypeSchema> | undefined) {
  return role === "cleaner" ? cleanerType ?? "individual" : null;
}

export async function inviteUser(formData: FormData) {
  await requireRole(["administrator"]);
  const parsed = inviteUserSchema.safeParse({
    fullName: getFormString(formData, "fullName"),
    email: getFormString(formData, "email"),
    role: getFormString(formData, "role"),
    cleanerType: getFormString(formData, "cleanerType") || undefined
  });

  if (!parsed.success) {
    redirectWithError(parsed.error.issues[0]?.message ?? "Check the user details.");
  }

  const supabase = createSupabaseServiceRoleClient();
  const inviteMetadata = {
    full_name: parsed.data.fullName,
    role: parsed.data.role,
    cleaner_type: getProfileCleanerType(parsed.data.role, parsed.data.cleanerType)
  };
  const inviteOptions = {
    data: {
      ...inviteMetadata
    }
  };
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(parsed.data.email, inviteOptions);
  let invitedUser = data.user;
  let manualInviteLink: string | null = null;

  if (error || !data.user) {
    if (!isInviteEmailSendError(error)) {
      redirectWithError(error?.message ?? "Supabase did not return the invited user.");
    }

    const generatedLink = await supabase.auth.admin.generateLink({
      type: "invite",
      email: parsed.data.email,
      options: inviteOptions
    });

    if (generatedLink.error || !generatedLink.data.user) {
      redirectWithError(generatedLink.error?.message ?? error?.message ?? "Supabase could not create an invite link.");
    }

    invitedUser = generatedLink.data.user;
    manualInviteLink = generatedLink.data.properties.action_link;
  }

  if (!invitedUser) {
    redirectWithError("Supabase did not return the invited user.");
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: invitedUser.id,
      email: parsed.data.email,
      full_name: parsed.data.fullName,
      role: parsed.data.role,
      cleaner_type: getProfileCleanerType(parsed.data.role, parsed.data.cleanerType),
      is_active: true
    },
    { onConflict: "id" }
  );

  if (profileError) {
    redirectWithError(profileError.message);
  }

  revalidatePath("/admin/users");
  if (manualInviteLink) {
    redirectWithInviteLink("Supabase could not send the email, so an invite link was generated.", manualInviteLink);
  }

  redirectWithSuccess("Invite sent.");
}

export async function updateUserProfile(formData: FormData) {
  const currentProfile = await requireRole(["administrator"]);
  const parsed = updateUserSchema.safeParse({
    profileId: getFormString(formData, "profileId"),
    fullName: getFormString(formData, "fullName"),
    role: getFormString(formData, "role"),
    isActive: getFormString(formData, "isActive"),
    cleanerType: getFormString(formData, "cleanerType") || undefined
  });

  if (!parsed.success) {
    redirectWithError(parsed.error.issues[0]?.message ?? "Check the user details.");
  }

  if (parsed.data.profileId === currentProfile.id && parsed.data.isActive === "inactive") {
    redirectWithError("You cannot deactivate your own profile.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: existingProfileData, error: existingProfileError } = await supabase
    .from("profiles")
    .select("id,role,is_active")
    .eq("id", parsed.data.profileId)
    .maybeSingle();
  const existingProfile = existingProfileData as Pick<
    Awaited<ReturnType<typeof requireRole>>,
    "id" | "role" | "is_active"
  > | null;

  if (existingProfileError || !existingProfile) {
    redirectWithError(existingProfileError?.message ?? "User not found.");
  }

  if (
    existingProfile.role === "cleaner" &&
    (parsed.data.role !== "cleaner" || parsed.data.isActive === "inactive")
  ) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: futureJobData, error: futureJobError } = await supabase
      .from("cleaning_jobs")
      .select("id")
      .eq("assigned_cleaner_id", parsed.data.profileId)
      .gte("scheduled_date", today)
      .not("status", "in", "(completed,cancelled)")
      .limit(1);

    if (futureJobError) {
      redirectWithError(futureJobError.message);
    }

    if ((futureJobData ?? []).length > 0) {
      redirectWithError("Reassign this cleaner's future jobs before changing their role or deactivating them.");
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      role: parsed.data.role,
      cleaner_type: getProfileCleanerType(parsed.data.role, parsed.data.cleanerType),
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
