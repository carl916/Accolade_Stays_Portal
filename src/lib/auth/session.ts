import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { getRoleHomePath, isRoleAllowed, type AppRole } from "@/lib/domain/operations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type AuthProfile = Database["public"]["Tables"]["profiles"]["Row"];

export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
});

export const getCurrentProfile = cache(async (): Promise<AuthProfile | null> => {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const profile = data as AuthProfile | null;

  if (error || !profile || !profile.is_active) {
    return null;
  }

  return profile;
});

export async function requireProfile() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  return profile;
}

export async function requireRole(allowedRoles: readonly AppRole[]) {
  const profile = await requireProfile();

  if (!isRoleAllowed(profile.role, allowedRoles)) {
    redirect(getRoleHomePath(profile.role));
  }

  return profile;
}
