// Measurement math + dual-unit helpers for the field measure tool.
// Canonical unit everywhere internally: DECIMAL FEET.

// A dimension is entered as { ft, in } where either box may be blank.
// 43 ft 7 in  -> { ft: 43, in: 7 }   -> 43.5833 ft
// 121 in      -> { ft: "", in: 121 } -> 10.0833 ft
export function toFeet(dim) {
  if (!dim) return 0;
  const ft = parseFloat(dim.ft) || 0;
  const inches = parseFloat(dim.in) || 0;
  return ft + inches / 12;
}

export function feetLabel(dim) {
  const ft = parseFloat(dim?.ft) || 0;
  const inches = parseFloat(dim?.in) || 0;
  if (ft && inches) return `${ft} ft ${inches} in`;
  if (ft) return `${ft} ft`;
  if (inches) return `${inches} in`;
  return "—";
}

// --- Shape areas (all inputs are {ft,in} dimensions) ---
export function rectangleArea(len, wid) {
  return toFeet(len) * toFeet(wid);
}

export function triangleArea(a, b, c) {
  const A = toFeet(a), B = toFeet(b), C = toFeet(c);
  const s = (A + B + C) / 2;
  const val = s * (s - A) * (s - B) * (s - C);
  return val > 0 ? Math.sqrt(val) : 0; // guards impossible triangles
}

export function semicircleArea(diameter) {
  const d = toFeet(diameter);
  return (Math.PI * (d / 2) ** 2) / 2;
}

export function trapezoidArea(b1, b2, h) {
  return 0.5 * (toFeet(b1) + toFeet(b2)) * toFeet(h);
}

// Signed area for a saved shape-builder section
export function sectionArea(section) {
  let raw = 0;
  switch (section.shape) {
    case "rectangle":
      raw = rectangleArea(section.dims.len, section.dims.wid);
      break;
    case "triangle":
      raw = triangleArea(section.dims.a, section.dims.b, section.dims.c);
      break;
    case "semicircle":
      raw = semicircleArea(section.dims.diameter);
      break;
    case "trapezoid":
      raw = trapezoidArea(section.dims.b1, section.dims.b2, section.dims.h);
      break;
    default:
      raw = 0;
  }
  return section.op === "subtract" ? -raw : raw;
}

export function sectionsTotal(sections) {
  return (sections ?? []).reduce((sum, s) => sum + sectionArea(s), 0);
}

// Human-readable dimension summary for a saved section tile
export function sectionDimLabel(section) {
  const d = section.dims ?? {};
  switch (section.shape) {
    case "rectangle":
      return `${feetLabel(d.len)} × ${feetLabel(d.wid)}`;
    case "triangle":
      return `${feetLabel(d.a)}, ${feetLabel(d.b)}, ${feetLabel(d.c)}`;
    case "semicircle":
      return `⌀ ${feetLabel(d.diameter)}`;
    case "trapezoid":
      return `${feetLabel(d.b1)}, ${feetLabel(d.b2)} · h ${feetLabel(d.h)}`;
    default:
      return "";
  }
}

// Average depth from 2 or 3 point measurements ({ft,in} each)
export function averageDepth(points) {
  const vals = (points ?? []).map(toFeet).filter((v) => v > 0);
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// Interior area = floor area + wall area; wall area = perimeter × avg depth
export function interiorArea(floorArea, perimeterFt, avgDepthFt) {
  return floorArea + perimeterFt * avgDepthFt;
}

export const SHAPE_META = {
  rectangle: { label: "Rectangle", fields: [["len", "Length"], ["wid", "Width"]] },
  triangle: {
    label: "Triangle",
    fields: [["a", "Side A"], ["b", "Side B"], ["c", "Side C"]],
  },
  semicircle: { label: "Semicircle", fields: [["diameter", "Diameter"]] },
  trapezoid: {
    label: "Trapezoid",
    fields: [["b1", "Base 1"], ["b2", "Base 2"], ["h", "Height"]],
  },
};

export function round1(n) {
  return Math.round(n * 10) / 10;
}

// Total pool water volume in gallons, from measured floor area + depth and
// (optional) spa area + depth. 7.48 gallons per cubic foot.
export function poolGallons(floorArea, avgDepthFt, spaAreaFt2 = 0, spaDepthFt = 0) {
  return (floorArea * avgDepthFt + spaAreaFt2 * spaDepthFt) * 7.48;
}

// Trucks needed for a full fill (decimal kept — the decimal is the sell).
export function trucksForFill(gallons, truckGal = 5000) {
  return gallons / truckGal;
}
