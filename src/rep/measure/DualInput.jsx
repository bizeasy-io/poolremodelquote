// Shared measure-tool primitives: the paired ft/in input and shape icons.
// Font sizing note (per doc 006 Phase 3 requirement): sizes here key off the
// --ms base so a future S/M/L global setting is a one-value change. Falls back
// to 1rem if the variable isn't defined yet.
import { GREEN_DARK } from "../ui";

export function DualInput({ label, value, onChange, autoFocus }) {
  const v = value ?? { ft: "", in: "" };
  return (
    <div className="flex items-center gap-2 mb-2">
      {label && (
        <div
          className="text-neutral-600"
          style={{ width: 64, fontSize: "calc(var(--ms, 1rem) * 0.82)" }}
        >
          {label}
        </div>
      )}
      <input
        inputMode="decimal"
        autoFocus={autoFocus}
        value={v.ft}
        onChange={(e) => onChange({ ...v, ft: e.target.value })}
        placeholder="ft"
        className="text-center border border-neutral-300 rounded-lg text-black"
        style={{ width: 64, padding: "8px 4px", fontSize: "calc(var(--ms, 1rem) * 0.95)" }}
        aria-label={label ? `${label} feet` : "feet"}
      />
      <input
        inputMode="decimal"
        value={v.in}
        onChange={(e) => onChange({ ...v, in: e.target.value })}
        placeholder="in"
        className="text-center border border-neutral-300 rounded-lg text-black"
        style={{ width: 64, padding: "8px 4px", fontSize: "calc(var(--ms, 1rem) * 0.95)" }}
        aria-label={label ? `${label} inches` : "inches"}
      />
      <div className="text-neutral-400" style={{ fontSize: "calc(var(--ms, 1rem) * 0.72)" }}>
        ft · in
      </div>
    </div>
  );
}

const stroke = (active) => (active ? GREEN_DARK : "#5f5e5a");

export function ShapeIcon({ shape, size = 24, active = false }) {
  const s = stroke(active);
  switch (shape) {
    case "rectangle":
      return (
        <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
          <rect x="2" y="5" width="18" height="12" fill="none" stroke={s} strokeWidth="2" />
        </svg>
      );
    case "triangle":
      return (
        <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
          <polygon points="11,4 20,18 2,18" fill="none" stroke={s} strokeWidth="2" />
        </svg>
      );
    case "semicircle":
      return (
        <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
          <path d="M 3 15 A 8 8 0 0 1 19 15 Z" fill="none" stroke={s} strokeWidth="2" />
        </svg>
      );
    case "trapezoid":
      return (
        <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
          <polygon points="6,5 16,5 20,17 2,17" fill="none" stroke={s} strokeWidth="2" />
        </svg>
      );
    default:
      return null;
  }
}
