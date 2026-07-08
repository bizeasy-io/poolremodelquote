// SegmentedLinearFeet — a linear-foot field that can hold one clean run OR
// several segments that auto-total (114 + 80 + 92 across three step faces,
// entered without leaving the app for a calculator).
//
// Value shape (backward compatible with the old plain {ft,in}):
//   { segments: [ {ft,in}, {ft,in}, ... ], }   ← new
//   { ft, in }                                  ← old single-pair; still read
//
// Stores the segment list (for the summary sanity-check count) and exposes the
// total via lfTotalFeet(). Takeoff/quote consume only the total.
import { Plus, X } from "lucide-react";
import { GREEN_DARK } from "../ui";
import { toFeet, round1 } from "./geometry";

const fs = (m) => ({ fontSize: `calc(var(--ms,1rem)*${m})` });

// Normalize either shape into an array of {ft,in} segments
export function toSegments(value) {
  if (!value) return [{ ft: "", in: "" }];
  if (Array.isArray(value.segments)) {
    return value.segments.length ? value.segments : [{ ft: "", in: "" }];
  }
  // legacy single pair
  return [{ ft: value.ft ?? "", in: value.in ?? "" }];
}

export function lfTotalFeet(value) {
  return toSegments(value).reduce((sum, seg) => sum + toFeet(seg), 0);
}

export function segmentCount(value) {
  return toSegments(value).filter((s) => toFeet(s) > 0).length;
}

export function SegmentedLinearFeet({ label, value, onChange }) {
  const segs = toSegments(value);
  const total = lfTotalFeet(value);
  const multi = segs.length > 1;

  const update = (i, seg) => {
    const next = segs.map((s, idx) => (idx === i ? seg : s));
    onChange({ segments: next });
  };
  const add = () => onChange({ segments: [...segs, { ft: "", in: "" }] });
  const remove = (i) =>
    onChange({ segments: segs.filter((_, idx) => idx !== i) });

  return (
    <div className="mb-2">
      {label && (
        <div className="text-neutral-500 mb-1.5" style={fs(0.8)}>
          {label}
        </div>
      )}
      {segs.map((seg, i) => (
        <div key={i} className="flex items-center gap-2 mb-1.5">
          <input
            inputMode="decimal"
            value={seg.ft}
            onChange={(e) => update(i, { ...seg, ft: e.target.value })}
            placeholder="ft"
            className="text-center border border-neutral-300 rounded-lg text-black"
            style={{ width: 60, padding: "8px 4px", ...fs(0.95) }}
            aria-label={`Segment ${i + 1} feet`}
          />
          <input
            inputMode="decimal"
            value={seg.in}
            onChange={(e) => update(i, { ...seg, in: e.target.value })}
            placeholder="in"
            className="text-center border border-neutral-300 rounded-lg text-black"
            style={{ width: 60, padding: "8px 4px", ...fs(0.95) }}
            aria-label={`Segment ${i + 1} inches`}
          />
          <span className="text-neutral-400" style={fs(0.72)}>
            ft · in
          </span>
          {multi && (
            <button
              onClick={() => remove(i)}
              className="ml-auto w-7 h-7 rounded-full text-neutral-400 flex items-center justify-center"
              aria-label={`Remove segment ${i + 1}`}
            >
              <X size={15} />
            </button>
          )}
        </div>
      ))}
      <div className="flex items-center justify-between mt-1">
        <button
          onClick={add}
          className="flex items-center gap-1 font-medium"
          style={{ color: GREEN_DARK, ...fs(0.8) }}
        >
          <Plus size={15} /> Add segment
        </button>
        {multi && (
          <div className="text-neutral-500" style={fs(0.8)}>
            {segs.length} segments · <span className="font-medium text-black">{round1(total)} ft</span>
          </div>
        )}
      </div>
    </div>
  );
}
