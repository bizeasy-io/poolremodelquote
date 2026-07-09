// AreaWithNotes — for Extra Tile / Spa Perimeter Tile. Each area is any shape
// (rectangle / triangle / semicircle / trapezoid) producing SQUARE FEET, plus
// a free note box so the tech labels what it is for the installer ("spa
// exterior all sides", "spillover fountain face", "negative edge").
//
// Backward compatible: areas saved earlier as {height,length,note} still read
// as rectangles.
import { useState } from "react";
import { Plus, Minus, Trash2 } from "lucide-react";
import { GREEN, GREEN_DARK, GREEN_TINT } from "../ui";
import { DualInput, ShapeIcon } from "./DualInput";
import {
  SHAPE_META,
  rectangleArea,
  triangleArea,
  semicircleArea,
  trapezoidArea,
  round1,
} from "./geometry";

const fs = (m) => ({ fontSize: `calc(var(--ms,1rem)*${m})` });
const RED = "#a32d2d";
const RED_TINT = "#fcebeb";

function rawArea(a) {
  if (a.shape == null && (a.height || a.length)) {
    return rectangleArea(a.height, a.length);
  }
  switch (a.shape) {
    case "rectangle": return rectangleArea(a.dims?.len, a.dims?.wid);
    case "triangle": return triangleArea(a.dims?.a, a.dims?.b, a.dims?.c);
    case "semicircle": return semicircleArea(a.dims?.diameter);
    case "trapezoid": return trapezoidArea(a.dims?.b1, a.dims?.b2, a.dims?.h);
    default: return 0;
  }
}
function signedArea(a) {
  const r = rawArea(a);
  return a.op === "subtract" ? -r : r;
}
export function areasTotal(areas) {
  return (areas ?? []).reduce((s, a) => s + signedArea(a), 0);
}
function dimSummary(a) {
  if (a.shape == null && (a.height || a.length)) return "rectangle";
  const d = a.dims ?? {};
  const L = (x) => round1((parseFloat(x?.ft) || 0) + (parseFloat(x?.in) || 0) / 12);
  switch (a.shape) {
    case "rectangle": return `${L(d.len)} × ${L(d.wid)} ft`;
    case "triangle": return `${L(d.a)}, ${L(d.b)}, ${L(d.c)} ft`;
    case "semicircle": return `diam ${L(d.diameter)} ft`;
    case "trapezoid": return `${L(d.b1)}, ${L(d.b2)} · h ${L(d.h)} ft`;
    default: return "";
  }
}
function emptyDraft() { return { shape: null, dims: {}, op: null, note: "" }; }

