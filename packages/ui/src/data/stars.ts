// Background starfield + constellations. Deterministic — same seed produces
// same layout on every render so the sky doesn't jump on hot-reload.
//
// Coordinates are in SVG viewBox space (0..1600 × 0..500), matching the
// CommunityMap viewBox so the sky covers the whole footer width.

export interface Star {
  x: number;
  y: number;
  size: number;
  twinkle: boolean;
  phase: number;
}

export interface ConstellationStar {
  x: number;
  y: number;
  size: number;
}

export interface ConstellationLine {
  from: number; // index into stars[]
  to: number;
}

export interface Constellation {
  name: string;
  stars: ConstellationStar[];
  lines: ConstellationLine[];
}

const SVG_W = 1600;
const SVG_H = 500;

// ── Mulberry32 PRNG ──
function rng(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r = rng(42);

// 220 background stars across the full 1600×500 canvas (~1 per 3.6k px²).
export const STARS: Star[] = Array.from({ length: 220 }, () => ({
  x: r() * SVG_W,
  y: r() * SVG_H,
  size: 0.6 + r() * 1.8,
  twinkle: r() < 0.4,
  phase: r() * 4,
}));

// ── Constellations ──
// Spread across the full canvas: NW (Big Dipper), N-centre (Cygnus),
// NE (Cassiopeia), E (Pegasus), and S-centre (Orion).

export const CONSTELLATIONS: Constellation[] = [
  // Big Dipper / Großer Wagen — north-west
  {
    name: 'Big Dipper',
    stars: [
      { x: 140, y: 65, size: 1.7 }, // 0 Dubhe
      { x: 145, y: 95, size: 1.5 }, // 1 Merak
      { x: 172, y: 100, size: 1.4 }, // 2 Phecda
      { x: 175, y: 70, size: 1.4 }, // 3 Megrez
      { x: 205, y: 65, size: 1.6 }, // 4 Alioth
      { x: 236, y: 60, size: 1.7 }, // 5 Mizar
      { x: 264, y: 70, size: 1.5 }, // 6 Alkaid
    ],
    lines: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 0 },
      { from: 3, to: 4 },
      { from: 4, to: 5 },
      { from: 5, to: 6 },
    ],
  },
  // Cygnus / Schwan (Northern Cross) — centre-top
  {
    name: 'Cygnus',
    stars: [
      { x: 700, y: 35, size: 1.7 }, // 0 Deneb (top)
      { x: 700, y: 70, size: 1.6 }, // 1 Sadr (centre)
      { x: 700, y: 105, size: 1.4 }, // 2 Albireo (bottom)
      { x: 670, y: 70, size: 1.4 }, // 3 Gienah (left arm)
      { x: 732, y: 70, size: 1.5 }, // 4 δ Cygni (right arm)
    ],
    lines: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 3, to: 1 },
      { from: 1, to: 4 },
    ],
  },
  // Cassiopeia (W shape) — north-east
  {
    name: 'Cassiopeia',
    stars: [
      { x: 1125, y: 60, size: 1.6 },
      { x: 1152, y: 92, size: 1.4 },
      { x: 1180, y: 70, size: 1.8 },
      { x: 1208, y: 108, size: 1.5 },
      { x: 1238, y: 86, size: 1.4 },
    ],
    lines: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
    ],
  },
  // Pegasus — far east, the great square
  {
    name: 'Pegasus',
    stars: [
      { x: 1390, y: 170, size: 1.6 }, // 0 Scheat
      { x: 1480, y: 170, size: 1.7 }, // 1 Alpheratz
      { x: 1480, y: 245, size: 1.6 }, // 2 Algenib
      { x: 1390, y: 245, size: 1.5 }, // 3 Markab
    ],
    lines: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 0 },
    ],
  },
  // Orion — south-centre
  {
    name: 'Orion',
    stars: [
      { x: 820, y: 320, size: 1.8 }, // 0 Betelgeuse (top-left shoulder)
      { x: 760, y: 315, size: 1.5 }, // 1 Bellatrix (top-right shoulder)
      { x: 805, y: 365, size: 1.5 }, // 2 Alnitak (belt left)
      { x: 788, y: 360, size: 1.6 }, // 3 Alnilam (belt centre)
      { x: 772, y: 355, size: 1.5 }, // 4 Mintaka (belt right)
      { x: 820, y: 410, size: 1.4 }, // 5 Saiph (bottom-left foot)
      { x: 760, y: 415, size: 1.8 }, // 6 Rigel (bottom-right foot)
    ],
    lines: [
      { from: 0, to: 1 },
      { from: 0, to: 2 },
      { from: 1, to: 4 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
      { from: 2, to: 5 },
      { from: 4, to: 6 },
    ],
  },
];

// ── Backward-compat exports (older imports) ──
const CASS = CONSTELLATIONS[2];
export const CASSIOPEIA_STARS = CASS.stars;
export const CASSIOPEIA_LINES = CASS.lines.map((l) => ({
  x1: CASS.stars[l.from].x,
  y1: CASS.stars[l.from].y,
  x2: CASS.stars[l.to].x,
  y2: CASS.stars[l.to].y,
}));
