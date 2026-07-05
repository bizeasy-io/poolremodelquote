import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone,
  MessageCircle,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CornerUpLeft,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  Screen,
  BrandBar,
  SectionLabel,
  Card,
  IconCircle,
  NAVY,
  ORANGE_SOFT,
  GREEN,
  GREEN_DARK,
  GREEN_TINT,
} from "./ui";
import { isToday, isSameDay } from "../lib/slots";

const AMBER = "#fac775";

function fmtReceived(ts) {
  const d = new Date(ts);
  const time = d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .toLowerCase();
  return isToday(d)
    ? `Came in ${time}`
    : `Came in ${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;
}

function fmtApptTime(ts) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dayLabel(date) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, tomorrow)) return "Tomorrow";
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

export default function DayView() {
  const navigate = useNavigate();
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [leads, setLeads] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = isToday(viewDate);
  const accent = today ? ORANGE_SOFT : AMBER;

  const goToday = useCallback(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setViewDate(d);
  }, []);

  // The app always opens to today — returning from background resets the view.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") goToday();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [goToday]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const dayStart = new Date(viewDate);
      const dayEnd = new Date(viewDate);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [leadsRes, followRes, apptRes] = await Promise.all([
        // Every unbooked lead, oldest first — not day-scoped.
        // "Replied" leads (2B) sort above new ones.
        supabase
          .from("leads")
          .select("id, name, zip, city, created_at, status, replied_at")
          .in("status", ["new"])
          .order("created_at", { ascending: true }),
        supabase
          .from("leads")
          .select("id, name, created_at, status, nurture_step, last_contact_attempt_at")
          .in("status", ["attempted", "nurturing"])
          .order("last_contact_attempt_at", { ascending: true }),
        supabase
          .from("appointments")
          .select("id, lead_id, scheduled_at, status, leads(name, address, city)")
          .gte("scheduled_at", dayStart.toISOString())
          .lt("scheduled_at", dayEnd.toISOString())
          .neq("status", "canceled")
          .order("scheduled_at", { ascending: true }),
      ]);

      if (cancelled) return;
      setLeads(leadsRes.data ?? []);
      setFollowUps(followRes.data ?? []);
      setAppointments(apptRes.data ?? []);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [viewDate]);

  const shiftDay = (delta) => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + delta);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (d < todayStart) return;
    setViewDate(d);
  };

  return (
    <Screen>
      <BrandBar />

      <div className="flex items-center justify-between mb-4">
        <button className="text-left" onClick={goToday}>
          <div
            className="text-xs tracking-widest uppercase font-medium mb-0.5"
            style={{ color: accent }}
          >
            {dayLabel(viewDate)}
          </div>
          <div className="text-white text-2xl font-medium">
            {viewDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
        </button>
        <div className="flex gap-2">
          {!today && (
            <button
              onClick={() => shiftDay(-1)}
              aria-label="Previous day"
              className="w-10 h-10 rounded-full border border-white/30 bg-white/10 text-white flex items-center justify-center"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <button
            onClick={() => shiftDay(1)}
            aria-label="Next day"
            className="w-10 h-10 rounded-full border border-white/30 bg-white/10 text-white flex items-center justify-center"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {!today && (
        <button
          onClick={goToday}
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 mb-3 text-xs"
          style={{
            background: "rgba(250,199,117,0.15)",
            border: "0.5px solid rgba(250,199,117,0.4)",
            color: AMBER,
          }}
        >
          <CornerUpLeft size={15} />
          Viewing {dayLabel(viewDate).toLowerCase()} — tap here to return to
          today
        </button>
      )}

      {today && (
        <>
          <SectionLabel color={accent}>Leads — call oldest first</SectionLabel>
          {loading && leads.length === 0 && (
            <div className="text-white/50 text-sm py-2">Loading…</div>
          )}
          {!loading && leads.length === 0 && (
            <div className="text-white/50 text-sm py-2">
              No leads waiting. Nice.
            </div>
          )}
          {leads.map((lead) => {
            const replied = !!lead.replied_at;
            return (
              <Card
                key={lead.id}
                onClick={() => navigate(`/rep/lead/${lead.id}`)}
                className={replied ? "rounded-l-none" : ""}
                style={replied ? { borderLeft: `5px solid ${GREEN}` } : {}}
              >
                <div className="flex items-center gap-3">
                  <IconCircle bg={GREEN_TINT} color={GREEN_DARK}>
                    {replied ? (
                      <MessageCircle size={20} />
                    ) : (
                      <Phone size={20} />
                    )}
                  </IconCircle>
                  <div className="min-w-0">
                    {replied && (
                      <div
                        className="text-xs font-medium"
                        style={{ color: GREEN_DARK }}
                      >
                        Replied — call back
                      </div>
                    )}
                    <div className="font-medium text-[15px] text-black">
                      New lead — {lead.name}
                    </div>
                    <div className="text-[13px] text-neutral-600">
                      {fmtReceived(lead.created_at)}
                      {lead.city ? ` · ${lead.city}` : ""}
                      {lead.zip ? ` ${lead.zip}` : ""}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </>
      )}

      <SectionLabel color={accent}>Appointments</SectionLabel>
      {!loading && appointments.length === 0 && (
        <div className="text-white/50 text-sm py-2">
          Nothing booked {today ? "today" : "this day"} yet.
        </div>
      )}
      {appointments.map((appt) => {
        const done = appt.status === "completed";
        const noAccess = appt.status === "no_access";
        return (
          <Card
            key={appt.id}
            onClick={() => navigate(`/rep/appointment/${appt.id}`)}
            style={done || noAccess ? { background: "rgba(255,255,255,0.45)" } : {}}
          >
            <div className="flex items-center gap-3">
              {done ? (
                <IconCircle bg="rgba(225,245,238,0.6)" color={GREEN_DARK}>
                  <Check size={20} />
                </IconCircle>
              ) : (
                <IconCircle bg={NAVY} color="#ffffff">
                  <Car size={20} />
                </IconCircle>
              )}
              <div className="min-w-0">
                <div
                  className={
                    "font-medium text-[15px] " +
                    (done ? "line-through text-slate-600" : "text-black")
                  }
                >
                  {fmtApptTime(appt.scheduled_at)} — {appt.leads?.name}
                </div>
                <div className="text-[13px] text-neutral-600">
                  {done
                    ? "Measure complete"
                    : noAccess
                      ? "Couldn't access — needs rebooking"
                      : [appt.leads?.address, appt.leads?.city]
                          .filter(Boolean)
                          .join(", ")}
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      {today && followUps.length > 0 && (
        <>
          <SectionLabel color={accent}>
            Follow-up — automation running
          </SectionLabel>
          {followUps.map((f) => (
            <button
              key={f.id}
              onClick={() => navigate(`/rep/lead/${f.id}`)}
              className="w-full text-left rounded-xl px-3.5 py-3 mb-2.5 flex items-center gap-3"
              style={{
                background: "rgba(255,255,255,0.14)",
                border: "0.5px solid rgba(255,255,255,0.25)",
              }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(255,255,255,0.12)", color: "#b8c6cd" }}
              >
                <Clock size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-white text-sm font-medium">{f.name}</div>
                <div className="text-[12.5px]" style={{ color: "#b8c6cd" }}>
                  {f.status === "nurturing"
                    ? `Text ${Math.min(f.nurture_step + 1, 3)} of 3 sent · booking link active`
                    : "Called — no answer yet"}
                </div>
              </div>
            </button>
          ))}
        </>
      )}

      {!today && (
        <div className="text-center text-[13px] py-3" style={{ color: "#6d7f88" }}>
          Leads only show on today's view
        </div>
      )}
    </Screen>
  );
}
