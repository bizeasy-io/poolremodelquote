// MeasureFlow — the full field measurement sequence for one appointment.
// Collapsible sections, pool-first then spa, saved to leads.measurement (jsonb).
// "Complete measure" writes the record, marks the appointment measured, and
// fires the estimate-being-prepared text (same as the 2A appointment button).
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ChevronRight, Check, Camera } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Screen, BackHeader, ORANGE, GREEN, GREEN_DARK } from "../ui";
import ShapeBuilder from "./ShapeBuilder";
import AreaWithNotes from "./AreaWithNotes";
import MeasureSummary from "./MeasureSummary";
import { DualInput } from "./DualInput";
import {
  YesNo,
  LinearFeet,
  CountStepper,
  Segmented,
  CopingCorners,
} from "./inputs";
import {
  sectionsTotal,
  averageDepth,
  interiorArea,
  toFeet,
  round1,
} from "./geometry";

// Base measure text size — bumped up for field readability (older eyes).
// A future S/M/L setting overrides --ms; everything scales off this one value.
const MS_BASE = "1.15rem";
const fs = (m) => ({ fontSize: `calc(var(--ms,1rem)*${m})` });

// A collapsible measure section wrapper
function Panel({ id, title, open, done, summary, onToggle, children }) {
  return (
    <div className="bg-white rounded-xl mb-2.5 overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-2.5 px-4 py-3.5 text-left"
      >
        <div className="shrink-0">
          {done ? (
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: GREEN_TINT() }}>
              <Check size={15} color={GREEN_DARK} />
            </div>
          ) : open ? (
            <ChevronDown size={20} className="text-neutral-400" />
          ) : (
            <ChevronRight size={20} className="text-neutral-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-black" style={fs(0.95)}>
            {title}
          </div>
          {!open && summary && (
            <div className="text-neutral-500 truncate" style={fs(0.8)}>
              {summary}
            </div>
          )}
        </div>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
function GREEN_TINT() {
  return "#e1f5ee";
}

const emptyMeasure = () => ({
  perimeter: { ft: "", in: "" },
  floorSections: [],
  floorAreaKnown: "",
  floorMode: "calculated", // calculated | known | gallons
  gallons: "",
  depthMode: 2,
  depths: [{ ft: "", in: "" }, { ft: "", in: "" }, { ft: "", in: "" }],
  poolWaterlineTile: { ft: "", in: "" },
  poolPencilTile: { ft: "", in: "" },
  poolFlushCap: { ft: "", in: "" },
  coping: { ft: "", in: "" },
  copingInside: 0,
  copingOutside: 0,
  hasSpa: null,
  spa: {
    shape: "round",
    dims: { diameter: { ft: "", in: "" }, len: { ft: "", in: "" }, wid: { ft: "", in: "" } },
    depth: { ft: "", in: "" },
    topEdge: null, // coping | tile
    copingRows: 1, // 1 | 2
    spaPerimeter: { ft: "", in: "" },
    copingInside: 0,
    copingOutside: 0,
    topTile: { ft: "", in: "" },
    perimeterTileScope: "none", // none | pool_side | full
    perimeterTile: { ft: "", in: "" },
    pencilTile: { ft: "", in: "" },
    flushCap: { ft: "", in: "" },
  },
  extraTileSections: [],
  hasDeck: null,
  deckSections: [],
  hasCage: null,
  cagePerimeter: { ft: "", in: "" },
  cageRoofSections: [],
  ladders: 0,
  rails: 0,
  damagePhotographed: null, // true = photos taken, false = none found
  damageNotes: "",
});

export default function MeasureFlow() {
  const { id } = useParams(); // appointment id
  const navigate = useNavigate();
  const [appt, setAppt] = useState(null);
  const [m, setM] = useState(emptyMeasure());
  const [open, setOpen] = useState("perimeter");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState("measure"); // "measure" | "summary"

  useEffect(() => {
    supabase
      .from("appointments")
      .select("*, leads(*)")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setAppt(data);
        if (data?.leads?.measurement) {
          setM({ ...emptyMeasure(), ...data.leads.measurement });
        }
      });
  }, [id]);

  const set = (patch) => setM((prev) => ({ ...prev, ...patch }));
  const setSpa = (patch) => setM((prev) => ({ ...prev, spa: { ...prev.spa, ...patch } }));
  const toggle = (panelId) => setOpen((cur) => (cur === panelId ? null : panelId));

  // Derived quantities
  const floorArea = useMemo(() => {
    if (m.floorMode === "known") return parseFloat(m.floorAreaKnown) || 0;
    if (m.floorMode === "gallons") {
      const g = parseFloat(m.gallons) || 0;
      const d = averageDepth(m.depths.slice(0, m.depthMode));
      return d > 0 ? g / 7.48 / d : 0;
    }
    return sectionsTotal(m.floorSections);
  }, [m.floorMode, m.floorAreaKnown, m.gallons, m.depths, m.depthMode, m.floorSections]);

  const perimeterFt = toFeet(m.perimeter);
  const avgDepth = averageDepth(m.depths.slice(0, m.depthMode));
  const IA = interiorArea(floorArea, perimeterFt, avgDepth);
  const deckArea = sectionsTotal(m.deckSections);
  const cageRoofArea = sectionsTotal(m.cageRoofSections);

  async function saveDraft(next) {
    await supabase
      .from("leads")
      .update({ measurement: next ?? m })
      .eq("id", appt.lead_id);
  }

  async function reviewMeasure() {
    // Save current state as a draft and show the summary "thank you" page.
    await saveDraft(m);
    setView("summary");
    window.scrollTo(0, 0);
  }

  async function sendToQuote() {
    if (busy) return;
    setBusy(true);
    try {
      await supabase
        .from("leads")
        .update({ measurement: m, status: "measured" })
        .eq("id", appt.lead_id);
      await supabase
        .from("appointments")
        .update({ status: "completed" })
        .eq("id", id);
      await supabase.functions.invoke("send-sms", {
        body: { type: "measure_complete", lead_id: appt.lead_id },
      });
      navigate("/rep");
    } catch (e) {
      console.error(e);
      alert("Couldn't save the measure — check connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function editFromSummary(panelId) {
    setView("measure");
    setOpen(panelId);
    window.scrollTo(0, 0);
  }

  if (!appt) {
    return (
      <Screen>
        <div style={{ "--ms": MS_BASE }}>
          <BackHeader label="Loading…" onBack={() => navigate("/rep")} />
        </div>
      </Screen>
    );
  }

  const name = appt.leads?.name ?? "";

  if (view === "summary") {
    return (
      <Screen>
        <div style={{ "--ms": MS_BASE }}>
          <BackHeader label={`Measure · ${name}`} onBack={() => setView("measure")} />
          <MeasureSummary m={m} onEdit={editFromSummary} onSend={sendToQuote} busy={busy} />
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <div style={{ "--ms": MS_BASE }}>
      <BackHeader label={`Measure · ${name}`} onBack={() => navigate(`/rep/appointment/${id}`)} />

      {/* Running IA banner */}
      <div
        className="rounded-xl px-4 py-3 mb-3 flex items-center justify-between"
        style={{ background: "rgba(255,255,255,0.1)", border: "0.5px solid rgba(255,255,255,0.2)" }}
      >
        <div className="text-white/70" style={fs(0.78)}>
          Interior area (floor + walls)
        </div>
        <div className="text-white font-medium" style={fs(1.05)}>
          {round1(IA)} sq ft
        </div>
      </div>

      {/* ---------- POOL ---------- */}
      <div className="uppercase tracking-widest mb-2" style={{ color: ORANGE, ...fs(0.72) }}>
        Pool
      </div>

      <Panel id="perimeter" title="Pool perimeter" open={open === "perimeter"}
        done={perimeterFt > 0} summary={perimeterFt > 0 ? `${round1(perimeterFt)} ft` : ""}
        onToggle={toggle}>
        <div className="text-neutral-500 mb-2" style={fs(0.8)}>
          Rolling wheel, measured on site
        </div>
        <DualInput label="Perimeter" value={m.perimeter} onChange={(v) => set({ perimeter: v })} />
      </Panel>

      <Panel id="floor" title="Pool floor area" open={open === "floor"}
        done={floorArea > 0} summary={floorArea > 0 ? `${round1(floorArea)} sq ft` : ""}
        onToggle={toggle}>
        <div className="mb-3">
          <Segmented
            options={[
              { value: "calculated", label: "Calculated" },
              { value: "known", label: "Known area" },
              { value: "gallons", label: "Gallons" },
            ]}
            value={m.floorMode}
            onChange={(v) => set({ floorMode: v })}
          />
        </div>
        {m.floorMode === "calculated" && (
          <ShapeBuilder
            sections={m.floorSections}
            onChange={(s) => { const n = { ...m, floorSections: s }; setM(n); saveDraft(n); }}
            onComplete={() => toggle("floor")}
            title="Section"
          />
        )}
        {m.floorMode === "known" && (
          <div className="flex items-center gap-2">
            <input inputMode="decimal" value={m.floorAreaKnown}
              onChange={(e) => set({ floorAreaKnown: e.target.value })}
              placeholder="sq ft"
              className="border border-neutral-300 rounded-lg px-3 py-2 text-black" style={{ width: 120, ...fs(0.95) }} />
            <span className="text-neutral-500" style={fs(0.8)}>sq ft floor area</span>
          </div>
        )}
        {m.floorMode === "gallons" && (
          <div className="flex items-center gap-2">
            <input inputMode="decimal" value={m.gallons}
              onChange={(e) => set({ gallons: e.target.value })}
              placeholder="gallons"
              className="border border-neutral-300 rounded-lg px-3 py-2 text-black" style={{ width: 120, ...fs(0.95) }} />
            <span className="text-neutral-500" style={fs(0.78)}>gal ÷ 7.48 ÷ avg depth</span>
          </div>
        )}
      </Panel>

      <Panel id="depth" title="Average depth" open={open === "depth"}
        done={avgDepth > 0} summary={avgDepth > 0 ? `avg ${round1(avgDepth)} ft` : ""}
        onToggle={toggle}>
        <div className="mb-3">
          <Segmented
            options={[{ value: 2, label: "2 points" }, { value: 3, label: "3 points" }]}
            value={m.depthMode}
            onChange={(v) => set({ depthMode: v })}
          />
        </div>
        <DualInput label={m.depthMode === 2 ? "Shallow" : "Shallow"} value={m.depths[0]}
          onChange={(v) => { const d = [...m.depths]; d[0] = v; set({ depths: d }); }} />
        {m.depthMode === 3 && (
          <DualInput label="Middle" value={m.depths[1]}
            onChange={(v) => { const d = [...m.depths]; d[1] = v; set({ depths: d }); }} />
        )}
        <DualInput label="Deep" value={m.depths[2]}
          onChange={(v) => { const d = [...m.depths]; d[2] = v; set({ depths: d }); }} />
        <div className="text-neutral-500 mt-1" style={fs(0.75)}>
          Wall area = perimeter × avg depth = {round1(perimeterFt * avgDepth)} sq ft
        </div>
      </Panel>

      <Panel id="pooltile" title="Pool tile" open={open === "pooltile"}
        done={toFeet(m.poolWaterlineTile) > 0}
        summary={toFeet(m.poolWaterlineTile) > 0 ? `waterline ${round1(toFeet(m.poolWaterlineTile))} ft` : ""}
        onToggle={toggle}>
        <LinearFeet label="Waterline / perimeter tile (LF)" value={m.poolWaterlineTile}
          onChange={(v) => set({ poolWaterlineTile: v })} />
        <LinearFeet label="Pencil tile (LF)" value={m.poolPencilTile}
          onChange={(v) => set({ poolPencilTile: v })} />
        <LinearFeet label="Flush cap / bullnose step edge (LF)" value={m.poolFlushCap}
          onChange={(v) => set({ poolFlushCap: v })} />
      </Panel>

      <Panel id="coping" title="Coping" open={open === "coping"}
        done={toFeet(m.coping) > 0} summary={toFeet(m.coping) > 0 ? `${round1(toFeet(m.coping))} ft` : ""}
        onToggle={toggle}>
        <LinearFeet label="Pool coping (LF)" value={m.coping} onChange={(v) => set({ coping: v })} />
        <CopingCorners
          inside={m.copingInside} outside={m.copingOutside}
          onInside={(v) => set({ copingInside: v })} onOutside={(v) => set({ copingOutside: v })} />
      </Panel>

      {/* ---------- SPA ---------- */}
      <div className="uppercase tracking-widest mb-2 mt-4" style={{ color: ORANGE, ...fs(0.72) }}>
        Spa
      </div>

      <Panel id="spa" title="Spa" open={open === "spa"}
        done={m.hasSpa != null}
        summary={m.hasSpa === false ? "None" : m.hasSpa ? "Yes" : ""}
        onToggle={toggle}>
        <div className="mb-1 text-neutral-500" style={fs(0.8)}>Is there a spa?</div>
        <YesNo value={m.hasSpa} onChange={(v) => set({ hasSpa: v })} />

        {m.hasSpa && (
          <div className="mt-3">
            <div className="mb-2">
              <Segmented
                options={[{ value: "round", label: "Round" }, { value: "rect", label: "Rectangular" }]}
                value={m.spa.shape} onChange={(v) => setSpa({ shape: v })} />
            </div>
            {m.spa.shape === "round" ? (
              <DualInput label="Diameter" value={m.spa.dims.diameter}
                onChange={(v) => setSpa({ dims: { ...m.spa.dims, diameter: v } })} />
            ) : (
              <>
                <DualInput label="Length" value={m.spa.dims.len}
                  onChange={(v) => setSpa({ dims: { ...m.spa.dims, len: v } })} />
                <DualInput label="Width" value={m.spa.dims.wid}
                  onChange={(v) => setSpa({ dims: { ...m.spa.dims, wid: v } })} />
              </>
            )}
            <DualInput label="Depth" value={m.spa.depth} onChange={(v) => setSpa({ depth: v })} />

            {/* Top edge decision tree */}
            <div className="mt-3 mb-1.5 text-neutral-500" style={fs(0.8)}>Top edge of spa wall</div>
            <Segmented
              options={[{ value: "coping", label: "Coping" }, { value: "tile", label: "Bullnose tile" }]}
              value={m.spa.topEdge} onChange={(v) => setSpa({ topEdge: v })} />

            {m.spa.topEdge === "coping" && (
              <div className="mt-3">
                <div className="mb-1.5 text-neutral-500" style={fs(0.8)}>Coping rows</div>
                <Segmented
                  options={[{ value: 1, label: "Single row" }, { value: 2, label: "Double row" }]}
                  value={m.spa.copingRows} onChange={(v) => setSpa({ copingRows: v })} />
                <div className="mt-2.5">
                  <LinearFeet
                    label={m.spa.copingRows === 2
                      ? "Spa perimeter — measure the centerline between rows (LF)"
                      : "Spa perimeter (LF)"}
                    value={m.spa.spaPerimeter}
                    onChange={(v) => setSpa({ spaPerimeter: v })} />
                </div>
                {m.spa.copingRows === 2 && toFeet(m.spa.spaPerimeter) > 0 && (
                  <div className="text-neutral-500 mb-1" style={fs(0.75)}>
                    Double row → {round1(toFeet(m.spa.spaPerimeter) * 2)} LF coping
                  </div>
                )}
                <CopingCorners
                  inside={m.spa.copingInside} outside={m.spa.copingOutside}
                  onInside={(v) => setSpa({ copingInside: v })}
                  onOutside={(v) => setSpa({ copingOutside: v })} />
              </div>
            )}

            {m.spa.topEdge === "tile" && (
              <div className="mt-2.5">
                <LinearFeet label="Bullnose top-edge tile (LF)" value={m.spa.topTile}
                  onChange={(v) => setSpa({ topTile: v })} />
              </div>
            )}

            {/* Spa interior waterline tile (inputs kept; relabeled) */}
            <div className="mt-3">
              <LinearFeet label="Spa waterline tile (LF)" value={m.spa.perimeterTile}
                onChange={(v) => setSpa({ perimeterTile: v })} />
              <LinearFeet label="Spa pencil tile (LF)" value={m.spa.pencilTile}
                onChange={(v) => setSpa({ pencilTile: v })} />
              <LinearFeet label="Spa flush cap / step edge (LF)" value={m.spa.flushCap}
                onChange={(v) => setSpa({ flushCap: v })} />
            </div>
            <div className="mt-2 text-neutral-500" style={fs(0.75)}>
              Tile on the OUTSIDE of a raised spa goes under "Extra Tile / Spa Perimeter Tile" below.
            </div>
          </div>
        )}
      </Panel>

      {/* ---------- ADDITIONS ---------- */}
      <div className="uppercase tracking-widest mb-2 mt-4" style={{ color: ORANGE, ...fs(0.72) }}>
        Deck, cage & extras
      </div>

      <Panel id="extratile" title="Extra Tile / Spa Perimeter Tile" open={open === "extratile"}
        done={m.extraTileSections.length > 0}
        summary={m.extraTileSections.length ? `${m.extraTileSections.length} area(s)` : ""}
        onToggle={toggle}>
        <div className="text-neutral-500 mb-2" style={fs(0.78)}>
          Raised spa exterior, spillover fountains, negative edges, raised beams. Enter height × length for square feet, and note what each area is.
        </div>
        <AreaWithNotes
          areas={m.extraTileSections}
          onChange={(s) => { const n = { ...m, extraTileSections: s }; setM(n); saveDraft(n); }}
          onComplete={() => toggle("extratile")}
        />
      </Panel>

      <Panel id="deck" title="Deck remodel" open={open === "deck"}
        done={m.hasDeck != null}
        summary={m.hasDeck === false ? "None" : deckArea > 0 ? `${round1(deckArea)} sq ft` : ""}
        onToggle={toggle}>
        <div className="mb-1 text-neutral-500" style={fs(0.8)}>Deck being remodeled?</div>
        <YesNo value={m.hasDeck} onChange={(v) => set({ hasDeck: v })} />
        {m.hasDeck && (
          <div className="mt-3">
            <ShapeBuilder
              sections={m.deckSections}
              onChange={(s) => { const n = { ...m, deckSections: s }; setM(n); saveDraft(n); }}
              onComplete={() => toggle("deck")}
              poolAreaChip={floorArea > 0 ? { label: "Pool area", area: floorArea } : null}
              title="Section"
            />
          </div>
        )}
      </Panel>

      <Panel id="cage" title="Pool cage" open={open === "cage"}
        done={m.hasCage != null}
        summary={m.hasCage === false ? "None" : cageRoofArea > 0 ? `roof ${round1(cageRoofArea)} sq ft` : ""}
        onToggle={toggle}>
        <div className="mb-1 text-neutral-500" style={fs(0.8)}>New pool cage?</div>
        <YesNo value={m.hasCage} onChange={(v) => set({ hasCage: v })} />
        {m.hasCage && (
          <div className="mt-3">
            <LinearFeet label="Cage perimeter (LF)" value={m.cagePerimeter}
              onChange={(v) => set({ cagePerimeter: v })} />
            <div className="mt-2 mb-1.5 text-neutral-500" style={fs(0.8)}>Roof area</div>
            <ShapeBuilder
              sections={m.cageRoofSections}
              onChange={(s) => { const n = { ...m, cageRoofSections: s }; setM(n); saveDraft(n); }}
              onComplete={() => toggle("cage")}
              title="Section"
            />
          </div>
        )}
      </Panel>

      <Panel id="rails" title="Rails & ladders" open={open === "rails"}
        done={m.ladders > 0 || m.rails > 0}
        summary={(m.ladders || m.rails) ? `${m.rails} rail(s), ${m.ladders} ladder(s)` : ""}
        onToggle={toggle}>
        <CountStepper label="Handrails" value={m.rails} onChange={(v) => set({ rails: v })} />
        <CountStepper label="Ladders" value={m.ladders} onChange={(v) => set({ ladders: v })} />
      </Panel>

      {/* ---------- DAMAGE ---------- */}
      <div className="uppercase tracking-widest mb-2 mt-4" style={{ color: ORANGE, ...fs(0.72) }}>
        Documentation
      </div>

      <Panel id="damage" title="Pre-existing damage" open={open === "damage"}
        done={m.damagePhotographed != null}
        summary={m.damagePhotographed === true ? "Photographed" : m.damagePhotographed === false ? "None found" : ""}
        onToggle={toggle}>
        <div className="text-neutral-500 mb-2.5" style={fs(0.8)}>
          Ripped screens, cracked deck, chipped coping, rusted cage — photograph it before scoping. Protects against "your guys did that."
        </div>
        <div className="flex gap-2 mb-2">
          <label
            className="flex-1 rounded-lg font-medium border flex items-center justify-center gap-1.5 cursor-pointer"
            style={{ padding: "11px 0", ...fs(0.85), background: m.damagePhotographed === true ? GREEN_DARK : "#fff", color: m.damagePhotographed === true ? "#fff" : "#444", borderColor: m.damagePhotographed === true ? GREEN_DARK : "#d5d5d5" }}
          >
            <Camera size={17} /> Photograph damage
            <input type="file" accept="image/*" capture="environment" multiple className="hidden"
              onChange={() => set({ damagePhotographed: true })} />
          </label>
          <button
            onClick={() => set({ damagePhotographed: false })}
            className="flex-1 rounded-lg font-medium border"
            style={{ padding: "11px 0", ...fs(0.85), background: m.damagePhotographed === false ? GREEN_DARK : "#fff", color: m.damagePhotographed === false ? "#fff" : "#444", borderColor: m.damagePhotographed === false ? GREEN_DARK : "#d5d5d5" }}
          >
            No damage found
          </button>
        </div>
        <input value={m.damageNotes} onChange={(e) => set({ damageNotes: e.target.value })}
          placeholder="Notes on condition (optional)"
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-black" style={fs(0.82)} />
      </Panel>

      <button
        onClick={reviewMeasure}
        disabled={busy}
        className="w-full rounded-xl text-white font-medium mt-3 disabled:opacity-50"
        style={{ background: GREEN, padding: "14px 0", ...fs(1) }}
      >
        Review measure
      </button>
      <div className="text-center text-white/40 mt-2" style={fs(0.72)}>
        See the full summary, then send it to quote
      </div>
      </div>
    </Screen>
  );
}