export default function AreaWithNotes({ areas, onChange, onComplete }) {
  const [draft, setDraft] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const total = areasTotal(areas);

  function openNew() { setDraft(emptyDraft()); setEditIndex(null); }
  function openEdit(i) {
    const a = areas[i];
    if (a.shape == null && (a.height || a.length)) {
      setDraft({ shape: "rectangle", dims: { len: a.height, wid: a.length }, op: a.op ?? "add", note: a.note ?? "" });
    } else {
      setDraft({ ...a, dims: { ...a.dims }, op: a.op ?? "add" });
    }
    setEditIndex(i);
  }
  function commit(op) {
    if (!draft?.shape) return;
    const saved = { ...draft, op };
    const next = [...areas];
    if (editIndex != null) next[editIndex] = saved; else next.push(saved);
    onChange(next);
    setDraft(null); setEditIndex(null);
  }
  function remove() {
    if (editIndex == null) { setDraft(null); return; }
    onChange(areas.filter((_, i) => i !== editIndex));
    setDraft(null); setEditIndex(null);
  }

  const draftArea = draft?.shape ? Math.abs(rawArea({ ...draft })) : 0;

  return (
    <div>
      {(areas ?? []).map((a, i) => {
        const area = signedArea(a);
        const sub = a.op === "subtract";
        return (
          <button key={i} onClick={() => openEdit(i)}
            className="w-full text-left bg-white rounded-xl px-3.5 py-3 mb-2 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: sub ? RED_TINT : GREEN_TINT }}>
              <ShapeIcon shape={a.shape ?? "rectangle"} active={!sub} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-black" style={fs(0.9)}>
                {a.note?.trim() ? a.note : `Area ${i + 1}`}
              </div>
              <div className="text-neutral-500" style={fs(0.82)}>{dimSummary(a)}</div>
            </div>
            <div className="font-medium" style={{ color: area < 0 ? RED : GREEN_DARK, ...fs(0.9) }}>
              {area < 0 ? "\u2212" : "+"}{round1(Math.abs(area))}
            </div>
          </button>
        );
      })}

      {draft && (
        <div className="bg-white rounded-xl p-3.5 mb-2.5">
          <div className="font-medium text-black mb-2.5" style={fs(0.92)}>
            {editIndex != null ? `Edit Area ${editIndex + 1}` : `Area ${areas.length + 1}`} · Pick A Shape
          </div>
          <div className="flex gap-2 mb-3">
            {Object.keys(SHAPE_META).map((shape) => {
              const active = draft.shape === shape;
              return (
                <button key={shape} onClick={() => setDraft({ ...draft, shape, dims: {} })}
                  aria-label={SHAPE_META[shape].label}
                  className="flex-1 rounded-lg flex items-center justify-center"
                  style={{ height: 44, border: active ? `1.5px solid ${GREEN_DARK}` : "0.5px solid #d5d5d5", background: active ? GREEN_TINT : "#fff" }}>
                  <ShapeIcon shape={shape} active={active} />
                </button>
              );
            })}
          </div>
          {draft.shape && (
            <>
              {SHAPE_META[draft.shape].fields.map(([key, label], idx) => (
                <DualInput key={key} label={label} autoFocus={idx === 0}
                  value={draft.dims[key]}
                  onChange={(val) => setDraft({ ...draft, dims: { ...draft.dims, [key]: val } })} />
              ))}
              {draftArea > 0 && (
                <div className="text-neutral-500 mb-2" style={fs(0.8)}>Area: {round1(draftArea)} sq ft</div>
              )}
              <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                placeholder="What is this? (spa exterior, fountain face, negative edge...)"
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-black mb-2.5" style={fs(0.85)} />
              <div className="flex gap-2">
                <button onClick={() => commit("add")}
                  className="flex-1 rounded-lg text-white font-medium flex items-center justify-center gap-1"
                  style={{ background: GREEN, padding: "11px 0", ...fs(0.9) }}>
                  <Plus size={17} /> Add
                </button>
                <button onClick={() => commit("subtract")}
                  className="flex-1 rounded-lg font-medium flex items-center justify-center gap-1"
                  style={{ background: "#fff", border: "1.5px solid #e24b4a", color: RED, padding: "11px 0", ...fs(0.9) }}>
                  <Minus size={17} /> Subtract
                </button>
                {editIndex != null && (
                  <button onClick={remove}
                    className="rounded-lg border border-neutral-300 text-neutral-500 flex items-center justify-center"
                    style={{ padding: "11px 14px" }} aria-label="Delete area">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {!draft && (
        <div className="flex gap-2 items-stretch">
          <button onClick={openNew} className="rounded-xl text-white font-medium"
            style={{ flex: 1.4, background: GREEN, padding: "12px 0", ...fs(0.88) }}>New Area</button>
          <button onClick={onComplete} className="rounded-xl text-white"
            style={{ flex: 1, border: "0.5px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.08)", padding: "12px 0", ...fs(0.88) }}>Complete</button>
          <div className="rounded-xl bg-white flex flex-col items-center justify-center" style={{ flex: 1, padding: "6px 0" }}>
            <div className="text-neutral-500 uppercase" style={{ ...fs(0.62), letterSpacing: "0.5px" }}>Sq Ft</div>
            <div className="font-medium text-black" style={fs(0.92)}>{round1(total)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
