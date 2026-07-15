// Rate Card data model — Phase 4 §1/§19.
// "The card stores, the engine decides, the posture projects." This file is the
// STORE: the complete skeleton every contractor's card ships with, plus the
// projection/pricing-function settings block (§2). It carries NO prices — every
// money field ships $0.00 / price_set=false per the no-seed rule (§1b). It also
// carries every field §19 names, including the ones this page doesn't surface
// yet (billed/order qty pair, assigned_sub, trade tag) — cheap now, a migration
// later.
//
// Nothing here is a default anybody should read as "typical." Amber styling on
// price_set=false rows is the only fill-me signal (§3).

// ---- price_set primitive (§1a/§1b) ---------------------------------------
// A rate-card $0.00 is ambiguous: deliberate-free vs nobody-entered-it. Every
// price is a cell that remembers which. Ships hollow; a human touch flips it.
export const P = () => ({ value: 0, price_set: false });

// Stable id for skeleton rows (so a load-time merge can reconcile a stored card
// against a newer skeleton). Runtime-added rows use uid().
let _n = 0;
export const uid = (prefix = "row") => {
  _n += 1;
  const rand =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : `${_n}`;
  return `${prefix}_${rand}`;
};

// Card units (§3). Labor stays in the unit the trade thinks in; the engine
// converts (tile LF ↔ sq ft, §5). Materials declare their sold unit.
export const UNITS = [
  { v: "lf", label: "LF" },
  { v: "sqft", label: "sq ft" },
  { v: "each", label: "each" },
  { v: "hour", label: "hour" },
  { v: "flat", label: "flat" },
  { v: "cuyd", label: "cu yd" },
  { v: "bag", label: "bag" },
];

// ---- line factories -------------------------------------------------------

// Labor line. Carries BOTH rate columns always (§1.2): Install and Remove &
// Replace. Category overrides mark one column N/A (grey dash, §1.4) — e.g.
// Interior is always Install (§6), raised beam is Install-only (§7), paver demo
// is R&R-only (§10). Every labor line carries an optional min_charge (§1e).
function labor(id, label, o = {}) {
  return {
    id,
    kind: "labor",
    label,
    unit: o.unit ?? "sqft",
    install: P(), // Install rate  (new-build; Interior always)
    randr: P(), //   Remove & Replace rate (remodels)
    install_na: o.install_na ?? false, // renders grey dash, not amber
    randr_na: o.randr_na ?? false,
    min_charge: P(), // §1e per-line floor: line_total = max(qty×rate, min_charge)
    markup_on: false, // §2.7 — OFF: rate IS client price, stored % kept
    markup_pct: P(),
    note: o.note ?? "", // e.g. "cut time absorbed", "Have→Want picker row"
    // §19 fields stored but NOT surfaced on this page (engine/work-order use):
    billed_qty: null, // §1c — floors here
    order_qty: null, //  §1c — never floors
    manual: false, // §13 manual-line flag (card rows are never manual)
    assigned_sub: null, // §14 sub work-order projection
    trade_tag: o.trade_tag ?? null,
    passthrough: o.passthrough ?? false, // §2.8/§12 water-truck style
    // §20 requires_permit — dormant boolean, NOT surfaced in the UI. Behavior is
    // unratified; the field is cheap now / a migration later, so it ships on the
    // deck / footer / cage labor lines that could need permit tracking.
    ...(o.permit ? { requires_permit: false } : {}),
    // §7 rate-card attrs live on materials, not labor — kept null here.
  };
}

