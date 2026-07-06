// Public self-booking page — /book/:token
// No login. The token in the URL is the key. All data flows through the
// self-booking edge function; this page never queries tables directly.
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  upcomingDays,
  slotsForDay,
  fmtTime,
  isSameDay,
} from "../lib/slots";

const NAVY = "#0b2433";
const ORANGE = "#f97316";
const GREEN = "#1d9e75";
const GREEN_DARK = "#0f6e56";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/self-booking`;

async function callFn(body) {
  const resp = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return resp.json();
}

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

export default function SelfBooking() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [someoneHome, setSomeoneHome] = useState(null);
  const [dogs, setDogs] = useState(null);
  const [cageLocked, setCageLocked] = useState(null);
  const [accessNotes, setAccessNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(null);
  const [slotTaken, setSlotTaken] = useState(false);

  useEffect(() => {
    callFn({ action: "info", token })
      .then((r) => (r.ok ? setInfo(r) : setNotFound(true)))
      .catch(() => setNotFound(true));
  }, [token]);

  const days = useMemo(
    () => (info?.availability ? upcomingDays(info.availability) : []),
    [info],
  );
  const slots = useMemo(
    () =>
      selectedDay && info
        ? slotsForDay(selectedDay, info.bookedTimes, info.availability)
        : [],
    [selectedDay, info],
  );

  async function book() {
    if (!selectedSlot || busy) return;
    setBusy(true);
    setSlotTaken(false);
    try {
      const r = await callFn({
        action: "book",
        token,
        scheduled_at: selectedSlot.toISOString(),
        someone_home: someoneHome,
        dogs_on_property: dogs,
        cage_door_locked: cageLocked,
        access_notes: accessNotes,
      });
      if (r.ok) {
        setConfirmed(r.label);
      } else if (r.error === "slot_taken") {
        setSlotTaken(true);
        const fresh = await callFn({ action: "info", token });
        if (fresh.ok) setInfo(fresh);
        setSelectedSlot(null);
      } else {
        alert("Something went wrong — please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const shell = (children) => (
    <div className="min-h-screen w-full" style={{ background: NAVY }}>
      <div className="mx-auto max-w-md px-4 pt-6 pb-10">
        <div className="flex items-center gap-2 mb-5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ background: ORANGE }}
          >
            ~
          </div>
          <div className="text-white font-medium">
            {info?.business ?? "Pool Remodel Quote"}
          </div>
        </div>
        {children}
      </div>
    </div>
  );

  if (notFound) {
    return shell(
      <div className="bg-white rounded-xl p-5 text-black">
        This booking link isn't valid anymore. If you still want your pool
        estimate, just reply to our text or give us a call.
      </div>,
    );
  }

  if (!info) {
    return shell(<div className="text-white/60 text-sm">Loading…</div>);
  }

  if (confirmed) {
    return shell(
      <div className="bg-white rounded-xl p-5">
        <div className="text-xl font-medium text-black mb-2">
          You're booked, {info.firstName}!
        </div>
        <div className="text-[15px] text-neutral-700 leading-relaxed">
          We'll measure your pool <strong>{confirmed}</strong>. You don't need
          to be home — just make sure the gate is unlocked and pets are inside.
          A confirmation text is on its way to your phone.
        </div>
      </div>,
    );
  }

  if (info.alreadyBooked) {
    return shell(
      <div className="bg-white rounded-xl p-5 text-black">
        Good news, {info.firstName} — your measure is already booked. Check
        your texts for the confirmation, or reply to it if you need to make a
        change.
      </div>,
    );
  }

  return shell(
    <>
      <div className="text-white text-xl font-medium mb-1">
        Pick a time for your free pool measure
      </div>
      <div className="text-[13.5px] mb-4" style={{ color: "#9fb3bd" }}>
        You don't need to be home — we just need to get into the backyard.
        Takes about 30 minutes, no obligation.
      </div>

      <div className="bg-white rounded-xl p-4 mb-2.5">
        <div className="text-xs text-neutral-500 tracking-wide mb-2.5">
          1. Pick a day
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {days.map((d) => {
            const sel = selectedDay && isSameDay(d, selectedDay);
            return (
              <button
                key={d.toISOString()}
                onClick={() => {
                  setSelectedDay(d);
                  setSelectedSlot(null);
                }}
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
          <>
            <div className="text-xs text-neutral-500 tracking-wide mt-3 mb-2">
              2. Pick a time
            </div>
            {slotTaken && (
              <div className="text-[13px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-2">
                That time just got taken — here are the updated openings.
              </div>
            )}
            <div className="flex gap-1.5 flex-wrap">
              {slots.length === 0 && (
                <div className="text-sm text-neutral-500 py-1">
                  No openings this day — try another.
                </div>
              )}
              {slots.map((s) => {
                const sel =
                  selectedSlot && s.getTime() === selectedSlot.getTime();
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
          </>
        )}
      </div>

      {selectedSlot && (
        <div className="bg-white rounded-xl p-4 mb-3">
          <div className="text-xs text-neutral-500 tracking-wide mb-1.5">
            3. Backyard access
          </div>
          <AccessToggle
            label="Will someone be home?"
            value={someoneHome}
            onChange={setSomeoneHome}
          />
          <AccessToggle
            label="Dogs on the property?"
            value={dogs}
            onChange={setDogs}
          />
          <AccessToggle
            label="Pool cage door locked?"
            value={cageLocked}
            onChange={setCageLocked}
          />
          <input
            value={accessNotes}
            onChange={(e) => setAccessNotes(e.target.value)}
            placeholder="Gate location, codes, anything we should know"
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-[13px] text-black mt-1.5"
          />
        </div>
      )}

      <button
        onClick={book}
        disabled={!selectedSlot || busy}
        className="w-full rounded-xl py-3.5 text-white font-medium disabled:opacity-40"
        style={{ background: GREEN }}
      >
        {busy ? "Booking…" : "Book my free measure"}
      </button>
    </>,
  );
}
