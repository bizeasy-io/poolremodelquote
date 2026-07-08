// Small shared inputs for the measure sections.
import { GREEN_DARK, GREEN_TINT } from "../ui";
import { DualInput } from "./DualInput";

const fs = (m) => ({ fontSize: `calc(var(--ms,1rem)*${m})` });

export function YesNo({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {[true, false].map((v) => (
        <button
          key={String(v)}
          onClick={() => onChange(v)}
          className="flex-1 rounded-lg font-medium border"
          style={{
            padding: "10px 0",
            ...fs(0.9),
            ...(value === v
              ? { background: GREEN_DARK, borderColor: GREEN_DARK, color: "#fff" }
              : { borderColor: "#d5d5d5", color: "#444", background: "#fff" }),
          }}
        >
          {v ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}

// Linear-feet entry as a ft/in pair (wheel or tape), with an optional label.
export function LinearFeet({ label, value, onChange }) {
  return (
    <div>
      {label && (
        <div className="text-neutral-500 mb-1.5" style={fs(0.8)}>
          {label}
        </div>
      )}
      <DualInput label="" value={value} onChange={onChange} />
    </div>
  );
}

export function CountStepper({ label, value, onChange }) {
  const n = parseInt(value) || 0;
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="text-black" style={fs(0.85)}>
        {label}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(0, n - 1))}
          className="w-8 h-8 rounded-full border border-neutral-300 text-neutral-600 flex items-center justify-center"
          aria-label={`Decrease ${label}`}
          style={fs(1.1)}
        >
          −
        </button>
        <div className="w-6 text-center font-medium text-black" style={fs(0.95)}>
          {n}
        </div>
        <button
          onClick={() => onChange(n + 1)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white"
          aria-label={`Increase ${label}`}
          style={{ background: GREEN_DARK, ...fs(1.1) }}
        >
          +
        </button>
      </div>
    </div>
  );
}

// Segmented single-choice (used for spa perimeter tile scope, depth mode)
export function Segmented({ options, value, onChange }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="rounded-full border font-medium"
            style={{
              padding: "7px 14px",
              ...fs(0.82),
              ...(active
                ? { background: GREEN_DARK, borderColor: GREEN_DARK, color: "#fff" }
                : { borderColor: "#d5d5d5", color: "#444", background: "#fff" }),
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// Coping corner pieces — appears in every coping-bearing section
export function CopingCorners({ inside, outside, onInside, onOutside }) {
  return (
    <div
      className="rounded-lg p-2.5 mt-1"
      style={{ background: GREEN_TINT }}
    >
      <div className="text-neutral-600 mb-1" style={fs(0.75)}>
        Corner pieces (cut or pre-made)
      </div>
      <CountStepper label="Inside corners" value={inside} onChange={onInside} />
      <CountStepper label="Outside corners" value={outside} onChange={onOutside} />
    </div>
  );
}
