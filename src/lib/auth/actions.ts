"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signInSchema } from "@/lib/auth/validation";
import { getRoleHomePath } from "@/lib/domain/operations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type SignInState = {
  error?: string;
};

type SignInProfile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "role" | "is_active">;

export async function signInWithPassword(input: unknown): Promise<SignInState> {
  const parsed = signInSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check your sign-in details."
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error, data } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return {
      error: "We could not sign you in with those details."
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  const signInProfile = profile as SignInProfile | null;

  if (profileError || !signInProfile || !signInProfile.is_active) {
    await supabase.auth.signOut();

    return {
      error: "Your user profile is not active yet. Ask an administrator to finish your access setup."
    };
  }

  revalidatePath("/", "layout");
  redirect(getRoleHomePath(signInProfile.role));
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}
