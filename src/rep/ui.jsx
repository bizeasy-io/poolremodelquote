// Shared visual language for the rep app.
// Palette (locked in design review):
//   navy   #0b2433  — app background, appointment (drive-to) identity
//   orange #f97316  — brand, section labels, on-the-way action
//   green  #1d9e75 / #0f6e56 / #e1f5ee — lead actions (call, replied, done)
//   white cards, black text

export const NAVY = "#0b2433";
export const ORANGE = "#f97316";
export const ORANGE_SOFT = "#ff9d5c";
export const GREEN = "#1d9e75";
export const GREEN_DARK = "#0f6e56";
export const GREEN_TINT = "#e1f5ee";

export function Screen({ children }) {
  return (
    <div className="min-h-screen w-full" style={{ background: NAVY }}>
      <div className="mx-auto max-w-md px-4 pt-5 pb-10">{children}</div>
    </div>
  );
}

export function BrandBar() {
  return (
    <div className="flex items-center gap-2 mb-5">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
        style={{ background: ORANGE }}
      >
        ~
      </div>
      <div className="text-white font-medium">Pool Remodel Quote</div>
    </div>
  );
}

export function SectionLabel({ children, color = ORANGE_SOFT }) {
  return (
    <div
      className="text-xs tracking-widest uppercase mb-2 mt-5"
      style={{ color }}
    >
      {children}
    </div>
  );
}

export function Card({ children, onClick, className = "", style = {} }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={
        "w-full text-left bg-white rounded-xl p-3.5 mb-2.5 " +
        (onClick ? "active:scale-[0.99] transition-transform " : "") +
        className
      }
      style={style}
    >
      {children}
    </Tag>
  );
}

export function IconCircle({ children, bg, color }) {
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
      style={{ background: bg, color }}
    >
      {children}
    </div>
  );
}

export function BackHeader({ label, onBack }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <button
        onClick={onBack}
        aria-label="Back"
        className="w-9 h-9 rounded-full border border-white/30 bg-white/10 text-white flex items-center justify-center"
      >
        ‹
      </button>
      <div
        className="text-xs tracking-widest uppercase"
        style={{ color: ORANGE_SOFT }}
      >
        {label}
      </div>
    </div>
  );
}

export function Pill({ children, tone = "green" }) {
  const tones = {
    green: { bg: GREEN_TINT, color: "#085041" },
    amber: { bg: "#faeeda", color: "#854f0b" },
    gray: { bg: "#f1efe8", color: "#444441" },
  };
  const t = tones[tone] ?? tones.green;
  return (
    <span
      className="text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ background: t.bg, color: t.color }}
    >
      {children}
    </span>
  );
}