// Material / catalog product. One fat uniform shape (§19: include every field
// even where unused) so a coping product and a finish product are the same
// record; the band's `fields` hint decides which attribute editors surface.
function product(o = {}) {
  return {
    id: o.id ?? uid("prod"),
    kind: "product",
    name: o.name ?? "",
    sku: "", // §4 flows to materials order + cost side
    photo: null, // §4 (satisfied by supplier link for supplier_rule bands, §4.3)
    unit: o.unit ?? "sqft",
    price: P(), // material price / finish upcharge (client-facing basis)
    cost: P(), // §4 true cost under the band (the spread display); Equipment COST
    retail: P(), // Equipment RETAIL / fitting installed-price-is-truth (§12)
    waste_pct: o.waste_pct ?? null, // materials only, never labor (§3); after conversion (§4.1)
    tax_flag: false, // materials only; live only when posture=itemized (§2.1)
    application_type: o.application_type ?? null, // sets unit conversion
    lf_per_sqft: o.lf_per_sqft ?? null, // §4.1 tile geometry (2 / 6 / 1)
    band_override: false, // §4 — a $12.01 tile must not drop out by a penny
    discontinued: false, // §4 — marked, never deleted (old quotes don't break)
    contains_glass: o.glass ?? false, // §6 finishes only; fires the acid-wash rule
    thickness_in: null, // §7 deck material
    requires_beam_raise: false, //   §7 deck material — NEVER inferred from thickness
    depth_in: null, // §7 coping material
    overhang_in: null, //  §7 coping material
    variants: [], // §12 fittings optional variants
  };
}

// A price band — the "French menu" money decision (§4). Products inside cost the
// same; labor is constant across bands. Mode + definition live here (§2.6/§4.3).
function band(name, o = {}) {
  return {
    id: o.id ?? uid("band"),
    kind: "band",
    name,
    mode: o.mode ?? "allowance", // §2.6 allowance | cost_plus
    allowance_ceiling: P(), // "up to $X" (allowance mode)
    markup_pct: P(), // cost-plus header % (§2.7)
    definition: o.definition ?? "sku_list", // §4.3 sku_list | supplier_rule
    supplier_rule: { supplier: "", url: "", price_ceiling: P() },
    fields: o.fields ?? [], // attr editors to surface: glass|deck|coping|tile|equipment|fitting
    products: o.products ?? [],
  };
}

// ---- the category skeleton (§0 build order: labor first, then materials) ---
// Labor rows are named + structural (ship hollow, §1d). Material bands ship as
// containers — ONE starter band per family, empty of products, because band
// ladders are per-contractor and must not be hard-coded (§4.3). Exception:
// Fittings ships its named part rows (§12) since those ARE the structure.

