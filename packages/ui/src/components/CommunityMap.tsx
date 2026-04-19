'use client';

import { useEffect, useRef, useState } from 'react';
import { LOCATIONS } from '../data/locations';
import { COUNTRIES, NEIGHBOURS, FAR_NEIGHBOURS } from '../data/countries';
import { STARS, CONSTELLATIONS } from '../data/stars';
import type { StoredLocation } from '../lib/sunset-location';

interface Shooting {
  key: number;
  startX: number;
  startY: number;
  angleDeg: number;
  dist: number;
}

interface CommunityMapProps {
  current: StoredLocation;
  onPick: (loc: { lat: number; lng: number; name: string; slug?: string }) => void;
}

// BBOX symmetrically extended west (mid-Atlantic) and east (Belarus/Ukraine).
// The viewBox aspect (≈3.2:1) now matches a typical footer aspect so the map
// fills the footer width with no empty side bands, while DE/AT/CH stay at
// the SAME pixel size and SAME viewport position they had before — the new
// SVG_W and BBOX were chosen specifically to preserve the per-degree scale
// (≈45.5 px/° at this latitude band).
const BBOX = { minLng: -23.0, maxLng: 32.0, minLat: 45.0, maxLat: 56.0 };
const SVG_W = 1600;
const SVG_H = 500;

function isInBBox(lat: number, lng: number): boolean {
  return lat >= BBOX.minLat && lat <= BBOX.maxLat && lng >= BBOX.minLng && lng <= BBOX.maxLng;
}

// At ~50°N, 1° lng covers ~64% the km of 1° lat. Compress longitude visually
// by this factor so countries are not horizontally stretched.
const MID_LAT_DEG = (BBOX.minLat + BBOX.maxLat) / 2;
const COS_MID_LAT = Math.cos((MID_LAT_DEG * Math.PI) / 180);

// Countries with significant German-speaking populations (besides DE/AT/CH).
// Rendered at 70% of primary strength — visible but secondary.
const GERMAN_SPEAKING: ReadonlySet<string> = new Set(['LI', 'LU', 'BE', 'IT', 'FR']);

// Capitals — one per country visible in BBOX. Always labelled. Click sets
// the sunset-widget location, same as a congregation pin. Wien is excluded
// because it's already a congregation in LOCATIONS.
interface City {
  name: string;
  lat: number;
  lng: number;
}

const MAJOR_CITIES: City[] = [
  { name: 'Berlin', lat: 52.52, lng: 13.405 }, // DE
  { name: 'Bern', lat: 46.948, lng: 7.4474 }, // CH
  { name: 'Vaduz', lat: 47.141, lng: 9.5209 }, // LI
  { name: 'Luxembourg', lat: 49.6116, lng: 6.1319 }, // LU
  { name: 'Brussels', lat: 50.8503, lng: 4.3517 }, // BE
  { name: 'Amsterdam', lat: 52.3676, lng: 4.9041 }, // NL
  { name: 'Paris', lat: 48.8566, lng: 2.3522 }, // FR
  { name: 'Praha', lat: 50.0755, lng: 14.4378 }, // CZ
  { name: 'Warszawa', lat: 52.2297, lng: 21.0122 }, // PL
  { name: 'Budapest', lat: 47.4979, lng: 19.0402 }, // HU
  { name: 'Bratislava', lat: 48.1486, lng: 17.1077 }, // SK
  { name: 'Ljubljana', lat: 46.0569, lng: 14.5058 }, // SI
  { name: 'Copenhagen', lat: 55.6761, lng: 12.5683 }, // DK
  { name: 'London', lat: 51.5074, lng: -0.1278 }, // UK
  { name: 'Dublin', lat: 53.3498, lng: -6.2603 }, // IE
  { name: 'Vilnius', lat: 54.6872, lng: 25.2797 }, // LT
  { name: 'Minsk', lat: 53.9, lng: 27.5667 }, // BY
  { name: 'Kyiv', lat: 50.4501, lng: 30.5234 }, // UA
];

