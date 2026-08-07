import type { NextRequest } from "next/server";

import { createAnonClient } from "@/lib/supabase/anon";

/**
 * Aircon meter ingest.
 *
 * A device posts its own reading; the device key in the `x-device-key` header
 * is checked against a SHA-256 hash in `micana_devices` by the database
 * function itself. That is why no service-role key is needed here — the
 * secret being verified is the device's, not the caller's session.
 *
 *   POST /api/iot/aircon
 *   x-device-key: <the device's key>
 *   { "device_id": "ac-01", "period_month": "2026-08-01",
 *     "hours_run": 128.5, "kwh_used": 142.0 }
 *
 * Writes are idempotent: one row per room per month, so a device that retries
 * updates its own reading rather than billing the tenant twice.
 *
 * `/api/iot` is listed in PUBLIC_PATHS in lib/supabase/proxy.ts. Without that
 * the proxy would redirect every device to /login.
 */

// Never cached, and never prerendered — this writes.
export const dynamic = "force-dynamic";

type Payload = {
  device_id?: unknown;
  period_month?: unknown;
  hours_run?: unknown;
  kwh_used?: unknown;
};

const num = (value: unknown): number | null => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export async function POST(request: NextRequest) {
  const deviceKey = request.headers.get("x-device-key");
  if (!deviceKey) {
    return Response.json({ error: "Missing device key." }, { status: 401 });
  }

  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const deviceId = typeof body.device_id === "string" ? body.device_id.trim() : "";
  if (!deviceId) {
    return Response.json({ error: "device_id is required." }, { status: 400 });
  }

  const period =
    typeof body.period_month === "string" && /^\d{4}-\d{2}/.test(body.period_month)
      ? `${body.period_month.slice(0, 7)}-01`
      : null;
  if (!period) {
    return Response.json(
      { error: "period_month must look like YYYY-MM-DD." },
      { status: 400 },
    );
  }

  const hoursRun = num(body.hours_run);
  const kwhUsed = num(body.kwh_used);
  if (hoursRun === null || kwhUsed === null) {
    return Response.json(
      { error: "hours_run and kwh_used must be numbers of zero or more." },
      { status: 400 },
    );
  }

  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc("micana_record_aircon_reading", {
    p_device_id: deviceId,
    p_device_key: deviceKey,
    p_period_month: period,
    p_hours_run: hoursRun,
    p_kwh_used: kwhUsed,
  });

  if (error) {
    // The database raises 28000 for a bad device id or key, and says no more
    // than that on purpose — the response must not reveal which was wrong.
    const unauthorised =
      error.code === "28000" || /unauthorised device/i.test(error.message);
    if (unauthorised) {
      return Response.json({ error: "Unauthorised device." }, { status: 401 });
    }
    return Response.json({ error: "Could not record the reading." }, { status: 400 });
  }

  return Response.json({ ok: true, reading_id: data }, { status: 201 });
}