function categories() {
  return [
    // ---------------- Interior (§6) -----------------
    {
      key: "interior",
      name: "Interior",
      note: "Always Install — new finish goes over the old; no tear-out (§6). R&R is N/A here.",
      labor: [
        labor("interior.resurface", "Surface prep & resurface (material incl.)", {
          unit: "sqft",
          randr_na: true, // Interior = always Install (§6)
        }),
        labor("interior.acidwash", "Acid wash / wand / slurry", {
          unit: "sqft",
          randr_na: true,
          note: "Fires automatically when the selected finish contains_glass (§6). Carries its own min_charge.",
        }),
      ],
      // Finishes are an upcharge-per-sq-ft catalog; each finish keeps its own
      // row incl. $0 rows (§6). contains_glass flag lives here (§6), never on tile.
      bands: [band("Finishes", { mode: "allowance", fields: ["glass"] })],
    },

    // ---------------- Waterline Tile (§5) -----------------
    {
      key: "waterline",
      name: "Waterline Tile",
      note: "Pool AND spa waterline. Labor per LF on the card; sq-ft rate is 2× (engine converts, §5).",
      labor: [labor("waterline.install", "Waterline tile install", { unit: "lf" })],
      bands: [
        band("Waterline band", {
          mode: "allowance",
          fields: ["tile"],
          // 6" band: 1 sq ft sheet = two 12×6 strips = 2 LF (§4.1)
          products: [],
        }),
      ],
    },

    // ---------------- Pencil & Trim (§4.1/§4.2/§12) -----------------
    {
      key: "pencil",
      name: "Pencil & Trim",
      note: "Pencil cut time is never its own row — absorbed in the pencil $/LF (§12). Flush cap per piece (§4.2).",
      labor: [
        labor("pencil.install", "Pencil tile install", {
          unit: "lf",
          note: "Cut time absorbed in this rate (§12).",
        }),
        labor("pencil.flushcap", "Flush cap install", {
          unit: "lf",
          note: "Labor basis per-LF vs per-piece unconfirmed → onboarding (§4.2/§20).",
        }),
      ],
      bands: [
        band("Pencil band", { mode: "allowance", fields: ["tile"] }), // ÷6 (§4.1)
        band("Flush cap band", { mode: "allowance", fields: ["tile"] }), // per piece, ×2/LF (§4.2)
      ],
    },

    // ---------------- Area Tile (§5) -----------------
    {
      key: "areatile",
      name: "Area Tile",
      note: "1:1 sq ft. Material per sq ft, labor per sq ft on the card (§5).",
      labor: [labor("areatile.install", "Area tile install", { unit: "sqft" })],
      bands: [band("Area tile band", { mode: "allowance", fields: ["tile"] })],
    },

    // ---------------- Coping — incl. raised beam (§7) -----------------
    {
      key: "coping",
      name: "Coping",
      note: "Spa double-row coping = same rate × doubled LF (no special row). Raised beam is Install-only; concrete prices live from the shared block (§9).",
      labor: [
        labor("coping.coping", "Coping", { unit: "lf" }),
        labor("coping.raisedbeam", "Raised beam", {
          unit: "lf",
          install_na: false,
          randr_na: true, // Install only (§7)
          note: "Beam LF derived from coping run; concrete ordered live from shared block (§7/§9).",
        }),
        labor("coping.sawcut", "Saw-cut / deck cut-back", {
          unit: "lf",
          note: "The Have→Want picker row (§7). Ships hollow.",
        }),
      ],
      // depth_in + overhang_in required on every coping material (§7).
      bands: [band("Coping band", { mode: "allowance", fields: ["coping"] })],
    },

    // ---------------- Deck — incl. new footer (§10) -----------------
    {
      key: "deck",
      name: "Deck",
      note: "Labor constant across bands (§4). thickness_in + requires_beam_raise per deck material; never infer the raise from thickness (§7).",
      labor: [
        labor("deck.install", "Deck install (per band)", { unit: "sqft", permit: true }),
        labor("deck.spray", "Spray deck (all-in)", {
          unit: "sqft",
          permit: true,
          note: "All-in path — load one side, zero the other; quote shows one number (§10). Spray deck must NOT fire the beam raise.",
        }),
        labor("deck.paverdemo", "Paver demo & haul-out", {
          unit: "sqft",
          permit: true,
          install_na: true, // R&R only; fires only when existing deck = pavers (§10)
          note: "R&R only; fires only when existing deck = pavers (§10).",
        }),
        labor("deck.footer", "New footer", {
          unit: "lf",
          permit: true,
          randr_na: true, // Install
          note: "12″×12″ = 1 sq ft cross-section; concrete pumped from shared block (§10).",
        }),
        labor("deck.footerpin", "Footer pin", {
          unit: "each",
          permit: true,
          note: "Rebar into existing footer (§10).",
        }),
      ],
      bands: [band("Deck band", { mode: "allowance", fields: ["deck"] })],
    },

    // ---------------- Cage (§11) -----------------
    {
      key: "cage",
      name: "Cage",
      note: "Priced per sq ft installed (standard). Gutter height (v7) is required to price; a second row lands when a non-standard cage is defined (§11).",
      labor: [labor("cage.install", "Cage install (standard)", { unit: "sqft", permit: true })],
      bands: [band("Cage materials", { mode: "cost_plus", fields: [] })],
    },

    // ---------------- Demo (§12) -----------------
    {
      key: "demo",
      name: "Demo",
      note: "Ships hollow (§12).",
      labor: [labor("demo.demo", "Demo", { unit: "sqft" })],
      bands: [band("Disposal / haul-out", { mode: "cost_plus", fields: [] })],
    },

    // ---------------- Equipment (§12) -----------------
    {
      key: "equipment",
      name: "Equipment",
      note: "COST + RETAIL columns, not markup (§2.7/§12).",
      labor: [labor("equipment.install", "Equipment install", { unit: "each" })],
      // Equipment products expose the cost/retail pair; contractor adds the list.
      bands: [band("Equipment", { mode: "cost_plus", fields: ["equipment"] })],
    },

    // ---------------- Fittings & Replacements (§12) -----------------
    // These named rows ARE the structure (unlike open catalogs) — ship them all,
    // hollow. Installed price is the source of truth; part cost sits underneath;
    // labor is never derived (§12). Lights white/colored are two rows.
    {
      key: "fittings",
      name: "Fittings & Replacements",
      note: "All priced each. Installed price = truth; part cost underneath; labor never derived (§12).",
      labor: [], // labor embedded in the installed price (§12) — no separate labor rows
      bands: [
        band("Fittings & parts", {
          mode: "cost_plus",
          fields: ["fitting"],
          products: [
            product({ name: "Return jets", unit: "each" }),
            product({ name: "Main drain covers", unit: "each" }),
            product({ name: "Vacuum ports", unit: "each" }),
            product({ name: "Skimmer door", unit: "each" }),
            product({ name: "Skimmer cover", unit: "each" }),
            product({ name: "Skimmer replacement", unit: "each" }),
            product({ name: "Light trim rings", unit: "each" }),
            product({ name: "Light — white (installed)", unit: "each" }),
            product({ name: "Light — colored (installed)", unit: "each" }),
            product({ name: "Handrail", unit: "each" }),
            product({ name: "Ladder", unit: "each" }),
            product({ name: "Anchors (kit of 2 — 1 set / rail or ladder)", unit: "each" }),
            product({ name: "Rail / ladder trim", unit: "each" }),
            product({ name: "Skimmer lid extension collar", unit: "each" }), // Cost/Retail (§8)
          ],
        }),
      ],
    },

    // ---------------- Extras (§12) -----------------
    {
      key: "extras",
      name: "Extras",
      note: "Water trucks are a hard-coded pass-through (no markup, no fee spread, customer-adjustable qty). Ships hollow per §1b — flag pass-through, contractor sets the price. Start-up is a $0 handoff flag.",
      labor: [],
      bands: [
        band("Extras", {
          mode: "cost_plus",
          fields: [],
          products: [
            product({ name: "Water truck (5,000 gal) — pass-through", unit: "each" }),
            product({ name: "Leak detection (charge or refer)", unit: "flat" }),
            product({ name: "Start-up — $0 handoff flag", unit: "flat" }),
          ],
        }),
      ],
    },
  ];
}

