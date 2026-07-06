// self-booking — the public booking page's backend.
// Deploy: supabase functions deploy self-booking --no-verify-jwt
//
// Security model: NO login. The unguessable booking_token in the link is the
// capability — knowing it grants booking rights for that ONE lead only.
// All database access happens here with the service role; the anon key never
// touches leads or appointments directly.
//
// Actions:
//   POST { action: "info", token }
//     → { firstName, business, availability, bookedTimes[] }
//   POST { action: "book", token, scheduled_at, someone_home, dogs_on_property,
//          cage_door_locked, access_notes }
//     → { ok: true } and fires confirmation texts

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function sendText(to: string, body: string) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const token = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const from = Deno.env.get("TWILIO_PHONE_NUMBER")!;
  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${sid}:${token}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    },
  );
  if (!resp.ok) console.error("Twilio error:", await resp.text());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const payload = await req.json();
    const token = payload?.token;
    if (!token || typeof token !== "string") {
      return json({ ok: false, error: "Missing token" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Token → lead. Invalid token = generic 404, no information leaked.
    const { data: lead } = await supabase
      .from("leads")
      .select("id, name, phone, status")
      .eq("booking_token", token)
      .single();
    if (!lead) return json({ ok: false, error: "Not found" }, 404);

    const business = Deno.env.get("BUSINESS_NAME") ?? "Pool Remodel Quote";
    const firstName = (lead.name ?? "").split(" ")[0] || "there";

    if (payload.action === "info") {
      if (["booked", "measured", "quoted", "sold"].includes(lead.status)) {
        return json({ ok: true, alreadyBooked: true, firstName, business });
      }

      // Availability: single-tech world = first row, else defaults
      const { data: avail } = await supabase
        .from("tech_availability")
        .select("days_of_week, start_hour, end_hour, slot_minutes")
        .limit(1)
        .maybeSingle();

      // Booked times for the next 21 days so the page can hide taken slots
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + 21);
      const { data: appts } = await supabase
        .from("appointments")
        .select("scheduled_at")
        .eq("status", "upcoming")
        .gte("scheduled_at", from.toISOString())
        .lte("scheduled_at", to.toISOString());

      return json({
        ok: true,
        alreadyBooked: false,
        firstName,
        business,
        availability: avail ?? {
          days_of_week: [false, true, true, true, true, true, true],
          start_hour: 8,
          end_hour: 18,
          slot_minutes: 90,
        },
        bookedTimes: (appts ?? []).map((a) => a.scheduled_at),
      });
    }

    if (payload.action === "book") {
      const when = new Date(payload.scheduled_at);
      if (isNaN(when.getTime()) || when.getTime() < Date.now()) {
        return json({ ok: false, error: "Invalid time" }, 400);
      }

      // Reject if the slot got taken since the page loaded (90-min buffer)
      const bufferMs = 90 * 60000;
      const { data: clash } = await supabase
        .from("appointments")
        .select("id, scheduled_at")
        .eq("status", "upcoming")
        .gte("scheduled_at", new Date(when.getTime() - bufferMs).toISOString())
        .lte("scheduled_at", new Date(when.getTime() + bufferMs).toISOString());
      if ((clash ?? []).length > 0) {
        return json({ ok: false, error: "slot_taken" }, 409);
      }

      const { error: insErr } = await supabase.from("appointments").insert({
        lead_id: lead.id,
        scheduled_at: when.toISOString(),
        booked_by: "customer_self",
        someone_home: payload.someone_home ?? null,
        dogs_on_property: payload.dogs_on_property ?? null,
        cage_door_locked: payload.cage_door_locked ?? null,
        access_notes: payload.access_notes || null,
      });
      if (insErr) throw insErr;

      await supabase
        .from("leads")
        .update({ status: "booked" })
        .eq("id", lead.id);

      const label = `${when.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "America/New_York",
      })} at ${when.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      })}`;

      const contractorPhone = Deno.env.get("SAM_PHONE_NUMBER");
      await Promise.all([
        sendText(
          lead.phone,
          `You're booked! ${business} will measure your pool ${label}. You don't need to be home — just make sure the gate is unlocked and pets are inside.`,
        ),
        contractorPhone
          ? sendText(
              contractorPhone,
              `Self-booked measure: ${lead.name}, ${label}.`,
            )
          : Promise.resolve(),
      ]);

      return json({ ok: true, label });
    }

    return json({ ok: false, error: "Unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: "Server error" }, 500);
  }
});
