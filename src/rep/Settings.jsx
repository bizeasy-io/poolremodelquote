// Tech availability settings — /rep/settings
// One setting drives BOTH calendars: the tech's own booking screen and the
// customer self-booking page. Flip Saturday on and Saturday slots instantly
// open to every customer sitting in the text loop.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Screen, BackHeader, Card, GREEN, GREEN_DARK } from "./ui";
import { DEFAULT_AVAILABILITY } from "../lib/slots";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6am–8pm

function fmtHour(h) {
  const ampm = h >= 12 ? "pm" : "am";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}${ampm}`;
}

export default function Settings() {
  const navigate = useNavigate();
  const [days, setDays] = useState(DEFAULT_AVAILABILITY.days_of_week);
  const [startHour, setStartHour] = useState(DEFAULT_AVAILABILITY.start_hour);
  const [endHour, setEndHour] = useState(DEFAULT_AVAILABILITY.end_hour);
  const [slotMinutes, setSlotMinutes] = useState(
    DEFAULT_AVAILABILITY.slot_minutes,
  );
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;
      const { data } = await supabase
        .from("tech_availability")
        .select("*")
        .eq("tech_id", userData.user.id)
        .maybeSingle();
      if (data) {
        setDays(data.days_of_week);
        setStartHour(data.start_hour);
        setEndHour(data.end_hour);
        setSlotMinutes(data.slot_minutes);
      }
    })();
  }, []);

  async function save() {
    setBusy(true);
    setSaved(false);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("tech_availability").upsert({
        tech_id: userData.user.id,
        days_of_week: days,
        start_hour: startHour,
        end_hour: endHour,
        slot_minutes: slotMinutes,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setSaved(true);
    } catch (e) {
      console.error(e);
      alert("Save failed — check connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <BackHeader label="Availability" onBack={() => navigate("/rep")} />

      <Card>
        <div className="text-xs text-neutral-500 tracking-wide mb-2.5">
          Days you take appointments
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {DAY_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => {
                const next = [...days];
                next[i] = !next[i];
                setDays(next);
              }}
              className="w-11 py-2 rounded-lg border text-[13px] font-medium"
              style={
                days[i]
                  ? { background: GREEN_DARK, borderColor: GREEN_DARK, color: "#fff" }
                  : { borderColor: "#d5d5d5", color: "#999" }
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="text-[12.5px] text-neutral-500 mt-2.5 leading-relaxed">
          These days show as open on your booking screen AND on the customer
          self-booking link. Flip a day on and its slots open instantly to
          everyone in the follow-up loop.
        </div>
      </Card>

      <Card>
        <div className="text-xs text-neutral-500 tracking-wide mb-2.5">
          Working hours
        </div>
        <div className="flex items-center gap-2.5">
          <select
            value={startHour}
            onChange={(e) => setStartHour(Number(e.target.value))}
            className="flex-1 border border-neutral-300 rounded-lg px-2 py-2 text-sm text-black"
          >
            {HOURS.filter((h) => h < endHour).map((h) => (
              <option key={h} value={h}>
                {fmtHour(h)}
              </option>
            ))}
          </select>
          <span className="text-neutral-500 text-sm">to</span>
          <select
            value={endHour}
            onChange={(e) => setEndHour(Number(e.target.value))}
            className="flex-1 border border-neutral-300 rounded-lg px-2 py-2 text-sm text-black"
          >
            {HOURS.filter((h) => h > startHour).map((h) => (
              <option key={h} value={h}>
                {fmtHour(h)}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        <div className="text-xs text-neutral-500 tracking-wide mb-2.5">
          Time per appointment (measure + drive)
        </div>
        <div className="flex gap-1.5">
          {[60, 90, 120].map((m) => (
            <button
              key={m}
              onClick={() => setSlotMinutes(m)}
              className="flex-1 py-2 rounded-lg border text-[13px] font-medium"
              style={
                slotMinutes === m
                  ? { background: GREEN_DARK, borderColor: GREEN_DARK, color: "#fff" }
                  : { borderColor: "#d5d5d5", color: "#444" }
              }
            >
              {m} min
            </button>
          ))}
        </div>
      </Card>

      <button
        onClick={save}
        disabled={busy}
        className="w-full rounded-xl py-3.5 text-white font-medium disabled:opacity-50"
        style={{ background: GREEN }}
      >
        {busy ? "Saving…" : saved ? "Saved ✓" : "Save availability"}
      </button>
    </Screen>
  );
}
