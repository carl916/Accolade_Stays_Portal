import "server-only";

export function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}
