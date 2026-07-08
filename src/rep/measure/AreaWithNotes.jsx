// AreaWithNotes — for Extra Tile / Spa Perimeter Tile. Each area is a
// height × length rectangle producing SQUARE FEET (a 16" raised spa wall
// tiled all around is multiple courses, so it's area, not linear feet), plus
// a free note box so the tech labels what the area is for the installer
// ("spa exterior all sides", "spillover fountain face", "negative edge").
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { GREEN, GREEN_DARK, GREEN_TINT } from "../ui";
import { DualInput } from "./DualInput";
import { toFeet, round1 } from "./geometry";

const fs = (m) => ({ fontSize: `calc(var(--ms,1rem)*${m})` });

function areaSqFt(a) {
  return toFeet(a.height) * toFeet(a.length);
}

export default function AreaWithNotes({ areas, onChange, onComplete }) {
  const [draft, setDraft] = useState(null);
  const [editIndex, setEditIndex] = useState(null);

  const total = (areas ?? []).reduce((s, a) => s + areaSqFt(a), 0);

  function openNew() {
    setDraft({ height: { ft: "", in: "" }, length: { ft: "", in: "" }, note: "" });
    setEditIndex(null);
  }
  function openEdit(i) {
    setDraft({ ...areas[i] });
    setEditIndex(i);
  }
  function commit() {
    if (!draft) return;
    const next = [...areas];
    if (editIndex != null) next[editIndex] = draft;
    else next.push(draft);
    onChange(next);
    setDraft(null);
    setEditIndex(null);
  }
  function remove() {
    if (editIndex == null) { setDraft(null); return; }
    onChange(areas.filter((_, i) => i !== editIndex));
    setDraft(null);
    setEditIndex(null);
  }

  const draftArea = draft ? areaSqFt(draft) : 0;

  return (
    <div>
      {(areas ?? []).map((a, i) => (
        <button key={i} onClick={() => openEdit(i)}
          className="w-full text-left bg-white rounded-xl px-3.5 py-3 mb-2 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: GREEN_TINT }}>
            <span style={{ color: GREEN_DARK, ...fs(0.7) }}>ft²</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-black" style={fs(0.9)}>
              {a.note?.trim() ? a.note : `Area ${i + 1}`}
            </div>
            <div className="text-neutral-500" style={fs(0.82)}>
              {round1(toFeet(a.height))} ft × {round1(toFeet(a.length))} ft
            </div>
          </div>
          <div className="font-medium" style={{ color: GREEN_DARK, ...fs(0.92) }}>
            {round1(areaSqFt(a))}
          </div>
        </button>
      ))}

      {draft && (
        <div className="bg-white rounded-xl p-3.5 mb-2.5">
          <div className="font-medium text-black mb-2.5" style={fs(0.92)}>
            {editIndex != null ? `Edit area ${editIndex + 1}` : `Area ${areas.length + 1}`}
          </div>
          <DualInput label="Height" autoFocus value={draft.height}
            onChange={(v) => setDraft({ ...draft, height: v })} />
          <DualInput label="Length" value={draft.length}
            onChange={(v) => setDraft({ ...draft, length: v })} />
          {draftArea > 0 && (
            <div className="text-neutral-500 mb-2" style={fs(0.82)}>
              Area: {round1(draftArea)} sq ft
            </div>
          )}
          <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            placeholder="What is this? (spa exterior, fountain face, negative edge…)"
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-black mb-2.5" style={fs(0.85)} />
          <div className="flex gap-2">
            <button onClick={commit}
              className="flex-1 rounded-lg text-white font-medium flex items-center justify-center gap-1"
              style={{ background: GREEN, padding: "11px 0", ...fs(0.9) }}>
              <Plus size={17} /> Save area
            </button>
            {editIndex != null && (
              <button onClick={remove}
                className="rounded-lg border border-neutral-300 text-neutral-500 flex items-center justify-center"
                style={{ padding: "11px 16px" }} aria-label="Delete area">
                <Trash2 size={17} />
              </button>
            )}
          </div>
        </div>
      )}

      {!draft && (
        <div className="flex gap-2 items-stretch">
          <button onClick={openNew}
            className="rounded-xl text-white font-medium"
            style={{ flex: 1.4, background: GREEN, padding: "12px 0", ...fs(0.88) }}>
            Add area
          </button>
          <button onClick={onComplete}
            className="rounded-xl text-white"
            style={{ flex: 1, border: "0.5px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.08)", padding: "12px 0", ...fs(0.88) }}>
            Done
          </button>
          <div className="rounded-xl bg-white flex flex-col items-center justify-center" style={{ flex: 1, padding: "6px 0" }}>
            <div className="text-neutral-500 uppercase" style={{ ...fs(0.62), letterSpacing: "0.5px" }}>Sq ft</div>
            <div className="font-medium text-black" style={fs(0.92)}>{round1(total)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
