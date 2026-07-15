// Contractor Rate Card + Materials Catalog — Phase 4 §3.
// One long scrollable page, no tabs. Three-level hierarchy: orange category bar
// → navy sub-band header (LABOR / a MATERIALS band) → alternating rows. The card
// is a DATA STORE, fully visible, what-you-see-is-what's-stored (§1). It ships
// entirely hollow (no-seed, §1b); amber cells are the only fill-me signal.
//
// This page builds the card + settings block only. The pricing engine (§15)
// waits for the Phase 3 v7 measure fields (§16/§20) and is NOT wired here.
//
// TODO (near-term, not a rebuild): the fill-it-out-once onboarding session likely
// happens on a laptop — add a responsive wide/tabular view at desktop widths that
// keeps this same data model but lays labor Install/R&R and material rows out as
// true columns instead of the mobile two-cell idiom.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Screen, BackHeader, ORANGE, NAVY, GREEN } from "../ui";
import { emptyCard, mergeCard, labor, product, band, uid } from "./schema";
import {
  PriceCell, Toggle, LaborRow, ProductRow, BandHeader, AddRow,
} from "./components";

const fs = (m) => ({ fontSize: `calc(var(--ms,1rem)*${m})` });

export default function RateCard() {
  const navigate = useNavigate();
  const [card, setCard] = useState(null);
  const [view, setView] = useState("all"); // all | labor | materials (§3 view filter)
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        setCard(emptyCard());
        return;
      }
      const { data } = await supabase
        .from("contractor_rate_card")
        .select("*")
        .eq("contractor_id", userData.user.id)
        .maybeSingle();
      // Reconcile any stored card against the current skeleton (§ new rows/fields
      // appear without a migration); settings ride on the same row.
      const merged = mergeCard(data?.card ? { ...data.card, settings: data.settings } : null);
      setCard(merged);
    })();
  }, []);

  // Deep patches via clone-then-mutate keep the nested card readable.
  const patch = (fn) => {
    setSaved(false);
    setCard((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  };
  const findCat = (next, key) => (key === "concrete" ? next.concrete : next.categories.find((c) => c.key === key));

  const setLabor = (catKey, id, p) => patch((n) => { Object.assign(findCat(n, catKey).labor.find((l) => l.id === id), p); });
  const setBand = (catKey, bid, p) => patch((n) => { Object.assign(findCat(n, catKey).bands.find((b) => b.id === bid), p); });
  const setProduct = (catKey, bid, pid, p) => patch((n) => {
    Object.assign(findCat(n, catKey).bands.find((b) => b.id === bid).products.find((x) => x.id === pid), p);
  });
  const addLabor = (catKey) => patch((n) => findCat(n, catKey).labor.push(labor(uid("labor"), "")));
  const addProduct = (catKey, bid) => patch((n) => findCat(n, catKey).bands.find((b) => b.id === bid).products.push(product({})));
  const addBand = (catKey) => patch((n) => findCat(n, catKey).bands.push(band("New band")));
  const addCategory = () => patch((n) => n.categories.push({ key: uid("cat"), name: "New category", note: "", labor: [], bands: [band("New band")] }));
  const patchSettings = (fn) => patch((n) => fn(n.settings));

  async function save() {
    // §2.1 — itemized posture requires tax registration; block the save.
    if (card.settings.invoicing_posture === "itemized" && !card.settings.tax_registered) {
      alert("Itemized posture requires tax registration. Turn on “Tax registered” or switch to lump sum (§2.1).");
      return;
    }
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("not signed in");
      const { settings, ...rest } = card;
      const { error } = await supabase.from("contractor_rate_card").upsert({
        contractor_id: userData.user.id,
        card: rest,
        settings,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setSaved(true);
    } catch (e) {
      console.error(e);
      alert("Save failed — check connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  // Count of hollow price cells across the whole card — the "fill me" progress.
  const hollowCount = useMemo(() => (card ? countHollow(card) : 0), [card]);

  if (!card) {
    return (
      <Screen>
        <div style={{ "--ms": "1rem" }}>
          <BackHeader label="Rate card" onBack={() => navigate("/rep")} />
        </div>
      </Screen>
    );
  }

  const showLabor = view !== "materials";
  const showMaterials = view !== "labor";

  const renderCategory = (cat, isConcrete = false) => (
    <div key={cat.key} className="mb-4">
      {/* orange category bar (level 1) */}
      <div className="rounded-t-xl px-3 py-2.5" style={{ background: ORANGE }}>
        <div className="text-white font-semibold uppercase tracking-wide" style={fs(0.92)}>{cat.name}</div>
        {cat.note && <div className="text-white/85 mt-0.5" style={fs(0.66)}>{cat.note}</div>}
      </div>

      <div className="bg-white rounded-b-xl overflow-hidden">
        {/* LABOR block */}
        {showLabor && cat.labor.length > 0 && (
          <>
            <SubBar>Labor · Install / Remove &amp; Replace</SubBar>
            {cat.labor.map((l, i) => (
              <LaborRow key={l.id} line={l} idx={i} onChange={(p) => setLabor(cat.key, l.id, p)} />
            ))}
            <AddRow label="Add labor line" onClick={() => addLabor(cat.key)} />
          </>
        )}
        {showLabor && cat.labor.length === 0 && !isConcrete && (
          <div className="px-3 py-2 text-neutral-400" style={{ background: "#fff", ...fs(0.7) }}>
            No labor rows — labor is embedded in the installed price here (§12).
          </div>
        )}

        {/* MATERIALS blocks — one navy header per band (§3) */}
        {showMaterials && cat.bands.map((b) => (
          <div key={b.id}>
            <BandHeader band={b} onChange={(p) => setBand(cat.key, b.id, p)} />
            {b.products.map((pr, i) => (
              <ProductRow key={pr.id} prod={pr} idx={i} fields={b.fields}
                onChange={(p) => setProduct(cat.key, b.id, pr.id, p)} />
            ))}
            <AddRow label="Add product" onClick={() => addProduct(cat.key, b.id)} />
          </div>
        ))}
        {showMaterials && (
          <AddRow label="Add materials band" onClick={() => addBand(cat.key)} />
        )}
      </div>
    </div>
  );

  return (
    <Screen>
      <div style={{ "--ms": "1rem", "--rc-cell": "5.5rem" }}>
        <BackHeader label="Rate card & materials catalog" onBack={() => navigate("/rep")} />

        {/* No-seed banner (§1b) */}
        <div className="rounded-xl px-4 py-3 mb-3"
          style={{ background: "rgba(255,255,255,0.08)", border: "0.5px solid rgba(255,255,255,0.2)" }}>
          <div className="text-white/90" style={fs(0.8)}>
            Every price ships blank. Fill it out once and you never sit at a desk
            with a calculator again.
          </div>
          <div className="mt-1" style={{ color: "#f0b968", ...fs(0.72) }}>
            {hollowCount} price {hollowCount === 1 ? "field" : "fields"} still to set — amber cells.
          </div>
        </div>

        {/* View filter (§3) */}
        <div className="flex gap-1.5 mb-3">
          {[
            { v: "all", label: "Show all" },
            { v: "labor", label: "Labor only" },
            { v: "materials", label: "Materials only" },
          ].map((o) => (
            <button key={o.v} onClick={() => setView(o.v)}
              className="flex-1 rounded-lg py-2 font-medium"
              style={view === o.v
                ? { background: "#fff", color: NAVY, ...fs(0.78) }
                : { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", ...fs(0.78) }}>
              {o.label}
            </button>
          ))}
        </div>

        <SettingsBlock s={card.settings} patch={patchSettings} />

        {/* Categories (§3 order), then the shared concrete block (§9) */}
        <div className="mt-4">
          {card.categories.map((c) => renderCategory(c))}
          {renderCategory(card.concrete, true)}
          <AddRow label="Add category" onClick={addCategory} />
        </div>

        <button onClick={save} disabled={busy}
          className="w-full rounded-xl text-white font-medium mt-4 disabled:opacity-50"
          style={{ background: GREEN, padding: "14px 0", ...fs(1) }}>
          {busy ? "Saving…" : saved ? "Saved ✓" : "Save rate card"}
        </button>
        <div className="text-center text-white/35 mt-2 mb-6" style={fs(0.7)}>
          The card stores. The engine (Phase 3 v7 pending) decides. The posture projects.
        </div>
      </div>
    </Screen>
  );
}

function SubBar({ children }) {
  return (
    <div className="px-3 py-2 text-white uppercase tracking-widest" style={{ background: NAVY, ...fs(0.68) }}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contractor settings block (§2). Projections & pricing functions; none changes
// what the card stores. Rendered above the card, contractor-level.
function SettingsBlock({ s, patch }) {
  const setField = (k, v) => patch((st) => { st[k] = v; });
  const setCell = (k, cell) => patch((st) => { st[k] = cell; });
  const itemizedBlocked = s.invoicing_posture === "itemized" && !s.tax_registered;

  return (
    <div className="bg-white rounded-xl overflow-hidden">
      <div className="px-3 py-2.5" style={{ background: ORANGE }}>
        <div className="text-white font-semibold uppercase tracking-wide" style={fs(0.92)}>Contractor settings</div>
        <div className="text-white/85 mt-0.5" style={fs(0.66)}>Projections &amp; pricing functions — none of these change what the card stores (§2).</div>
      </div>
      <div className="p-3 flex flex-col gap-3.5">
        {/* §2.1 invoicing posture */}
        <Field label="Invoicing posture (§2.1)">
          <SmallSelectLight value={s.invoicing_posture} onChange={(v) => setField("invoicing_posture", v)}
            options={[{ v: "lump_sum", label: "Lump sum" }, { v: "itemized", label: "Itemized" }]} />
          <Toggle on={s.tax_registered} onChange={(v) => setField("tax_registered", v)} label="Tax registered" />
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500" style={fs(0.72)}>Tax rate</span>
            <PriceCell prefix="" suffix="%" cell={s.tax_rate} onChange={(c) => setCell("tax_rate", c)} />
          </div>
        </Field>
        {itemizedBlocked && (
          <div className="rounded-lg px-3 py-2" style={{ background: "#fdeaea", color: "#a12626", ...fs(0.72) }}>
            Itemized posture requires tax registration — save is blocked until Tax registered is on (§2.1).
          </div>
        )}

        {/* §2.2 allowance tax basis */}
        <Field label="Allowance tax basis (§2.2)">
          <Toggle on={s.allowance_tax_on_allowance} onChange={(v) => setField("allowance_tax_on_allowance", v)}
            label="Tax allowance lines at the allowance price" />
        </Field>

        {/* §2.3 measure fee — three-way handling */}
        <Field label="Measure fee (§2.3)">
          <SmallSelectLight value={s.measure_fee_mode} onChange={(v) => setField("measure_fee_mode", v)}
            options={[{ v: "flat", label: "Flat $" }, { v: "percent", label: "% of total" }]} />
          {s.measure_fee_mode === "flat" ? (
            <PriceCell cell={s.measure_fee} onChange={(c) => setCell("measure_fee", c)} />
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <PriceCell prefix="" suffix="%" cell={s.measure_fee_pct} onChange={(c) => setCell("measure_fee_pct", c)} label="Rate" />
              <PriceCell cell={s.measure_fee_floor} onChange={(c) => setCell("measure_fee_floor", c)} label="Floor" />
              <PriceCell cell={s.measure_fee_cap} onChange={(c) => setCell("measure_fee_cap", c)} label="Cap" />
            </div>
          )}
        </Field>
        <div className="flex flex-col gap-2 -mt-1.5 pl-1">
          <SmallSelectLight value={s.measure_fee_handling} onChange={(v) => setField("measure_fee_handling", v)}
            options={[
              { v: "line_item", label: "Line item — own row under your label" },
              { v: "absorbed", label: "Absorbed — customer never sees it (takeoff still shows it)" },
              { v: "buried", label: "Buried — spread across labor lines" },
            ]} />
          {s.measure_fee_handling === "line_item" && (
            <input value={s.measure_fee_label} onChange={(e) => setField("measure_fee_label", e.target.value)}
              placeholder='Label (e.g. "Project management & administration")'
              className="rounded-md border border-neutral-300 bg-white text-black px-2" style={{ height: 32, ...fs(0.78) }} />
          )}
        </div>

        {/* §2.4 minimum pool floor */}
        <Field label="Minimum pool floor (§2.4) — bills only, pool-derived quantities only">
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500" style={fs(0.72)}>IA floor</span>
            <PriceCell prefix="" suffix="sq ft" cell={s.min_pool.IA_floor}
              onChange={(c) => patch((st) => { st.min_pool.IA_floor = c; })} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500" style={fs(0.72)}>Perimeter floor</span>
            <PriceCell prefix="" suffix="LF" cell={s.min_pool.perimeter_floor_LF}
              onChange={(c) => patch((st) => { st.min_pool.perimeter_floor_LF = c; })} />
          </div>
        </Field>

        {/* §2.5 over-band selection handling */}
        <Field label="Over-band selection handling (§2.5)">
          <SmallSelectLight value={s.over_band_handling} onChange={(v) => setField("over_band_handling", v)}
            options={[
              { v: "hold_for_review", label: "Hold for review (default)" },
              { v: "absorb", label: "Absorb the difference" },
              { v: "auto_change_order", label: "Auto change order" },
            ]} />
        </Field>

        {/* §2.7 default markup */}
        <Field label="Default per-line markup (§2.7)">
          <PriceCell prefix="" suffix="%" cell={s.default_markup_pct} onChange={(c) => setCell("default_markup_pct", c)} />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-neutral-400 uppercase tracking-wide mb-1.5" style={fs(0.64)}>{label}</div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function SmallSelectLight({ value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-neutral-300 bg-white text-black px-2" style={{ height: 32, ...fs(0.78) }}>
      {options.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
    </select>
  );
}

// Walk every price cell in the card and count the hollow ones (price_set=false).
function countHollow(card) {
  let n = 0;
  const cell = (c) => { if (c && typeof c === "object" && "price_set" in c && !c.price_set) n += 1; };
  const walk = (o) => {
    if (!o || typeof o !== "object") return;
    if ("price_set" in o) { cell(o); return; }
    for (const v of Object.values(o)) walk(v);
  };
  walk(card.categories);
  walk(card.concrete);
  walk(card.settings);
  return n;
}
