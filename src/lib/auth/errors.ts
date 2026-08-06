export type SupabaseSignInError = {
  message?: string;
  status?: number;
  code?: string;
};

export function getSupabaseSignInErrorMessage(error: SupabaseSignInError) {
  const message = error.message?.toLowerCase() ?? "";

  if (message.includes("email not confirmed")) {
    return "Your email address has not been confirmed yet. Confirm it in Supabase or disable email confirmation for invited users.";
  }

  if (message.includes("invalid api key") || error.status === 401) {
    return "The portal cannot connect to the configured Supabase project. Check the production Supabase URL and anon key in Vercel.";
  }

  if (message.includes("invalid login credentials")) {
    return "Those credentials were not accepted by Supabase. Check the user exists in this Supabase project and has a password set.";
  }

  return "We could not sign you in. Check the production Supabase Auth user and project configuration.";
}
