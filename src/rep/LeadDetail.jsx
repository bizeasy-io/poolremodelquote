import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Phone, MapPin, Image as ImageIcon } from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  Screen,
  BackHeader,
  Card,
  Pill,
  GREEN,
  GREEN_DARK,
} from "./ui";
import {
  upcomingDays,
  slotsForDay,
  fmtTime,
  fmtScheduledLabel,
  isSameDay,
} from "../lib/slots";

function AccessToggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm text-black">
      {label}
      <div className="flex gap-1.5">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            onClick={() => onChange(v)}
            className="text-xs font-medium px-3 py-1 rounded-full border"
            style={
              value === v
                ? { background: GREEN_DARK, color: "#fff", borderColor: GREEN_DARK }
                : { borderColor: "#d5d5d5", color: "#444" }
            }
          >
            {v ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [dayAppointments, setDayAppointments] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [someoneHome, setSomeoneHome] = useState(null);
  const [dogs, setDogs] = useState(null);
  const [cageLocked, setCageLocked] = useState(null);
  const [accessNotes, setAccessNotes] = useState("");
  const [techNotes, setTechNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const days = useMemo(() => upcomingDays(), []);

  useEffect(() => {
    supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setLead(data);
        setTechNotes(data?.tech_notes ?? "");
      });
  }, [id]);

  // Load booked appointments for the selected day to compute open slots
  useEffect(() => {
    if (!selectedDay) return;
    const dayStart = new Date(selectedDay);
    const dayEnd = new Date(selectedDay);
    dayEnd.setDate(dayEnd.getDate() + 1);
    supabase
      .from("appointments")
      .select("scheduled_at, status")
      .gte("scheduled_at", dayStart.toISOString())
      .lt("scheduled_at", dayEnd.toISOString())
      .then(({ data }) => setDayAppointments(data ?? []));
    setSelectedSlot(null);
  }, [selectedDay]);

  const slots = useMemo(
    () => (selectedDay ? slotsForDay(selectedDay, dayAppointments) : []),
    [selectedDay, dayAppointments],
  );

  async function saveTechNotes() {
    if (!lead) return;
    await supabase.from("leads").update({ tech_notes: techNotes }).eq("id", id);
  }

  async function bookAppointment() {
    if (!selectedSlot || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("appointments").insert({
        lead_id: id,
        scheduled_at: selectedSlot.toISOString(),
        booked_by: "tech",
        someone_home: someoneHome,
        dogs_on_property: dogs,
        cage_door_locked: cageLocked,
        access_notes: accessNotes || null,
      });
      if (error) throw error;
      await supabase
        .from("leads")
        .update({ status: "booked", tech_notes: techNotes || null })
        .eq("id", id);
      // Confirmation texts to customer + contractor
      await supabase.functions.invoke("send-sms", {
        body: {
          type: "appointment_booked",
          lead_id: id,
          scheduled_label: fmtScheduledLabel(selectedSlot),
        },
      });
      navigate("/rep");
    } catch (e) {
      console.error(e);
      alert("Booking failed — check connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function markNoAnswer() {
    if (busy) return;
    setBusy(true);
    try {
      await supabase
        .from("leads")
        .update({
          status: "attempted",
          last_contact_attempt_at: new Date().toISOString(),
          tech_notes: techNotes || null,
        })
        .eq("id", id);
      // Phase 2B: this is where the day-0 nurture text fires and
      // status moves to 'nurturing'. In 2A the lead just moves to
      // the follow-up section for a manual retry.
      navigate("/rep");
    } finally {
      setBusy(false);
    }
  }

  if (!lead) {
    return (
      <Screen>
        <BackHeader label="Loading…" onBack={() => navigate("/rep")} />
      </Screen>
    );
  }

  const received = new Date(lead.created_at)
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .toLowerCase();

  return (
    <Screen>
      <BackHeader
        label={`New lead · came in ${received}`}
        onBack={() => navigate("/rep")}
      />

      <Card>
        <div className="text-2xl font-medium text-black mb-3">{lead.name}</div>
        <a
          href={`tel:${lead.phone}`}
          className="flex items-center gap-2.5 py-2.5 border-t border-neutral-200 font-medium"
          style={{ color: GREEN_DARK }}
        >
          <Phone size={19} />
          {lead.phone}
        </a>
        <a
          href={`https://maps.apple.com/?daddr=${encodeURIComponent(
            [lead.address, lead.city, lead.state, lead.zip]
              .filter(Boolean)
              .join(", "),
          )}`}
          className="flex items-center gap-2.5 py-2.5 border-t border-neutral-200 font-medium text-[15px]"
          style={{ color: "#185fa5" }}
        >
          <MapPin size={19} />
          {[lead.address, lead.city].filter(Boolean).join(", ")} {lead.zip}
        </a>
      </Card>

      <Card>
        <div className="text-xs text-neutral-500 tracking-wide mb-2">
          Request details
        </div>
        <div className="flex gap-1.5 flex-wrap mb-2.5">
          {(lead.work_types ?? []).map((w) => (
            <Pill key={w}>{w}</Pill>
          ))}
          {lead.finish && <Pill>{lead.finish}</Pill>}
        </div>
        {lead.notes && (
          <div className="text-[13.5px] text-neutral-700 leading-relaxed mb-2.5">
            "{lead.notes}"
          </div>
        )}
        {(lead.photo_urls ?? []).length > 0 && (
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
        )}
        {(lead.photo_urls ?? []).length === 0 && (
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

      <Card>
        <div className="text-xs text-neutral-500 tracking-wide mb-2.5">
          Book the measure
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
          {days.map((d) => {
            const sel = selectedDay && isSameDay(d, selectedDay);
            return (
              <button
                key={d.toISOString()}
                onClick={() => setSelectedDay(d)}
                className="shrink-0 w-14 text-center py-2 rounded-lg border text-xs"
                style={
                  sel
                    ? { background: GREEN_DARK, borderColor: GREEN_DARK, color: "#9fe1cb" }
                    : { borderColor: "#d5d5d5", color: "#444" }
                }
              >
                {d.toLocaleDateString("en-US", { weekday: "short" })}
                <div
                  className="font-medium text-[15px]"
                  style={{ color: sel ? "#fff" : "#111" }}
                >
                  {d.getDate()}
                </div>
              </button>
            );
          })}
        </div>
        {selectedDay && (
          <div className="flex gap-1.5 flex-wrap mt-1">
            {slots.length === 0 && (
              <div className="text-sm text-neutral-500 py-1">
                No open slots this day.
              </div>
            )}
            {slots.map((s) => {
              const sel = selectedSlot && s.getTime() === selectedSlot.getTime();
              return (
                <button
                  key={s.toISOString()}
                  onClick={() => setSelectedSlot(s)}
                  className="text-[13px] px-3 py-1.5 rounded-full border"
                  style={
                    sel
                      ? { background: GREEN_DARK, borderColor: GREEN_DARK, color: "#fff", fontWeight: 500 }
                      : { borderColor: "#d5d5d5", color: "#444" }
                  }
                >
                  {fmtTime(s)}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <div className="text-xs text-neutral-500 tracking-wide mb-2">
          Backyard access — customer doesn't need to be home
        </div>
        <AccessToggle
          label="Someone home?"
          value={someoneHome}
          onChange={setSomeoneHome}
        />
        <AccessToggle label="Dogs on property?" value={dogs} onChange={setDogs} />
        <AccessToggle
          label="Cage door locked?"
          value={cageLocked}
          onChange={setCageLocked}
        />
        <input
          value={accessNotes}
          onChange={(e) => setAccessNotes(e.target.value)}
          placeholder="Gate location, codes, anything the tech should know"
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-[13px] text-black mt-1.5"
        />
      </Card>

      <button
        onClick={bookAppointment}
        disabled={!selectedSlot || busy}
        className="w-full rounded-xl py-3.5 text-white font-medium mb-2 disabled:opacity-40"
        style={{ background: GREEN }}
      >
        {busy ? "Booking…" : "Book appointment"}
      </button>
      <button
        onClick={markNoAnswer}
        disabled={busy}
        className="w-full rounded-xl py-3 text-white border border-white/40 bg-white/10"
      >
        No answer — move to follow-up
      </button>
    </Screen>
  );
}
