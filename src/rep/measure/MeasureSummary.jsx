// MeasureSummary — the "thank you page" of the measure. Every captured
// quantity laid out for a final eyeball. Tap any line to jump back to that
// section. "Send to Quote" is the completion action (Phase 4 will make it
// calculate pricing + takeoff + customer quote; for now it saves, marks the
// appointment complete, and texts the customer).
import { useState } from "react";
import { ChevronRight, ArrowRight, Plus, Pencil, X, AlertTriangle } from "lucide-react";
import { GREEN_DARK, ORANGE } from "../ui";
import {
  sectionsTotal,
  averageDepth,
  interiorArea,
  toFeet,
  round1,
  poolGallons,
} from "./geometry";
import { lfTotalFeet, segmentCount } from "./SegmentedLinearFeet";
import { Segmented } from "./inputs";
import { areasTotal } from "./AreaWithNotes";

const fs = (m) => ({ fontSize: `calc(var(--ms,1rem)*${m})` });

const SKIMMER_BRAND_LABEL = { hayward: "Hayward", pentair: "Pentair", other: "Other" };
const DECK_MATERIAL_LABEL = { concrete: "Concrete", pavers: "Pavers", other: "Other" };
const MANUAL_UNITS = [
  { value: "LF", label: "LF" },
  { value: "sqft", label: "sq ft" },
  { value: "each", label: "each" },
  { value: "hour", label: "hour" },
  { value: "flat", label: "flat" },
];
const AMBER = "#854f0b";

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

// Bottom-sheet editor for one manual line (matches the approval-page idiom).
// Description is required to save; qty/unit/price are optional. A BLANK price
// stores null (UNPRICED), never 0 — the owner prices it at approval.
function ManualLineEditor({ initial, onSave, onCancel }) {
  const [description, setDescription] = useState(initial?.description ?? "");
  const [qty, setQty] = useState(initial?.qty == null ? "" : String(initial.qty));
  const [unit, setUnit] = useState(initial?.unit ?? null);
  const [price, setPrice] = useState(initial?.price == null ? "" : String(initial.price));

  const canSave = description.trim().length > 0;

  function save() {
    if (!canSave) return;
    const q = qty.trim() === "" ? null : Number(qty);
    const p = price.trim() === "" ? null : Number(price); // BLANK ≠ 0 — null = unpriced
    onSave({
      description: description.trim(),
      qty: q != null && Number.isFinite(q) ? q : null,
      unit,
      price: p != null && Number.isFinite(p) ? p : null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onCancel}>
      <div className="w-full max-w-md bg-white rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}>
        <div className="font-semibold text-black mb-3" style={fs(1)}>
          {initial ? "Edit line item" : "Add line item"}
        </div>

        <div className="mb-1 text-neutral-500" style={fs(0.8)}>Description</div>
        <input value={description} onChange={(e) => setDescription(e.target.value)} autoFocus
          placeholder="e.g. Remove & haul old spillover feature"
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-black mb-3" style={fs(0.9)} />

        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <div className="mb-1 text-neutral-500" style={fs(0.8)}>Qty (optional)</div>
            <input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)}
              placeholder="—"
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-black" style={fs(0.9)} />
          </div>
          <div className="flex-1">
            <div className="mb-1 text-neutral-500" style={fs(0.8)}>Price (optional)</div>
            <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="Leave blank — owner will price"
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-black" style={fs(0.9)} />
          </div>
        </div>

        <div className="mb-1 text-neutral-500" style={fs(0.8)}>Unit (optional)</div>
        <div className="mb-4">
          <Segmented options={MANUAL_UNITS} value={unit}
            onChange={(v) => setUnit((cur) => (cur === v ? null : v))} />
        </div>

        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-lg font-medium border border-neutral-300 text-neutral-600"
            style={{ padding: "12px 0", ...fs(0.9) }}>
            Cancel
          </button>
          <button onClick={save} disabled={!canSave}
            className="flex-1 rounded-lg font-medium text-white disabled:opacity-40"
            style={{ background: GREEN_DARK, padding: "12px 0", ...fs(0.9) }}>
            Save line
          </button>
        </div>
      </div>
    </div>
  );
}

