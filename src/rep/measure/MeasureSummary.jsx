// MeasureSummary — the "thank you page" of the measure. Every captured
// quantity laid out for a final eyeball. Tap any line to jump back to that
// section. "Send to Quote" is the completion action (Phase 4 will make it
// calculate pricing + takeoff + customer quote; for now it saves, marks the
// appointment complete, and texts the customer).
import { ChevronRight, ArrowRight } from "lucide-react";
import { GREEN, GREEN_DARK, ORANGE } from "../ui";
import {
  sectionsTotal,
  averageDepth,
  interiorArea,
  toFeet,
  round1,
} from "./geometry";

const fs = (m) => ({ fontSize: `calc(var(--ms,1rem)*${m})` });

function Line({ label, value, onClick, strong }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-2.5 border-b border-neutral-100 text-left"
    >
      <span className="text-neutral-600" style={fs(strong ? 0.92 : 0.88)}>
        {label}
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className={strong ? "font-semibold text-black" : "font-medium text-black"}
          style={fs(strong ? 0.98 : 0.9)}
        >
          {value}
        </span>
        {onClick && <ChevronRight size={15} className="text-neutral-300" />}
      </span>
    </button>
  );
}

function Group({ title, children }) {
  return (
    <div className="bg-white rounded-xl px-4 py-1.5 mb-2.5">
      <div className="uppercase tracking-wide text-neutral-400 pt-2 pb-1" style={fs(0.68)}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function MeasureSummary({ m, onEdit, onSend, busy }) {
  const floorArea =
    m.floorMode === "known"
      ? parseFloat(m.floorAreaKnown) || 0
      : m.floorMode === "gallons"
        ? (() => {
            const g = parseFloat(m.gallons) || 0;
            const d = averageDepth(m.depths.slice(0, m.depthMode));
            return d > 0 ? g / 7.48 / d : 0;
          })()
        : sectionsTotal(m.floorSections);
  const perimeterFt = toFeet(m.perimeter);
  const avgDepth = averageDepth(m.depths.slice(0, m.depthMode));
  const IA = interiorArea(floorArea, perimeterFt, avgDepth);
  const ft = (v) => `${round1(toFeet(v))} ft`;
  const extraTotal = (m.extraTileSections ?? []).reduce(
    (s, a) => s + toFeet(a.height) * toFeet(a.length),
    0,
  );

  return (
    <div>
      <div
        className="rounded-xl px-4 py-4 mb-3 text-center"
        style={{ background: "rgba(29,158,117,0.15)", border: "0.5px solid rgba(29,158,117,0.4)" }}
      >
        <div className="text-white font-medium" style={fs(1.15)}>
          Measure complete
        </div>
        <div className="text-white/60" style={fs(0.82)}>
          Review below, then send it to quote
        </div>
      </div>

      <Group title="Pool">
        <Line label="Interior area (floor + walls)" value={`${round1(IA)} sq ft`} strong onClick={() => onEdit("floor")} />
        <Line label="Perimeter" value={ft(m.perimeter)} onClick={() => onEdit("perimeter")} />
        <Line label="Floor area" value={`${round1(floorArea)} sq ft`} onClick={() => onEdit("floor")} />
        <Line label="Average depth" value={`${round1(avgDepth)} ft`} onClick={() => onEdit("depth")} />
        <Line label="Waterline tile" value={ft(m.poolWaterlineTile)} onClick={() => onEdit("pooltile")} />
        <Line label="Pencil tile" value={ft(m.poolPencilTile)} onClick={() => onEdit("pooltile")} />
        <Line label="Flush cap tile" value={ft(m.poolFlushCap)} onClick={() => onEdit("pooltile")} />
        <Line label="Coping" value={`${ft(m.coping)} · ${m.copingInside}in / ${m.copingOutside}out`} onClick={() => onEdit("coping")} />
      </Group>

      {m.hasSpa && (
        <Group title="Spa">
          <Line
            label="Top edge"
            value={m.spa.topEdge === "coping" ? `Coping ${m.spa.copingRows === 2 ? "(double)" : "(single)"}` : "Bullnose tile"}
            onClick={() => onEdit("spa")}
          />
          {m.spa.topEdge === "coping" && (
            <Line label="Spa coping LF" value={`${round1(toFeet(m.spa.spaPerimeter) * (m.spa.copingRows === 2 ? 2 : 1))} ft`} onClick={() => onEdit("spa")} />
          )}
          <Line label="Spa waterline tile" value={ft(m.spa.perimeterTile)} onClick={() => onEdit("spa")} />
          <Line label="Spa pencil tile" value={ft(m.spa.pencilTile)} onClick={() => onEdit("spa")} />
          <Line label="Spa flush cap tile" value={ft(m.spa.flushCap)} onClick={() => onEdit("spa")} />
        </Group>
      )}

      <Group title="Deck, cage & extras">
        {(m.extraTileSections ?? []).length > 0 && (
          <Line label="Extra / spa perimeter tile" value={`${round1(extraTotal)} sq ft`} onClick={() => onEdit("extratile")} />
        )}
        <Line label="Deck" value={m.hasDeck ? `${round1(sectionsTotal(m.deckSections))} sq ft` : "None"} onClick={() => onEdit("deck")} />
        <Line label="Cage" value={m.hasCage ? `roof ${round1(sectionsTotal(m.cageRoofSections))} sq ft, ${ft(m.cagePerimeter)} perim` : "None"} onClick={() => onEdit("cage")} />
        <Line label="Rails / ladders" value={`${m.rails} / ${m.ladders}`} onClick={() => onEdit("rails")} />
      </Group>

      <Group title="Documentation">
        <Line
          label="Pre-existing damage"
          value={m.damagePhotographed === true ? "Photographed" : m.damagePhotographed === false ? "None found" : "Not checked"}
          onClick={() => onEdit("damage")}
        />
      </Group>

      <button
        onClick={onSend}
        disabled={busy}
        className="w-full rounded-xl text-white font-medium mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ background: ORANGE, padding: "15px 0", ...fs(1.05) }}
      >
        {busy ? "Sending…" : "Send to Quote"} {!busy && <ArrowRight size={19} />}
      </button>
      <div className="text-center text-white/40 mt-2" style={fs(0.75)}>
        Calculates pricing, builds the installer takeoff, and creates the customer's quote page
      </div>
    </div>
  );
}
