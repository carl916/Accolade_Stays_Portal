import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { syncSmoobuReservations, syncSmoobuReservationsModifiedSince } from "@/lib/smoobu/sync";

function isAuthorised(request: Request) {
  const secret = process.env.SMOOBU_CRON_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const [{ count: bookingCount }, { data }] = await Promise.all([
    supabase.from("smoobu_bookings").select("id", { count: "exact", head: true }),
    supabase
    .from("smoobu_sync_runs")
    .select("last_successful_sync_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
      .maybeSingle()
  ]);
  const lastSync = data as { last_successful_sync_at: string | null } | null;

  try {
    const shouldRunInitialSync = (bookingCount ?? 0) === 0;
    const summary = shouldRunInitialSync
      ? await syncSmoobuReservations({
          syncType: "initial",
          supabase
        })
      : await syncSmoobuReservationsModifiedSince({
          since: lastSync?.last_successful_sync_at,
          supabase
        });

    return NextResponse.json({ ok: true, mode: shouldRunInitialSync ? "initial" : "incremental", summary });
  } catch {
    return NextResponse.json({ ok: false, error: "Smoobu sync failed." }, { status: 500 });
  }
}
