// send-sms v2 — adds the nurture-loop templates and self-booking links.
// Deploy: supabase functions deploy send-sms
// (JWT verification stays ON.)
//
// Secrets used:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
//   SAM_PHONE_NUMBER, BUSINESS_NAME
//   SITE_URL (NEW — set with: supabase secrets set SITE_URL="https://poolremodelquote.com")

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  type:
    | "appointment_booked"
    | "on_the_way"
    | "measure_complete"
    | "no_access"
    | "nurture_day0";
  lead_id: string;
  minutes?: number;
  scheduled_label?: string;
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
  if (!resp.ok) {
    console.error("Twilio error:", await resp.text());
    throw new Error("SMS send failed");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: Payload = await req.json();
    const business = Deno.env.get("BUSINESS_NAME") ?? "Pool Remodel Quote";
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://poolremodelquote.com";
    const contractorPhone = Deno.env.get("SAM_PHONE_NUMBER");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: lead, error } = await supabase
      .from("leads")
      .select("name, phone, booking_token")
      .eq("id", payload.lead_id)
      .single();
    if (error || !lead) throw new Error("Lead not found");

    const firstName = (lead.name ?? "").split(" ")[0] || "there";
    const bookLink = `${siteUrl}/book/${lead.booking_token}`;
    const sends: Promise<void>[] = [];

    switch (payload.type) {
      case "appointment_booked": {
        sends.push(sendText(
          lead.phone,
          `Hi ${firstName}, your pool measure with ${business} is booked for ${payload.scheduled_label}. You don't need to be home — just make sure the gate is unlocked and pets are inside.`,
        ));
        if (contractorPhone) {
          sends.push(sendText(
            contractorPhone,
            `Measure booked: ${lead.name}, ${payload.scheduled_label}.`,
          ));
        }
        break;
      }
      case "on_the_way": {
        const mins = payload.minutes ?? 20;
        sends.push(sendText(
          lead.phone,
          `Hi ${firstName}, your measure tech from ${business} is on the way — about ${mins} minutes out. No need to be home, we just need backyard access.`,
        ));
        break;
      }
      case "measure_complete": {
        sends.push(sendText(
          lead.phone,
          `Hi ${firstName}, thanks from ${business} — your pool has been measured. Your estimate is being prepared and you'll receive it within 24 hours.`,
        ));
        break;
      }
      case "no_access": {
        sends.push(sendText(
          lead.phone,
          `Hi ${firstName}, ${business} came by for your pool measure but couldn't get into the backyard. Tap here to pick a new time — you don't need to be home, we just need gate access: ${bookLink}`,
        ));
        if (contractorPhone) {
          sends.push(sendText(
            contractorPhone,
            `Couldn't access backyard at ${lead.name}'s — rebook link sent to customer.`,
          ));
        }
        break;
      }
      case "nurture_day0": {
        // Fired the moment the tech taps "No answer"
        sends.push(sendText(
          lead.phone,
          `Hi ${firstName}, sorry we missed you — this is ${business} about your pool estimate. We can't prepare your estimate until we've seen and measured the pool. Tap here to pick a time that works (you don't need to be home): ${bookLink}`,
        ));
        await supabase.from("nurture_messages").insert({
          lead_id: payload.lead_id,
          step: 0,
        });
        break;
      }
      default:
        throw new Error("Unknown message type");
    }

    await Promise.all(sends);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