// One saved manual-line row: description, optional qty×unit, price or amber tag.
function ManualLineRow({ line, onEdit, onRemove }) {
  const hasPrice = line.price != null;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-neutral-100">
      <div className="min-w-0 flex-1 pr-2">
        <div className="text-black" style={fs(0.9)}>{line.description}</div>
        {(line.qty != null || line.unit) && (
          <div className="text-neutral-500" style={fs(0.78)}>
            {[line.qty != null ? round1(line.qty) : null, line.unit].filter((x) => x != null && x !== "").join(" ")}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {hasPrice ? (
          <span className="font-medium text-black" style={fs(0.9)}>
            ${line.price.toLocaleString()}
          </span>
        ) : (
          <span className="rounded-full font-medium px-2 py-0.5" style={{ background: "#faeeda", color: AMBER, ...fs(0.72) }}>
            needs price
          </span>
        )}
        <button onClick={onEdit} aria-label="Edit line" className="w-7 h-7 rounded-full text-neutral-500 flex items-center justify-center">
          <Pencil size={14} />
        </button>
        <button onClick={onRemove} aria-label="Remove line" className="w-7 h-7 rounded-full text-neutral-400 flex items-center justify-center">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

export default function MeasureSummary({ m, onEdit, onSend, busy, onManualLinesChange }) {
  const [editing, setEditing] = useState(null); // { index:number|null } | null
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
  const spaAvgDepth = m.hasSpa ? toFeet(m.spa.depth) : 0;
  const spaArea = !m.hasSpa
    ? 0
    : m.spa.shape === "round"
      ? Math.PI * (toFeet(m.spa.dims.diameter) / 2) ** 2
      : toFeet(m.spa.dims.len) * toFeet(m.spa.dims.wid);
  const fillGallons = poolGallons(floorArea, avgDepth, spaArea, spaAvgDepth);
  const ft = (v) => `${round1(lfTotalFeet(v))} ft`;
  // LF with a sanity-check segment count when it was entered in pieces
  const ftSeg = (v) => {
    const c = segmentCount(v);
    return c > 1 ? `${round1(lfTotalFeet(v))} ft · ${c} seg` : `${round1(lfTotalFeet(v))} ft`;
  };
  const PHOTO_SECTIONS = [
    ["perimeter", "Perimeter"], ["floor", "Floor"], ["depth", "Depth"],
    ["pooltile", "Pool tile"], ["coping", "Coping"],
    ...(m.hasSpa ? [["spa", "Spa"]] : []),
    ...(m.hasDeck ? [["deck", "Deck"]] : []),
    ...(m.hasCage ? [["cage", "Cage"]] : []),
  ];
  const photosFor = (id) => (m.photos?.[id] ?? []).length;
  const missingPhotos = PHOTO_SECTIONS.filter(([id]) => photosFor(id) === 0).map(([, label]) => label);
  const totalPhotos = PHOTO_SECTIONS.reduce((s, [id]) => s + photosFor(id), 0);
  const extraTotal = areasTotal(m.extraTileSections);

  // --- Manual lines ---
  const manualLines = m.manualLines ?? [];
  const newLineId = () =>
    (globalThis.crypto?.randomUUID?.() ?? `ml-${Date.now()}-${manualLines.length}`);
  function saveLine(data) {
    const idx = editing?.index;
    let next;
    if (idx != null && idx >= 0) {
      next = manualLines.map((l, i) => (i === idx ? { ...l, ...data } : l));
    } else {
      next = [...manualLines, { id: newLineId(), ...data, added_by: "tech" }];
    }
    onManualLinesChange?.(next);
    setEditing(null);
  }
  function removeLine(i) {
    onManualLinesChange?.(manualLines.filter((_, idx) => idx !== i));
  }

  // --- Conditional-mandatory validation (spec v4 §16 / package §3) ---
  const skimmerCount = m.skimmers?.count ?? 0;
  const gutterFt = m.cageGutterHeightFt != null ? Number(m.cageGutterHeightFt) : toFeet(m.cageGutterHeight);
  const missing = [];
  if (skimmerCount >= 1 && !m.skimmers?.brand)
    missing.push({ label: "Skimmer brand", panelId: "skimmers", fieldKey: "skimmerBrand" });
  if (m.hasSpa && m.spa?.elevation == null)
    missing.push({ label: "Spa elevation", panelId: "spa", fieldKey: "spaElevation" });
  if (m.hasDeck && !m.deckExistingMaterial)
    missing.push({ label: "Existing deck material", panelId: "deck", fieldKey: "deckExistingMaterial" });
  if (m.hasCage && !(gutterFt > 0))
    missing.push({ label: "Cage gutter height", panelId: "cage", fieldKey: "cageGutterHeight" });
  const canSend = missing.length === 0;

  // Feet-decimal → 7' 6" for the summary line
  const fmtFtIn = (dec) => {
    let f = Math.floor(dec);
    let inch = Math.round((dec - f) * 12);
    if (inch === 12) { f += 1; inch = 0; }
    return inch ? `${f}' ${inch}"` : `${f}'`;
  };

  return (
    <div>
      {!canSend && (
        <div className="rounded-xl px-4 py-3 mb-3" style={{ background: "#faeeda", border: "0.5px solid #e5c9a0" }}>
          <div className="flex items-center gap-2 mb-1.5" style={{ color: AMBER }}>
            <AlertTriangle size={17} />
            <span className="font-semibold" style={fs(0.9)}>
              {missing.length} item{missing.length > 1 ? "s" : ""} needed before sending
            </span>
          </div>
          {missing.map((mi) => (
            <button key={mi.fieldKey} onClick={() => onEdit(mi.panelId, mi.fieldKey)}
              className="w-full flex items-center justify-between py-1.5 text-left border-t border-amber-200/60">
              <span style={{ color: AMBER, ...fs(0.85) }}>{mi.label}</span>
              <ChevronRight size={15} style={{ color: AMBER }} />
            </button>
          ))}
        </div>
      )}

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
        <Line label="Waterline tile" value={ftSeg(m.poolWaterlineTile)} onClick={() => onEdit("pooltile")} />
        <Line label="Pencil tile" value={ftSeg(m.poolPencilTile)} onClick={() => onEdit("pooltile")} />
        <Line label="Flush cap tile" value={ftSeg(m.poolFlushCap)} onClick={() => onEdit("pooltile")} />
        <Line label="Coping" value={`${ft(m.coping)} · ${m.copingInside}in / ${m.copingOutside}out`} onClick={() => onEdit("coping")} />
        <Line
          label="Skimmers"
          value={
            skimmerCount >= 1
              ? `${skimmerCount}${m.skimmers?.brand ? ` · ${SKIMMER_BRAND_LABEL[m.skimmers.brand] ?? m.skimmers.brand}` : ""}`
              : "0 (gutter-overflow)"
          }
          onClick={() => onEdit("skimmers")}
        />
      </Group>

      {m.hasSpa && (
        <Group title="Spa">
          <Line
            label="Elevation"
            value={m.spa?.elevation === "raised" ? "Raised" : m.spa?.elevation === "deck_level" ? "Deck-level" : "—"}
            onClick={() => onEdit("spa", "spaElevation")}
          />
          <Line
            label="Top edge"
            value={m.spa.topEdge === "coping" ? `Coping ${m.spa.copingRows === 2 ? "(double)" : "(single)"}` : "Bullnose tile"}
            onClick={() => onEdit("spa")}
          />
          {m.spa.topEdge === "coping" && (
            <Line label="Spa coping LF" value={`${round1(lfTotalFeet(m.spa.spaPerimeter) * (m.spa.copingRows === 2 ? 2 : 1))} ft`} onClick={() => onEdit("spa")} />
          )}
          <Line label="Spa waterline tile" value={ftSeg(m.spa.perimeterTile)} onClick={() => onEdit("spa")} />
          <Line label="Spa pencil tile" value={ftSeg(m.spa.pencilTile)} onClick={() => onEdit("spa")} />
          <Line label="Spa flush cap tile" value={ftSeg(m.spa.flushCap)} onClick={() => onEdit("spa")} />
        </Group>
      )}

      <Group title="Deck, Cage & Extras">
        {(m.extraTileSections ?? []).length > 0 && (
          <Line label="Extra / spa perimeter tile" value={`${round1(extraTotal)} sq ft`} onClick={() => onEdit("extratile")} />
        )}
        <Line label="Deck" value={m.hasDeck ? `${round1(sectionsTotal(m.deckSections))} sq ft` : "None"} onClick={() => onEdit("deck")} />
        {m.hasDeck && (
          <Line
            label="Existing surface"
            value={m.deckExistingMaterial ? (DECK_MATERIAL_LABEL[m.deckExistingMaterial] ?? m.deckExistingMaterial) : "—"}
            onClick={() => onEdit("deck", "deckExistingMaterial")}
          />
        )}
        {m.hasDeck && lfTotalFeet(m.deckNewFooterLf) > 0 && (
          <Line
            label="New footer"
            value={`${round1(lfTotalFeet(m.deckNewFooterLf))} LF${segmentCount(m.deckNewFooterLf) > 1 ? ` (${segmentCount(m.deckNewFooterLf)} segments)` : ""}${(m.deckPinnedFooterCount ?? 0) > 0 ? ` · ${m.deckPinnedFooterCount} pinned` : ""}`}
            onClick={() => onEdit("deck")}
          />
        )}
        <Line label="Cage" value={m.hasCage ? `roof ${round1(sectionsTotal(m.cageRoofSections))} sq ft, ${ft(m.cagePerimeter)} perim` : "None"} onClick={() => onEdit("cage")} />
        {m.hasCage && (
          <Line label="Gutter height" value={gutterFt > 0 ? fmtFtIn(gutterFt) : "—"} onClick={() => onEdit("cage", "cageGutterHeight")} />
        )}
        <Line label="Rails / ladders / anchors" value={`${m.rails} / ${m.ladders} / ${m.railLadderAnchors ?? 0}`} onClick={() => onEdit("rails")} />
      </Group>

      <Group title="Fittings & Replacements">
        {(m.fittings?.returnJets ?? 0) > 0 && <Line label="Return jets" value={`${m.fittings.returnJets}`} onClick={() => onEdit("fittings")} />}
        {(m.fittings?.mainDrainCovers ?? 0) > 0 && <Line label="Main drain covers" value={`${m.fittings.mainDrainCovers}`} onClick={() => onEdit("fittings")} />}
        {(m.fittings?.vacuumPorts ?? 0) > 0 && <Line label="Vacuum ports" value={`${m.fittings.vacuumPorts}`} onClick={() => onEdit("fittings")} />}
        {(m.fittings?.skimmerDoor ?? 0) > 0 && <Line label="Skimmer door" value={`${m.fittings.skimmerDoor}`} onClick={() => onEdit("fittings")} />}
        {(m.fittings?.skimmerCover ?? 0) > 0 && <Line label="Skimmer cover" value={`${m.fittings.skimmerCover}`} onClick={() => onEdit("fittings")} />}
        {(m.fittings?.skimmerReplacement ?? 0) > 0 && <Line label="Skimmer replacement" value={`${m.fittings.skimmerReplacement}`} onClick={() => onEdit("fittings")} />}
        {(m.fittings?.lightTrimRings ?? 0) > 0 && <Line label="Light trim rings" value={`${m.fittings.lightTrimRings}`} onClick={() => onEdit("fittings")} />}
        {(m.fittings?.newLight ?? 0) > 0 && <Line label="New light" value={`${m.fittings.newLight}`} onClick={() => onEdit("fittings")} />}
      </Group>

      <Group title="Extras">
        <Line label="Leak detection" value={m.leakDetection ? "Yes" : m.leakDetection === false ? "No" : "—"} onClick={() => onEdit("extras")} />
        <Line
          label="Water trucks"
          value={
            m.waterTruckCount > 0
              ? `${m.waterTruckCount} truck(s) · ${Math.round(fillGallons).toLocaleString()} gal`
              : fillGallons > 0
                ? `${Math.round(fillGallons).toLocaleString()} gal est.`
                : "—"
          }
          onClick={() => onEdit("extras")}
        />
        <Line label="Start-up" value={m.startUp ? "Yes — customer hires own" : m.startUp === false ? "No" : "—"} onClick={() => onEdit("extras")} />
      </Group>

      <Group title="Documentation">
        <Line
          label="Pre-existing damage"
          value={m.damagePhotographed === true ? "Photographed" : m.damagePhotographed === false ? "None found" : "Not checked"}
          onClick={() => onEdit("damage")}
        />
      </Group>

      <Group title="Photos for the installer">
        <Line label="Total photos" value={`${totalPhotos}`} />
        {missingPhotos.length > 0 && (
          <div className="py-2 text-amber-700" style={fs(0.8)}>
            No photos in: {missingPhotos.join(", ")}. The installer approves the
            quote from these — add photos if you can, or send as-is.
          </div>
        )}
      </Group>

      <Group title="Additional Items">
        {manualLines.length === 0 && (
          <div className="py-2 text-neutral-400" style={fs(0.82)}>
            None. Add a line for anything the measure fields don't cover — leave the price blank and the owner will price it.
          </div>
        )}
        {manualLines.map((line, i) => (
          <ManualLineRow key={line.id ?? i} line={line}
            onEdit={() => setEditing({ index: i })}
            onRemove={() => removeLine(i)} />
        ))}
        <button onClick={() => setEditing({ index: null })}
          className="w-full flex items-center gap-1.5 font-medium py-2.5" style={{ color: GREEN_DARK, ...fs(0.88) }}>
          <Plus size={16} /> Add line item
        </button>
      </Group>

      <button
        onClick={() => { if (canSend) onSend(); else window.scrollTo(0, 0); }}
        disabled={busy}
        className="w-full rounded-xl text-white font-medium mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ background: canSend ? ORANGE : "#c9a06a", padding: "15px 0", ...fs(1.05) }}
      >
        {busy ? "Sending…" : "Send to Quote"} {!busy && <ArrowRight size={19} />}
      </button>
      <div className="text-center text-white/40 mt-2" style={fs(0.75)}>
        Calculates pricing, builds the installer takeoff, and creates the customer's quote page
      </div>

      {editing && (
        <ManualLineEditor
          initial={editing.index != null ? manualLines[editing.index] : null}
          onSave={saveLine}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