// ---- shared concrete block (§9) ------------------------------------------
// One block, referenced by raised beam and footer — never duplicated per
// category (two copies drift, §9). The engine prices concrete LIVE from here,
// never frozen into a labor rate. Yields are physical constants, not prices.
function concrete() {
  return {
    key: "concrete",
    name: "Concrete (shared)",
    note: "Referenced by Raised Beam and Footer (§9). Engine must NOT auto-optimize bag vs pump — manual selector per use.",
    labor: [], // concrete is a material block; beam/footer labor lives in its own category
    bands: [
      band("Concrete", {
        mode: "cost_plus",
        fields: [],
        products: [
          product({ name: "Bagged 60 lb", unit: "bag" }), // yield 0.45 cu ft
          product({ name: "Bagged 80 lb", unit: "bag" }), // yield 0.60 cu ft
          product({ name: "Pumped ready-mix", unit: "cuyd" }),
          product({ name: "Pump charge", unit: "flat" }), // per job or per pour — CONFIRM (§9/§20)
        ],
      }),
    ],
  };
}

// ---- contractor settings block (§2) --------------------------------------
// Projections & pricing functions. None of these change what the card stores.
function settings() {
  return {
    // §2.1 invoicing posture
    invoicing_posture: "lump_sum", // lump_sum | itemized (itemized requires tax_registered)
    tax_registered: false, //          itemized blocked-save until true
    tax_rate: P(), //                   % — FL county rates vary
    // §2.2 allowance tax basis
    allowance_tax_on_allowance: true, // taxable basis = allowance price (default ON)
    // §2.3 measure fee — three-way handling
    measure_fee_mode: "flat", // flat | percent
    measure_fee: P(), //         $ (script default 1,500 — NOT seeded here per §1b)
    measure_fee_pct: P(), //     % with clamp(rate × pre-fee total, floor, cap)
    measure_fee_floor: P(),
    measure_fee_cap: P(),
    measure_fee_handling: "line_item", // line_item | absorbed | buried
    measure_fee_label: "", //            free text used by line_item
    // §2.4 minimum pool floor — billed only, pool-derived quantities only (§1c)
    min_pool: { IA_floor: P(), perimeter_floor_LF: P() },
    // §2.5 over-band selection handling
    over_band_handling: "hold_for_review", // absorb | auto_change_order | hold_for_review (default)
    // §2.7 per-line markup master controls
    default_markup_pct: P(),
  };
}

