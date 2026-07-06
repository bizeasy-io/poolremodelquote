// sms-inbound — Twilio webhook for customer replies.
// Deploy: supabase functions deploy sms-inbound --no-verify-jwt
//
// Configure in Twilio Console: Phone Numbers → your number → Messaging →
// "A message comes in" → Webhook (POST) →
//   https://wxzqzfjktudupnxijdka.supabase.co/functions/v1/sms-inbound
//
// Any reply from a known lead's number promotes that lead back to the top of
// the day view flagged "Replied — call back" — the ONLY automatic promotion
// in the system. Booked/measured/quoted/sold leads are left alone.
//
// Twilio sends application/x-www-form-urlencoded with From and Body.

import { createClient } from "npm:@supabase/supabase-js@2";

// Compare phone numbers by their last 10 digits (strips +1, formatting)
function last10(phone: string) {
  return (phone ?? "").replace(/\D/g, "").slice(-10);
}

Deno.serve(async (req) => {
  // Twilio expects TwiML back; an empty response = no auto-reply.
  const twiml = new Response(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { headers: { "Content-Type": "text/xml" } },
  );

  try {
    const form = await req.formData();
    const from = String(form.get("From") ?? "");
    const body = String(form.get("Body") ?? "").trim();
    if (!from) return twiml;

    // Carriers handle STOP/START compliance upstream; don't treat STOP as
    // engagement.
    if (/^(stop|stopall|unsubscribe|cancel|end|quit)$/i.test(body)) {
      return twiml;
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find the most recent lead matching this phone number in a promotable
    // status. (Same customer may have old archived leads — take newest.)
    const { data: candidates } = await supabase
      .from("leads")
      .select("id, phone, status, created_at")
      .in("status", ["new", "attempted", "nurturing", "archived"])
      .order("created_at", { ascending: false })
      .limit(200);

    const match = (candidates ?? []).find(
      (l) => last10(l.phone) === last10(from),
    );
    if (!match) return twiml;

    await supabase
      .from("leads")
      .update({
        status: "new", // back into the leads section...
        replied_at: new Date().toISOString(), // ...flagged and sorted hottest
        archived_at: null,
      })
      .eq("id", match.id);

    return twiml;
  } catch (e) {
    console.error(e);
    return twiml; // never bounce errors back at Twilio
  }
});
