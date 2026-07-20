// Rate Card presentational pieces. Dumb components: each takes a value/cell and
// an onChange; RateCard.jsx owns the state and wires them. The one non-obvious
// rule lives here — PriceCell renders the price_set signal (§1a/§1b): a hollow
// cell is AMBER and shows no number; a human touch (typing, or the "$0" confirm
// for a deliberate free line like Silver Pearl) flips price_set true.
import { useState } from "react";
import { UNITS } from "./schema";
import { NAVY, ORANGE } from "../ui";

const fs = (m) => ({ fontSize: `calc(var(--ms,1rem)*${m})` });

const AMBER_BG = "#fff8ec";
const AMBER_BORDER = "#e0a23d";
const AMBER_TEXT = "#854f0b";
const GREY = "#9aa0a6";

function money(n) {
  const v = Number(n) || 0;
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Quantity/percent display — natural precision, NEVER forced to .00 (§2.4:
// an IA floor is "750", not "750.00").
function quantity(n) {
  return String(Number(n) || 0);
}

// Filter a raw keystroke string to digits + a single decimal point. No
// formatting, no reformatting — this is the whole point of the blur pattern:
// while focused the input holds exactly what was typed so the caret never jumps.
function filterNumeric(str) {
  let next = String(str).replace(/[^0-9.]/g, "");
  const firstDot = next.indexOf(".");
  if (firstDot !== -1) {
    next = next.slice(0, firstDot + 1) + next.slice(firstDot + 1).replace(/\./g, "");
  }
  return next;
}

// A single price field with the price_set behaviour.
//   na=true  → grey dash (which-column-applies rule, §1.4)
//   hollow   → amber, empty (no placeholder number, §1b)
//   set      → shows the value
//
// Format-on-blur: while focused the input holds a RAW typed string (draft !==
// null); on blur it parses, formats (currency → 2dp; quantity → natural), and
// commits the canonical value. Currency vs quantity is read off `prefix`
// ("$" = currency, "" = quantity/percent). An empty field on blur resolves to
// HOLLOW (price_set false), never $0.00 — the "set $0" button is the only path
// to a deliberate zero.
export function PriceCell({ cell, onChange, prefix = "$", suffix = "", na = false, label }) {
  const [draft, setDraft] = useState(null); // null = not editing; string = live raw input
  if (na) {
    return (
      <div className="flex flex-col gap-0.5">
        {label && <span className="uppercase tracking-wide" style={{ color: GREY, ...fs(0.6) }}>{label}</span>}
        <div className="flex items-center justify-center rounded-md border"
          style={{ borderColor: "#e5e5e5", background: "#fafafa", color: GREY, height: 34, minWidth: "var(--rc-cell,5.5rem)" }}>
          —
        </div>
      </div>
    );
  }
  const hollow = !cell?.price_set;
  const isCurrency = prefix === "$";
  const fmt = (v) => (isCurrency ? money(v) : quantity(v));

  const displayValue =
    draft !== null ? draft : hollow ? "" : fmt(cell.value);

  const onFocus = () => setDraft(hollow ? "" : String(cell.value)); // raw, unformatted for editing
  const onBlur = (e) => {
    // Read the live input value (not the draft closure) so commit is never
    // stale under any render timing.
    const cleaned = filterNumeric(e.target.value);
    setDraft(null);
    if (cleaned === "" || cleaned === ".") {
      // Empty → HOLLOW, never a silent $0.00 (§1a/§1b).
      onChange({ value: 0, price_set: false });
      return;
    }
    onChange({ value: parseFloat(cleaned) || 0, price_set: true });
  };
  return (
    <div className="flex flex-col gap-0.5">
      {label && <span className="uppercase tracking-wide" style={{ color: hollow ? AMBER_TEXT : GREY, ...fs(0.6) }}>{label}</span>}
      <div className="flex items-center rounded-md border px-2"
        style={{
          height: 34, minWidth: "var(--rc-cell,5.5rem)",
          borderColor: hollow ? AMBER_BORDER : "#d5d5d5",
          background: hollow ? AMBER_BG : "#fff",
        }}>
        {prefix && <span style={{ color: hollow ? AMBER_TEXT : "#666", ...fs(0.8) }}>{prefix}</span>}
        <input
          inputMode="decimal"
          value={displayValue}
          onFocus={onFocus}
          onChange={(e) => setDraft(filterNumeric(e.target.value))}
          onBlur={onBlur}
          placeholder=""
          className="w-full bg-transparent outline-none text-right text-black"
          style={fs(0.85)}
        />
        {suffix && <span style={{ color: "#888", ...fs(0.7) }}>{suffix}</span>}
      </div>
      {hollow && (
        <button
          onClick={() => onChange({ value: 0, price_set: true })}
          className="rounded border text-center"
          style={{ borderColor: AMBER_BORDER, color: AMBER_TEXT, background: "#fff", ...fs(0.6), padding: "1px 0" }}
        >
          set $0
        </button>
      )}
    </div>
  );
}

export function Dash() {
  return <span style={{ color: GREY }}>—</span>;
}

export function Toggle({ on, onChange, label }) {
  return (
    <button onClick={() => onChange(!on)} className="flex items-center gap-1.5">
      <span className="rounded-full transition-colors" style={{ width: 34, height: 20, background: on ? ORANGE : "#cfcfcf", position: "relative", flexShrink: 0 }}>
        <span style={{ position: "absolute", top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .12s" }} />
      </span>
      {label && <span className="text-neutral-600" style={fs(0.72)}>{label}</span>}
    </button>
  );
}

export function UnitSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-neutral-300 bg-white text-black px-1.5"
      style={{ height: 34, ...fs(0.78) }}>
      {UNITS.map((u) => <option key={u.v} value={u.v}>{u.label}</option>)}
    </select>
  );
}

export function TextField({ value, onChange, placeholder, flex = false, mono = false }) {
  return (
    <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className={"rounded-md border border-neutral-300 bg-white text-black px-2 " + (flex ? "w-full " : "")}
      style={{ height: 32, ...(mono ? { fontFamily: "ui-monospace, monospace" } : {}), ...fs(0.8) }} />
  );
}

// small inline numeric (inches / percents) — not a price, no price_set
export function NumField({ value, onChange, placeholder, suffix }) {
  return (
    <div className="flex items-center gap-1">
      <input inputMode="decimal" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        placeholder={placeholder}
        className="rounded-md border border-neutral-300 bg-white text-black px-2 text-right"
        style={{ height: 32, width: "3.6rem", ...fs(0.8) }} />
      {suffix && <span className="text-neutral-500" style={fs(0.7)}>{suffix}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Labor line — dual Install / R&R always present; grey dash where a category
// override makes a column N/A (§1.2/§1.4). Optional min_charge (§1e) + markup.
export function LaborRow({ line, idx, onChange }) {
  const set = (partial) => onChange(partial);
  return (
    <div className="px-3 py-2.5" style={{ background: idx % 2 ? "#f6f7f4" : "#fff" }}>
      <div className="flex items-start gap-2 mb-2">
        <TextField value={line.label} onChange={(v) => set({ label: v })} placeholder="Labor line" flex />
        <UnitSelect value={line.unit} onChange={(v) => set({ unit: v })} />
      </div>
      {line.note && <div className="text-neutral-400 mb-2" style={fs(0.66)}>{line.note}</div>}
      <div className="flex flex-wrap items-end gap-2">
        <PriceCell label="Install" cell={line.install} na={line.install_na}
          onChange={(c) => set({ install: c })} suffix={`/${unitShort(line.unit)}`} />
        <PriceCell label="R & R" cell={line.randr} na={line.randr_na}
          onChange={(c) => set({ randr: c })} suffix={`/${unitShort(line.unit)}`} />
        <PriceCell label="Min charge" cell={line.min_charge}
          onChange={(c) => set({ min_charge: c })} />
      </div>
      <div className="flex items-center gap-3 mt-2">
        <Toggle on={line.markup_on} onChange={(v) => set({ markup_on: v })} label="Rate is a cost (markup)" />
        {line.markup_on && (
          <PriceCell prefix="" suffix="%" cell={line.markup_pct} onChange={(c) => set({ markup_pct: c })} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Material / catalog product. `fields` (from the band) decides which conditional
// attribute editors surface — the same fat record everywhere (§19).
export function ProductRow({ prod, idx, fields, onChange }) {
  const set = (partial) => onChange(partial);
  const has = (f) => fields.includes(f);
  const isPair = has("equipment") || has("fitting"); // cost + retail columns (§12/§2.7)
  return (
    <div className="px-3 py-2.5" style={{ background: idx % 2 ? "#f6f7f4" : "#fff", opacity: prod.discontinued ? 0.5 : 1 }}>
      <div className="flex items-start gap-2 mb-2">
        <TextField value={prod.name} onChange={(v) => set({ name: v })} placeholder="Product / part name" flex />
        <UnitSelect value={prod.unit} onChange={(v) => set({ unit: v })} />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-neutral-400 uppercase tracking-wide" style={fs(0.62)}>SKU</span>
        <TextField value={prod.sku} onChange={(v) => set({ sku: v })} placeholder="part #" mono flex />
      </div>
      <div className="flex flex-wrap items-end gap-2">
        {isPair ? (
          <>
            <PriceCell label={has("fitting") ? "Part cost" : "Cost"} cell={prod.cost} onChange={(c) => set({ cost: c })} />
            <PriceCell label={has("fitting") ? "Installed (truth)" : "Retail"} cell={prod.retail} onChange={(c) => set({ retail: c })} />
          </>
        ) : (
          <PriceCell label="Price" cell={prod.price} onChange={(c) => set({ price: c })} />
        )}
        {!isPair && (
          <div className="flex flex-col gap-0.5">
            <span className="uppercase tracking-wide" style={{ color: GREY, ...fs(0.6) }}>Waste %</span>
            <NumField value={prod.waste_pct} onChange={(v) => set({ waste_pct: v === null ? null : Number(v) })} suffix="%" />
          </div>
        )}
      </div>

      {/* conditional attribute editors (§4.1 tile · §6 glass · §7 deck/coping) */}
      {(has("tile") || has("glass") || has("deck") || has("coping")) && (
        <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-neutral-100">
          {has("tile") && (
            <label className="flex items-center gap-1.5">
              <span className="text-neutral-500" style={fs(0.7)}>LF / sq ft</span>
              <NumField value={prod.lf_per_sqft} onChange={(v) => set({ lf_per_sqft: v === null ? null : Number(v) })} />
            </label>
          )}
          {has("glass") && (
            <Toggle on={prod.contains_glass} onChange={(v) => set({ contains_glass: v })} label="Contains glass (fires acid-wash §6)" />
          )}
          {has("deck") && (
            <>
              <label className="flex items-center gap-1.5">
                <span className="text-neutral-500" style={fs(0.7)}>Thickness</span>
                <NumField value={prod.thickness_in} onChange={(v) => set({ thickness_in: v === null ? null : Number(v) })} suffix="in" />
              </label>
              <Toggle on={prod.requires_beam_raise} onChange={(v) => set({ requires_beam_raise: v })} label="Requires beam raise (§7)" />
            </>
          )}
          {has("coping") && (
            <>
              <label className="flex items-center gap-1.5">
                <span className="text-neutral-500" style={fs(0.7)}>Depth</span>
                <NumField value={prod.depth_in} onChange={(v) => set({ depth_in: v === null ? null : Number(v) })} suffix="in" />
              </label>
              <label className="flex items-center gap-1.5">
                <span className="text-neutral-500" style={fs(0.7)}>Overhang</span>
                <NumField value={prod.overhang_in} onChange={(v) => set({ overhang_in: v === null ? null : Number(v) })} suffix="in" />
              </label>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 mt-2">
        <Toggle on={prod.band_override} onChange={(v) => set({ band_override: v })} label="Band override" />
        <Toggle on={prod.tax_flag} onChange={(v) => set({ tax_flag: v })} label="Taxable (itemized)" />
        <Toggle on={prod.discontinued} onChange={(v) => set({ discontinued: v })} label="Discontinued" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Band header (navy sub-band bar). Mode + definition + the relevant ceiling/%.
export function BandHeader({ band, onChange }) {
  const set = (partial) => onChange(partial);
  return (
    <div className="px-3 py-2.5" style={{ background: NAVY }}>
      <div className="flex items-center gap-2 mb-2">
        <input value={band.name} onChange={(e) => set({ name: e.target.value })}
          className="flex-1 bg-transparent text-white font-medium outline-none border-b border-white/20 pb-0.5"
          style={fs(0.9)} placeholder="Band name" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SmallSelect value={band.mode} onChange={(v) => set({ mode: v })}
          options={[{ v: "allowance", label: "Allowance" }, { v: "cost_plus", label: "Cost-plus" }]} />
        <SmallSelect value={band.definition} onChange={(v) => set({ definition: v })}
          options={[{ v: "sku_list", label: "SKU list" }, { v: "supplier_rule", label: "Supplier rule" }]} />
        {band.mode === "allowance" ? (
          <PriceCell label="Ceiling" cell={band.allowance_ceiling} onChange={(c) => set({ allowance_ceiling: c })} />
        ) : (
          <PriceCell label="Markup" prefix="" suffix="%" cell={band.markup_pct} onChange={(c) => set({ markup_pct: c })} />
        )}
      </div>
      {band.definition === "supplier_rule" && (
        <div className="flex flex-wrap items-end gap-2 mt-2">
          <input value={band.supplier_rule.supplier} onChange={(e) => set({ supplier_rule: { ...band.supplier_rule, supplier: e.target.value } })}
            placeholder="Supplier" className="rounded border border-white/25 bg-white/10 text-white px-2" style={{ height: 30, ...fs(0.75) }} />
          <input value={band.supplier_rule.url} onChange={(e) => set({ supplier_rule: { ...band.supplier_rule, url: e.target.value } })}
            placeholder="Product link (satisfies photo)" className="flex-1 rounded border border-white/25 bg-white/10 text-white px-2" style={{ height: 30, ...fs(0.75) }} />
          <PriceCell label="Price ceiling" cell={band.supplier_rule.price_ceiling}
            onChange={(c) => set({ supplier_rule: { ...band.supplier_rule, price_ceiling: c } })} />
        </div>
      )}
    </div>
  );
}

export function SmallSelect({ value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-md border px-1.5 bg-white text-black"
      style={{ height: 30, borderColor: "rgba(255,255,255,0.4)", ...fs(0.72) }}>
      {options.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
    </select>
  );
}

export function AddRow({ label, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full text-center text-neutral-500 hover:text-neutral-700"
      style={{ borderTop: "1px dashed #cfcfcf", padding: "9px 0", ...fs(0.78) }}>
      + {label}
    </button>
  );
}

function unitShort(u) {
  return ({ lf: "LF", sqft: "sq ft", each: "ea", hour: "hr", flat: "flat", cuyd: "cu yd", bag: "bag" })[u] || u;
}