// ---- assembled empty card -------------------------------------------------
export function emptyCard() {
  return {
    schema_version: 4,
    categories: categories(),
    concrete: concrete(),
    settings: settings(),
  };
}

// ---- load-time merge ------------------------------------------------------
// Reconcile a stored card against the current skeleton so new skeleton rows /
// fields appear on an old saved card without a migration (mirrors the fittings
// deep-merge in MeasureFlow). Stored values win; skeleton fills gaps by id.
export function mergeCard(saved) {
  const base = emptyCard();
  if (!saved || typeof saved !== "object") return base;

  const mergeLines = (baseLines, savedLines) => {
    const byId = new Map((savedLines || []).map((l) => [l.id, l]));
    // skeleton rows first (reconciled), then any runtime-added rows not in skeleton
    const skeletonIds = new Set(baseLines.map((l) => l.id));
    const merged = baseLines.map((bl) => ({ ...bl, ...(byId.get(bl.id) || {}) }));
    for (const sl of savedLines || []) {
      if (!skeletonIds.has(sl.id)) merged.push(sl);
    }
    return merged;
  };

  const mergeBands = (baseBands, savedBands) => {
    const byId = new Map((savedBands || []).map((b) => [b.id, b]));
    const skeletonIds = new Set(baseBands.map((b) => b.id));
    const merged = baseBands.map((bb) => {
      const sb = byId.get(bb.id);
      if (!sb) return bb;
      return {
        ...bb,
        ...sb,
        supplier_rule: { ...bb.supplier_rule, ...(sb.supplier_rule || {}) },
        // products are contractor-owned; keep stored list, but keep skeleton
        // products (named rows like fittings) reconciled by id.
        products: mergeProducts(bb.products, sb.products),
      };
    });
    for (const sb of savedBands || []) {
      if (!skeletonIds.has(sb.id)) merged.push(sb);
    }
    return merged;
  };

  const mergeProducts = (baseProds, savedProds) => {
    if (!savedProds) return baseProds;
    const byId = new Map(savedProds.map((p) => [p.id, p]));
    const skeletonIds = new Set(baseProds.map((p) => p.id));
    const merged = baseProds.map((bp) => ({ ...bp, ...(byId.get(bp.id) || {}) }));
    for (const sp of savedProds) {
      if (!skeletonIds.has(sp.id)) merged.push(sp);
    }
    return merged;
  };

  const savedCats = new Map((saved.categories || []).map((c) => [c.key, c]));
  const categoriesMerged = base.categories.map((bc) => {
    const sc = savedCats.get(bc.key);
    if (!sc) return bc;
    return {
      ...bc,
      labor: mergeLines(bc.labor, sc.labor),
      bands: mergeBands(bc.bands, sc.bands),
    };
  });
  // categories the contractor added beyond the skeleton (§3 add-category)
  const skeletonCatKeys = new Set(base.categories.map((c) => c.key));
  for (const sc of saved.categories || []) {
    if (!skeletonCatKeys.has(sc.key)) categoriesMerged.push(sc);
  }

  return {
    schema_version: 4,
    categories: categoriesMerged,
    concrete: {
      ...base.concrete,
      bands: mergeBands(base.concrete.bands, saved.concrete?.bands),
    },
    settings: {
      ...base.settings,
      ...(saved.settings || {}),
      tax_rate: { ...base.settings.tax_rate, ...(saved.settings?.tax_rate || {}) },
      measure_fee: { ...base.settings.measure_fee, ...(saved.settings?.measure_fee || {}) },
      min_pool: { ...base.settings.min_pool, ...(saved.settings?.min_pool || {}) },
    },
  };
}

// Factories exported for the page's add-line / add-band / add-category actions.
export { labor, product, band };