function project(lat: number, lng: number): { x: number; y: number } {
  // Equirectangular projection with cos(meanLat) scaling on the X axis.
  // Both axes use the same km-per-pixel scale, so country shapes look like
  // a real map (1° lng visually narrower than 1° lat). Content is centred
  // inside the SVG viewBox; either x or y axis pads the rest with empty space.
  const latRange = BBOX.maxLat - BBOX.minLat;
  const lngRangeAdj = (BBOX.maxLng - BBOX.minLng) * COS_MID_LAT;
  const scale = Math.min(SVG_W / lngRangeAdj, SVG_H / latRange);
  const offsetX = (SVG_W - lngRangeAdj * scale) / 2;
  const offsetY = (SVG_H - latRange * scale) / 2;
  const x = offsetX + (lng - BBOX.minLng) * COS_MID_LAT * scale;
  const y = offsetY + (BBOX.maxLat - lat) * scale;
  return { x, y };
}

function pathFromOutline(outline: [number, number][]): string {
  return (
    outline
      .map(([lng, lat], i) => {
        const { x, y } = project(lat, lng);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join('') + 'Z'
  );
}

export default function CommunityMap({ current, onPick }: CommunityMapProps) {
  const activeSlug = current.slug ?? null;
  const [hoverSlug, setHoverSlug] = useState<string | null>(null);
  const [shooting, setShooting] = useState<Shooting | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Shooting stars — fire one every 20–55 seconds, animation lasts 1.6s
  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout>;

    function fire() {
      if (!mounted) return;
      // Pick a starting point in the upper half of the map
      const startX = 100 + Math.random() * (SVG_W - 100);
      const startY = Math.random() * (SVG_H * 0.55);
      // Diagonal flight: down-left or down-right, length ~180–260 px
      const dist = 180 + Math.random() * 80;
      const angleRad = (25 + Math.random() * 30) * (Math.PI / 180); // 25°–55° from horizontal
      const dir = Math.random() < 0.5 ? -1 : 1; // shoot left or right
      const angleDeg = (angleRad * 180) / Math.PI * (dir === -1 ? -1 : 1) + (dir === -1 ? 180 : 0);
      setShooting({ key: Date.now(), startX, startY, angleDeg, dist });
      // Clear the element after animation completes (1.0s)
      setTimeout(() => mounted && setShooting(null), 1100);
      // Schedule next: 20–55 seconds (rare)
      const nextDelay = 20000 + Math.random() * 35000;
      timer = setTimeout(fire, nextDelay);
    }

    // First shooting star: 6–14s after mount
    timer = setTimeout(fire, 6000 + Math.random() * 8000);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * SVG_W;
    const y = ((e.clientY - rect.top) / rect.height) * SVG_H;

    let nearest: string | null = null;
    let minDist = Infinity;
    for (const loc of LOCATIONS) {
      const p = project(loc.lat, loc.lng);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < minDist) {
        minDist = d;
        nearest = loc.slug;
      }
    }
    setHoverSlug(nearest);
  }

  function handleMouseLeave() {
    setHoverSlug(null);
  }

  function handlePinClick(loc: (typeof LOCATIONS)[number]) {
    onPick({ lat: loc.lat, lng: loc.lng, name: loc.city, slug: loc.slug });
  }

  function handleCityClick(city: City) {
    onPick({ lat: city.lat, lng: city.lng, name: city.name });
  }

  return (
    <div className="cmap">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="cmap-svg"
        preserveAspectRatio="xMidYMid meet"
        overflow="visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="cmap-shoot-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,250,235,0)" />
            <stop offset="60%" stopColor="rgba(255,238,200,0.55)" />
            <stop offset="100%" stopColor="rgba(255,250,235,1)" />
          </linearGradient>
        </defs>

        {/* ── Constellation backdrop (drifts slowly) ── */}
        <g className="cmap-stars">
          {/* Random scattered stars */}
          {STARS.map((s, i) => (
            <circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={s.size}
              className={s.twinkle ? 'cmap-star cmap-star--twinkle' : 'cmap-star'}
              style={s.twinkle ? { animationDelay: `${s.phase}s` } : undefined}
            />
          ))}
          {/* Constellations */}
          {CONSTELLATIONS.map((c) => (
            <g key={c.name} className="cmap-constellation" data-name={c.name}>
              {c.lines.map((l, i) => {
                const a = c.stars[l.from];
                const b = c.stars[l.to];
                return (
                  <line
                    key={`l${i}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    className="cmap-constellation-line"
                  />
                );
              })}
              {c.stars.map((s, i) => (
                <circle key={`s${i}`} cx={s.x} cy={s.y} r={s.size} className="cmap-constellation-star" />
              ))}
            </g>
          ))}
        </g>

        {/* ── Shooting star (one at a time, JS-scheduled) ── */}
        {shooting && (
          <g
            key={shooting.key}
            transform={`translate(${shooting.startX} ${shooting.startY}) rotate(${shooting.angleDeg})`}
          >
            <g
              className="cmap-shooting"
              style={{ '--shoot-dist': `${shooting.dist}px` } as React.CSSProperties}
            >
              <line x1="-34" y1="0" x2="0" y2="0" className="cmap-shooting-tail" />
              <circle r="2" className="cmap-shooting-head" />
            </g>
          </g>
        )}

        {/* ── Far-west neighbours (Spain/Portugal/UK/Ireland) — barely a hint ── */}
        {FAR_NEIGHBOURS.map((c) =>
          c.polygons.map((poly, i) => (
            <path
              key={`far-${c.code}-${i}`}
              d={pathFromOutline(poly)}
              className="cmap-country cmap-country--far-neighbour"
            />
          )),
        )}

        {/* ── Neighbour countries — German-speaking minorities get a stronger
             outline (70% of primary). Others stay barely visible. ── */}
        {NEIGHBOURS.map((c) =>
          c.polygons.map((poly, i) => {
            const variant = GERMAN_SPEAKING.has(c.code)
              ? 'cmap-country--german-speaking'
              : 'cmap-country--neighbour';
            return <path key={`${c.code}-${i}`} d={pathFromOutline(poly)} className={`cmap-country ${variant}`} />;
          }),
        )}

        {COUNTRIES.map((c) =>
          c.polygons.map((poly, i) => (
            <path key={`${c.code}-${i}`} d={pathFromOutline(poly)} className="cmap-country" />
          )),
        )}

        {/* ── Capitals — clickable dots, always labelled. Click sets the
             sunset widget location, same as a congregation pin. ── */}
        {MAJOR_CITIES.map((city) => {
          const { x, y } = project(city.lat, city.lng);
          return (
            <g
              key={city.name}
              className="cmap-city cmap-city--main"
              onClick={() => handleCityClick(city)}
              transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}
            >
              <circle className="cmap-city-dot" />
              <text x="5" y="2" className="cmap-city-label">
                {city.name}
              </text>
            </g>
          );
        })}

        {LOCATIONS.map((loc) => {
          const { x, y } = project(loc.lat, loc.lng);
          const isHover = loc.slug === hoverSlug;
          const cls = isHover ? 'cmap-pin cmap-pin--hover' : 'cmap-pin';
          return (
            <g key={loc.slug} className={cls} onClick={() => handlePinClick(loc)} transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}>
              <circle className="cmap-pin-dot" />
              <text x="7" y="3" className="cmap-pin-label">
                {loc.city}
              </text>
            </g>
          );
        })}

        {/* User marker — single visual indicator of the currently selected
            sunset-clock location. Renders only if inside the map BBOX; for
            far-away picks (e.g. Tokyo) the location is still set in the widget
            but no map marker is shown. */}
        {isInBBox(current.lat, current.lng) && (() => {
          const { x, y } = project(current.lat, current.lng);
          return (
            <g className="cmap-user-marker" transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}>
              <circle r="9" className="cmap-user-marker-glow" />
              <circle r="6" className="cmap-user-marker-ring" />
              <circle r="2.4" className="cmap-user-marker-dot" />
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
