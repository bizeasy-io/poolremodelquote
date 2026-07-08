// ShapeBuilder — unbounded NEW SECTION tile model. Reused for pool floor,
// deck, cage roof, and extra tile areas. Footer: New section / Complete /
// running total. Tap a saved tile to reopen and edit. Add/Subtract per tile.
import { useState } from "react";
import { Plus, Minus, Check } from "lucide-react";
import { GREEN, GREEN_DARK, GREEN_TINT } from "../ui";
import { DualInput, ShapeIcon } from "./DualInput";
import {
  SHAPE_META,
  sectionArea,
  sectionsTotal,
  sectionDimLabel,
  round1,
} from "./geometry";

const RED = "#a32d2d";
const RED_TINT = "#fcebeb";

function emptyDraft() {
  return { shape: null, dims: {}, op: null };
}

export default function ShapeBuilder({
  sections,
  onChange,
  onComplete,
  poolAreaChip, // { label, area } | null — deck's "subtract pool area"
  title = "Section",
}) {
  const [draft, setDraft] = useState(null); // null = no open tile
  const [editIndex, setEditIndex] = useState(null);

  const total = sectionsTotal(sections);

  function openNew() {
    setDraft(emptyDraft());
    setEditIndex(null);
  }

  function openEdit(i) {
    setDraft({ ...sections[i], dims: { ...sections[i].dims } });
    setEditIndex(i);
  }

  function commit(op) {
    if (!draft?.shape) return;
    const saved = { ...draft, op };
    const next = [...sections];
    if (editIndex != null) next[editIndex] = saved;
    else next.push(saved);
    onChange(next);
    setDraft(null);
    setEditIndex(null);
  }

  function remove() {
    if (editIndex == null) {
      setDraft(null);
      return;
    }
    onChange(sections.filter((_, i) => i !== editIndex));
    setDraft(null);
    setEditIndex(null);
  }

  function addPoolChip() {
    if (!poolAreaChip) return;
    onChange([
      ...sections,
      {
        shape: "poolref",
        dims: {},
        op: "subtract",
        fixedArea: poolAreaChip.area,
        label: poolAreaChip.label,
      },
    ]);
  }

  const draftArea =
    draft?.shape && draft.shape !== "poolref"
      ? Math.abs(sectionArea({ ...draft, op: "add" }))
      : 0;

  return (
    <div>
      {sections.map((s, i) => {
        const area = s.fixedArea != null
          ? (s.op === "subtract" ? -s.fixedArea : s.fixedArea)
          : sectionArea(s);
        const sub = s.op === "subtract";
        const isPoolRef = s.shape === "poolref";
        return (
          <button
            key={i}
            onClick={() => !isPoolRef && openEdit(i)}
            className="w-full text-left bg-white rounded-xl px-3.5 py-3 mb-2 flex items-center gap-3"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: sub ? RED_TINT : GREEN_TINT }}
            >
              {isPoolRef ? (
                <Minus size={18} color={RED} />
              ) : (
                <ShapeIcon shape={s.shape} active={!sub} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-black" style={{ fontSize: "calc(var(--ms,1rem)*0.82)" }}>
                {isPoolRef ? s.label : `${title} ${i + 1} · ${SHAPE_META[s.shape].label}`}
              </div>
              <div className="text-neutral-500" style={{ fontSize: "calc(var(--ms,1rem)*0.78)" }}>
                {isPoolRef ? "from pool measure" : sectionDimLabel(s)}
              </div>
            </div>
            <div
              className="font-medium"
              style={{ color: area < 0 ? RED : GREEN_DARK, fontSize: "calc(var(--ms,1rem)*0.88)" }}
            >
              {area < 0 ? "−" : "+"}
              {round1(Math.abs(area))}
            </div>
          </button>
        );
      })}

      {draft && (
        <div className="bg-white rounded-xl p-3.5 mb-2.5">
          <div className="font-medium text-black mb-2.5" style={{ fontSize: "calc(var(--ms,1rem)*0.9)" }}>
            {editIndex != null ? `Edit ${title} ${editIndex + 1}` : `${title} ${sections.length + 1}`} · Pick a shape
          </div>
          <div className="flex gap-2 mb-3">
            {Object.keys(SHAPE_META).map((shape) => {
              const active = draft.shape === shape;
              return (
                <button
                  key={shape}
                  onClick={() => setDraft({ ...draft, shape, dims: {} })}
                  aria-label={SHAPE_META[shape].label}
                  className="flex-1 rounded-lg flex items-center justify-center"
                  style={{
                    height: 44,
                    border: active ? `1.5px solid ${GREEN_DARK}` : "0.5px solid #d5d5d5",
                    background: active ? GREEN_TINT : "#fff",
                  }}
                >
                  <ShapeIcon shape={shape} active={active} />
                </button>
              );
            })}
          </div>

          {draft.shape && (
            <>
              {SHAPE_META[draft.shape].fields.map(([key, label], idx) => (
                <DualInput
                  key={key}
                  label={label}
                  autoFocus={idx === 0}
                  value={draft.dims[key]}
                  onChange={(val) =>
                    setDraft({ ...draft, dims: { ...draft.dims, [key]: val } })
                  }
                />
              ))}
              {draftArea > 0 && (
                <div className="text-neutral-500 mb-2" style={{ fontSize: "calc(var(--ms,1rem)*0.78)" }}>
                  Area: {round1(draftArea)} sq ft
                </div>
              )}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => commit("add")}
                  className="flex-1 rounded-lg text-white font-medium flex items-center justify-center gap-1"
                  style={{ background: GREEN, padding: "11px 0", fontSize: "calc(var(--ms,1rem)*0.9)" }}
                >
                  <Plus size={17} /> Add
                </button>
                <button
                  onClick={() => commit("subtract")}
                  className="flex-1 rounded-lg font-medium flex items-center justify-center gap-1"
                  style={{ background: "#fff", border: `1.5px solid #e24b4a`, color: RED, padding: "11px 0", fontSize: "calc(var(--ms,1rem)*0.9)" }}
                >
                  <Minus size={17} /> Subtract
                </button>
              </div>
              {editIndex != null && (
                <button
                  onClick={remove}
                  className="w-full text-center text-neutral-400 mt-2"
                  style={{ fontSize: "calc(var(--ms,1rem)*0.78)" }}
                >
                  Delete this section
                </button>
              )}
            </>
          )}
        </div>
      )}

      {poolAreaChip && !draft && (
        <button
          onClick={addPoolChip}
          className="w-full rounded-lg mb-3"
          style={{
            border: "0.5px solid rgba(255,255,255,0.35)",
            background: "rgba(255,255,255,0.08)",
            color: "#9fe1cb",
            padding: "10px 0",
            fontSize: "calc(var(--ms,1rem)*0.82)",
          }}
        >
          − Subtract pool area ({round1(poolAreaChip.area)} sq ft, from pool measure)
        </button>
      )}

      {!draft && (
        <div className="flex gap-2 items-stretch">
          <button
            onClick={openNew}
            className="rounded-xl text-white font-medium"
            style={{ flex: 1.2, background: GREEN, padding: "12px 0", fontSize: "calc(var(--ms,1rem)*0.85)" }}
          >
            New section
          </button>
          <button
            onClick={onComplete}
            disabled={sections.length === 0}
            className="rounded-xl text-white disabled:opacity-40"
            style={{ flex: 1, border: "0.5px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.08)", padding: "12px 0", fontSize: "calc(var(--ms,1rem)*0.85)" }}
          >
            Complete
          </button>
          <div
            className="rounded-xl bg-white flex flex-col items-center justify-center"
            style={{ flex: 1, padding: "6px 0" }}
          >
            <div className="text-neutral-500 uppercase" style={{ fontSize: "calc(var(--ms,1rem)*0.6)", letterSpacing: "0.5px" }}>
              Total
            </div>
            <div className="font-medium text-black" style={{ fontSize: "calc(var(--ms,1rem)*0.9)" }}>
              {round1(total)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
