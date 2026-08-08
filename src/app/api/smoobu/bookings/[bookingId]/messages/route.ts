import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { canManageOperations } from "@/lib/domain/operations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { createSmoobuClient } from "@/lib/smoobu/client";
import { toDisplayMessage } from "@/lib/smoobu/messages";

type BookingRow = Pick<
  Database["public"]["Tables"]["smoobu_bookings"]["Row"],
  "smoobu_reservation_id"
>;

async function fetchAllMessages(reservationId: number) {
  const client = createSmoobuClient();
  const messages = [];
  let page = 1;
  let pageCount = 1;

  do {
    const response = await client.getMessages(reservationId, page, true);
    messages.push(...(response.data.messages ?? []));
    pageCount = response.data.page_count ?? page;
    page += 1;
  } while (page <= pageCount);

  return messages.map(toDisplayMessage);
}

export async function GET(_request: Request, context: { params: Promise<{ bookingId: string }> }) {
  const profile = await getCurrentProfile();

  if (!canManageOperations(profile?.role)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const { bookingId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("smoobu_bookings")
    .select("smoobu_reservation_id")
    .eq("id", bookingId)
    .maybeSingle();
  const booking = data as BookingRow | null;

  if (!booking) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  try {
    const messages = await fetchAllMessages(booking.smoobu_reservation_id);
    return NextResponse.json({ ok: true, messages });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Smoobu messages could not be loaded. Try again in a moment." },
      { status: 502 }
    );
  }
}
