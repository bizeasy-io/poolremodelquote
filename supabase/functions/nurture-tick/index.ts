// nurture-tick — the follow-up scheduler. Runs every 30 minutes via cron.
// Deploy: supabase functions deploy nurture-tick --no-verify-jwt
// Protected by a shared secret header instead of a user JWT:
//   supabase secrets set CRON_SECRET="<long random string>"
//
// Each run:
//   step 1 (day 1): leads nurturing >24h since attempt, 1 text sent → send reminder
//   step 2 (day 3): >72h, 2 texts sent → send last touch
//   archive (day 5): >120h, 3 texts sent → status archived, no text
//
// Timing anchors on last_contact_attempt_at (stamped once when the tech taps
// "No answer"), so steps can't drift or double-send: the step counter on the
// lead is the source of truth, and every send is logged to nurture_messages.

import { createClient } from "npm:@supabase/supabase-js@2";

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
  if (!resp.ok) throw new Error(await resp.text());
}

Deno.serve(async (req) => {
  // Only the cron job (or someone holding the secret) can trigger a tick
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return new Response("forbidden", { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const business = Deno.env.get("BUSINESS_NAME") ?? "Pool Remodel Quote";
  const siteUrl = Deno.env.get("SITE_URL") ?? "https://poolremodelquote.com";

  const hoursAgo = (h: number) =>
    new Date(Date.now() - h * 3600_000).toISOString();

  const { data: due } = await supabase
    .from("leads")
    .select("id, name, phone, booking_token, nurture_step, last_contact_attempt_at")
    .eq("status", "nurturing");

  let sent = 0;
  let archived = 0;

  for (const lead of due ?? []) {
    const firstName = (lead.name ?? "").split(" ")[0] || "there";
    const link = `${siteUrl}/book/${lead.booking_token}`;
    const attempt = lead.last_contact_attempt_at;
    if (!attempt) continue;

    try {
      if (lead.nurture_step === 1 && attempt <= hoursAgo(24)) {
        // Day 1 reminder
        await sendText(
          lead.phone,
          `Hi ${firstName}, ${business} here — still happy to get you that pool estimate. Nothing can happen until we've seen and measured the pool, and you don't need to be home for it. Pick a time here: ${link}`,
        );
        await supabase
          .from("leads")
          .update({ nurture_step: 2 })
          .eq("id", lead.id);
        await supabase
          .from("nurture_messages")
          .insert({ lead_id: lead.id, step: 1 });
        sent++;
      } else if (lead.nurture_step === 2 && attempt <= hoursAgo(72)) {
        // Day 3 last touch
        await sendText(
          lead.phone,
          `Hi ${firstName}, last note from ${business} — we'll close out your estimate request soon. If you'd still like your pool measured and quoted, grab a time here (takes 10 seconds, no need to be home): ${link}`,
        );
        await supabase
          .from("leads")
          .update({ nurture_step: 3 })
          .eq("id", lead.id);
        await supabase
          .from("nurture_messages")
          .insert({ lead_id: lead.id, step: 2 });
        sent++;
      } else if (lead.nurture_step >= 3 && attempt <= hoursAgo(120)) {
        // Day 5: quiet archive. Off the day screen, kept forever in the DB.
        await supabase
          .from("leads")
          .update({
            status: "archived",
            archived_at: new Date().toISOString(),
          })
          .eq("id", lead.id);
        archived++;
      }
    } catch (e) {
      console.error(`Nurture failed for lead ${lead.id}:`, e);
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, archived }), {
    headers: { "Content-Type": "application/json" },
  });
});
