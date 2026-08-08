"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { appRoleSchema } from "@/lib/domain/operations";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
