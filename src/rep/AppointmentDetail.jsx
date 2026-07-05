import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Phone,
  Navigation,
  Car,
  Ruler,
  DoorOpen,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  Screen,
  BackHeader,
  Card,
  Pill,
  IconCircle,
  ORANGE,
  GREEN,
  GREEN_DARK,
  NAVY,
} from "./ui";
import { isToday } from "../lib/slots";

const ETA_OPTIONS = [10, 15, 20, 30, 45];

export default function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appt, setAppt] = useState(null);
  const [etaOpen, setEtaOpen] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState(20);
  const [busy, setBusy] = useState(false);
  const [otwSent, setOtwSent] = useState(false);
  const [techNotes, setTechNotes] = useState("");

  useEffect(() => {
    supabase
      .from("appointments")
      .select("*, leads(*)")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setAppt(data);
        setTechNotes(data?.leads?.tech_notes ?? "");
      });
  }, [id]);

  if (!appt) {
    return (
      <Screen>
        <BackHeader label="Loading…" onBack={() => navigate("/rep")} />
      </Screen>
    );
  }

  const lead = appt.leads;
  const when = new Date(appt.scheduled_at);
  const whenLabel = `${isToday(when) ? "today" : when.toLocaleDateString("en-US", { weekday: "long" })}, ${when.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  const firstName = (lead?.name ?? "").split(" ")[0] || "there";
  const done = appt.status === "completed";

  async function saveTechNotes() {
    await supabase
      .from("leads")
      .update({ tech_notes: techNotes || null })
      .eq("id", appt.lead_id);
  }

  async function sendOnTheWay() {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("send-sms", {
        body: { type: "on_the_way", lead_id: appt.lead_id, minutes: etaMinutes },
      });
      if (error) throw error;
      setOtwSent(true);
      setEtaOpen(false);
    } catch (e) {
      console.error(e);
      alert("Text failed to send — check connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function markComplete() {
    if (busy) return;
    setBusy(true);
    try {
      await supabase
        .from("appointments")
        .update({ status: "completed" })
        .eq("id", id);
      await supabase
        .from("leads")
        .update({ status: "measured" })
        .eq("id", appt.lead_id);
      // "Your estimate is being prepared" — keeps the customer warm
      await supabase.functions.invoke("send-sms", {
        body: { type: "measure_complete", lead_id: appt.lead_id },
      });
      navigate("/rep");
    } finally {
      setBusy(false);
    }
  }

  async function markNoAccess() {
    if (busy) return;
    setBusy(true);
    try {
      await supabase
        .from("appointments")
        .update({ status: "no_access" })
        .eq("id", id);
      // Lead goes back to the top of the call stack for rebooking.
      // (2B replaces this with the automated rebook link text.)
      await supabase
        .from("leads")
        .update({ status: "new" })
        .eq("id", appt.lead_id);
      await supabase.functions.invoke("send-sms", {
        body: { type: "no_access", lead_id: appt.lead_id },
      });
      navigate("/rep");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <BackHeader
        label={`Appointment · ${whenLabel}`}
        onBack={() => navigate("/rep")}
      />

      <Card>
        <div className="text-2xl font-medium text-black mb-3">{lead?.name}</div>
        <a
          href={`tel:${lead?.phone}`}
          className="flex items-center gap-2.5 py-2.5 border-t border-neutral-200 font-medium"
          style={{ color: GREEN_DARK }}
        >
          <Phone size={19} />
          {lead?.phone}
        </a>
        <a
          href={`https://maps.apple.com/?daddr=${encodeURIComponent(
            [lead?.address, lead?.city, lead?.state, lead?.zip]
              .filter(Boolean)
              .join(", "),
          )}`}
          className="flex items-center gap-2.5 py-2.5 border-t border-neutral-200 font-medium text-[15px]"
          style={{ color: "#185fa5" }}
        >
          <Navigation size={19} />
          {[lead?.address, lead?.city].filter(Boolean).join(", ")} {lead?.zip}
        </a>
      </Card>

      {!done && !etaOpen && (
        <button
          onClick={() => setEtaOpen(true)}
          className="w-full rounded-xl py-3.5 mb-2.5 text-white font-medium flex items-center justify-center gap-2"
          style={{ background: ORANGE }}
        >
          <Car size={19} />
          {otwSent ? "On the way — sent ✓" : "On the way — text the customer"}
        </button>
      )}

      {!done && etaOpen && (
        <div className="rounded-xl p-3.5 mb-2.5" style={{ background: ORANGE }}>
          <div className="flex items-center justify-center gap-2 text-white font-medium mb-3">
            <Car size={19} />
            On the way — how many minutes?
          </div>
          <div className="flex gap-1.5 mb-3">
            {ETA_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => setEtaMinutes(m)}
                className="flex-1 text-center text-sm py-2 rounded-full"
                style={
                  m === etaMinutes
                    ? { background: "#fff", color: "#b34d0a", fontWeight: 500 }
                    : { background: "rgba(255,255,255,0.2)", color: "#fff" }
                }
              >
                {m}
              </button>
            ))}
          </div>
          <div className="bg-white/95 rounded-lg px-3 py-2.5 text-[13px] text-neutral-800 leading-relaxed mb-3">
            <span className="text-neutral-500">{firstName} will receive:</span>
            <br />
            "Hi {firstName}, your measure tech is on the way — about{" "}
            {etaMinutes} minutes out. No need to be home, we just need backyard
            access."
          </div>
          <button
            onClick={sendOnTheWay}
            disabled={busy}
            className="w-full rounded-lg py-3 text-white font-medium disabled:opacity-50"
            style={{ background: NAVY }}
          >
            {busy ? "Sending…" : "Send"}
          </button>
        </div>
      )}

      <Card>
        <div className="text-xs text-neutral-500 tracking-wide mb-2">
          Backyard access
        </div>
        <div className="flex items-center justify-between py-1 text-sm text-black">
          Someone home?
          <Pill tone={appt.someone_home ? "green" : "amber"}>
            {appt.someone_home == null ? "Unknown" : appt.someone_home ? "Yes" : "No"}
          </Pill>
        </div>
        <div className="flex items-center justify-between py-1 text-sm text-black">
          Dogs on property?
          <Pill tone={appt.dogs_on_property ? "amber" : "green"}>
            {appt.dogs_on_property == null ? "Unknown" : appt.dogs_on_property ? "Yes" : "No"}
          </Pill>
        </div>
        <div className="flex items-center justify-between py-1 text-sm text-black">
          Cage door locked?
          <Pill tone={appt.cage_door_locked ? "amber" : "green"}>
            {appt.cage_door_locked == null ? "Unknown" : appt.cage_door_locked ? "Yes" : "No"}
          </Pill>
        </div>
        {appt.access_notes && (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 mt-2 text-[13.5px] text-neutral-800 bg-neutral-100">
            <DoorOpen size={17} className="text-neutral-500 shrink-0" />
            {appt.access_notes}
          </div>
        )}
      </Card>

      <Card>
        <div className="text-xs text-neutral-500 tracking-wide mb-2">
          Request details
        </div>
        <div className="flex gap-1.5 flex-wrap mb-2.5">
          {(lead?.work_types ?? []).map((w) => (
            <Pill key={w}>{w}</Pill>
          ))}
          {lead?.finish && <Pill>{lead.finish}</Pill>}
        </div>
        {lead?.notes && (
          <div className="text-[13.5px] text-neutral-700 leading-relaxed mb-2.5">
            "{lead.notes}"
          </div>
        )}
        {(lead?.photo_urls ?? []).length > 0 ? (
          <div className="flex gap-2 flex-wrap">
            {lead.photo_urls.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                <img
                  src={url}
                  alt="Customer submitted pool photo"
                  className="w-16 h-16 rounded-lg object-cover bg-neutral-200"
                />
              </a>
            ))}
          </div>
        ) : (
          <div className="w-16 h-16 rounded-lg bg-neutral-200 flex items-center justify-center text-neutral-400">
            <ImageIcon size={22} />
          </div>
        )}
      </Card>

      <Card>
        <div className="text-xs text-neutral-500 tracking-wide mb-2">
          Tech notes
        </div>
        <textarea
          value={techNotes}
          onChange={(e) => setTechNotes(e.target.value)}
          onBlur={saveTechNotes}
          placeholder="Add a note…"
          rows={2}
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm text-black"
        />
      </Card>

      {!done && (
        <>
          <button
            onClick={markComplete}
            disabled={busy}
            className="w-full rounded-xl py-3.5 text-white font-medium mb-2 flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: GREEN }}
          >
            <Ruler size={19} />
            Mark measure complete
          </button>
          <button
            onClick={markNoAccess}
            disabled={busy}
            className="w-full rounded-xl py-3 disabled:opacity-50"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "0.5px solid rgba(250,199,117,0.5)",
              color: "#fac775",
            }}
          >
            Couldn't access backyard
          </button>
        </>
      )}
      {done && (
        <div className="text-center text-white/60 text-sm py-2">
          Measure complete — customer has been told their estimate is on the
          way.
        </div>
      )}
    </Screen>
  );
}
