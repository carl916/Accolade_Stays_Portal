"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseSignInErrorMessage } from "@/lib/auth/errors";
import { setPasswordSchema, signInSchema } from "@/lib/auth/validation";
import { getRoleHomePath } from "@/lib/domain/operations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type SignInState = {
  error?: string;
};

export type SetPasswordState = {
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
    if (error) {
      console.error("Supabase sign-in failed", {
        code: error.code,
        status: error.status,
        message: error.message
      });
    }

    return {
      error: error
        ? getSupabaseSignInErrorMessage(error)
        : "We could not sign you in. Supabase did not return a user session."
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  const signInProfile = profile as SignInProfile | null;

  if (profileError || !signInProfile || !signInProfile.is_active) {
    if (profileError) {
      console.error("Profile lookup failed after sign-in", {
        code: profileError.code,
        message: profileError.message
      });
    }

    await supabase.auth.signOut();

    return {
      error: "Your user profile is not active yet. Ask an administrator to finish your access setup."
    };
  }

  revalidatePath("/", "layout");
  redirect(getRoleHomePath(signInProfile.role));
}

export async function setInvitedUserPassword(input: unknown): Promise<SetPasswordState> {
  const parsed = setPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check your password."
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: "Your invite session has expired. Ask an administrator to send a new invite."
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", user.id)
    .maybeSingle();
  const inviteProfile = profile as SignInProfile | null;

  if (profileError || !inviteProfile || !inviteProfile.is_active) {
    await supabase.auth.signOut();

    return {
      error: "Your user profile is not active yet. Ask an administrator to finish your access setup."
    };
  }

  const { error: passwordError } = await supabase.auth.updateUser({
    password: parsed.data.password
  });

  if (passwordError) {
    return {
      error: passwordError.message
    };
  }

  revalidatePath("/", "layout");
  redirect(getRoleHomePath(inviteProfile.role));
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}
