import { NextResponse } from "next/server";
import { processSmoobuWebhook } from "@/lib/smoobu/webhooks";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const result = await processSmoobuWebhook({ payload });
    return NextResponse.json({ ok: true, result });
  } catch {
    return NextResponse.json({ ok: true, result: { status: "accepted_for_retry" } });
  }
}
