'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { getTimes } from 'suncalc';
import { useSunsetLocation } from '../lib/sunset-location';

export interface SunsetClockProps {
  /** API base for the location search (`GET {apiUrl}/geocode`). */
  apiUrl?: string;
}

interface SunData {
  todaySunrise: number;
  todaySunset: number;
  tomorrowSunrise: number;
  tomorrowSunset: number;
}

interface ClockState {
  label: string;
  sublabel: string;
  timeVal: string;
  progress: number;
  sunDay?: string;
}

/* Sunset clock — "ring in ring". Geometry from the owner's reference mark, in its
   own units: a 172-unit box (the rings' outer extent), both strokes 16, the outer
   centre-line at r 78 and the inner at r 54, which leaves an 8-unit gap. */
const RING_BOX = 172;
const RING_C = RING_BOX / 2;
const RING_OUTER_R = 78;
const RING_INNER_R = 54;

/* Screenshot mode pins the weekday as well as the time, so neither the labels
   ("Bis Sabbat" on a Friday) nor the week ring depend on the day the suite runs.
   Wednesday by default; ?screenshotDay=0–6 selects another (0 = Sunday). */
const SCREENSHOT_DOW = 3;

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
    postcode?: string;
  };
}

function extractCityName(r: NominatimResult): string {
  const a = r.address;
  if (!a) return r.display_name.split(',')[0];
  return a.city || a.town || a.village || a.municipality || a.county || a.state || r.display_name.split(',')[0];
}

function extractDropdownLabel(r: NominatimResult): string {
  const a = r.address;
  const city = extractCityName(r);
  const postcode = a?.postcode;
  const country = a?.country || '';
  const countryCode = a?.country_code?.toUpperCase() || '';

  // For US/CA/AU show "City, State" — country is too broad
  const stateCountries = ['us', 'ca', 'au'];
  if (a?.state && a.country_code && stateCountries.includes(a.country_code)) {
    const prefix = postcode ? `${postcode} · ` : '';
    return `${prefix}${city}, ${a.state}`;
  }

  // Postal code search: show "10115 · Berlin, Germany"
  if (postcode && postcode === r.display_name.split(',')[0].trim()) {
    return city !== postcode ? `${postcode} · ${city}, ${countryCode}` : `${postcode}, ${country}`;
  }

  return country ? `${city}, ${country}` : city;
}

function dateToMsOfDay(d: Date | null): number {
  // suncalc 2 returns null where v1 returned an Invalid Date (polar day/night).
  if (!d) return NaN;
  return (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) * 1000;
}

function msToHHMM(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function fmtRemaining(diffMs: number): string {
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function nowMs(): number {
  const d = new Date();
  return (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) * 1000;
}

function computeClock(sun: SunData, now: number, dow: number, clockT: (key: string) => string): ClockState {
  const DAY_MS = 86400000;

  const { todaySunrise, todaySunset, tomorrowSunrise, tomorrowSunset } = sun;

  const isFriday = dow === 5;
  const isSaturday = dow === 6;

  const isBeforeSunrise = now < todaySunrise;
  const isAfterSunset = now >= todaySunset;
  const isNight = isAfterSunset || isBeforeSunrise;

  const sunDay = isFriday ? clockT('friday') : isSaturday ? clockT('saturday') : '';

  const calcProgress = (remaining: number, total: number) => Math.min(1, Math.max(0, remaining / total));

  if (isFriday && !isAfterSunset) {
    const total = todaySunset - todaySunrise;
    const remaining = Math.max(0, todaySunset - now);
    return {
      label: clockT('untilSabbath'),
      sublabel: fmtRemaining(remaining),
      timeVal: msToHHMM(todaySunset),
      progress: calcProgress(remaining, total),
      sunDay,
    };
  }

  if ((isFriday && isAfterSunset) || (isSaturday && !isAfterSunset)) {
    let total: number;
    let remaining: number;
    let endTimeVal: number;

    if (isFriday) {
      // Sabbath started at today's sunset, ends at tomorrow's sunset (crosses midnight)
      total = DAY_MS - todaySunset + tomorrowSunset;
      remaining = Math.max(0, DAY_MS - now + tomorrowSunset);
      endTimeVal = tomorrowSunset;
    } else {
      // Saturday: period from yesterday's sunset (~DAY_MS ago) to today's sunset
      total = DAY_MS;
      remaining = Math.max(0, todaySunset - now);
      endTimeVal = todaySunset;
    }

    return {
      label: clockT('sabbathEnds'),
      sublabel: fmtRemaining(remaining),
      timeVal: msToHHMM(endTimeVal),
      progress: calcProgress(remaining, total),
      sunDay,
    };
  }

  if (!isNight) {
    const total = todaySunset - todaySunrise;
    const remaining = Math.max(0, todaySunset - now);
    return {
      label: clockT('untilSunset'),
      sublabel: fmtRemaining(remaining),
      timeVal: msToHHMM(todaySunset),
      progress: calcProgress(remaining, total),
      sunDay,
    };
  }

  const total = DAY_MS - todaySunset + tomorrowSunrise;
  const remaining = isAfterSunset ? DAY_MS - now + tomorrowSunrise : Math.max(0, tomorrowSunrise - now);

  return {
    label: clockT('untilSunrise'),
    sublabel: fmtRemaining(remaining),
    timeVal: msToHHMM(tomorrowSunrise),
    progress: calcProgress(remaining, total),
    sunDay,
  };
}

/**
 * Progress through the week toward the next Sabbath: 0 when the last Sabbath
 * ended (Saturday sunset), 1 when the next one begins (Friday sunset), and 1 for
 * the whole Sabbath.
 *
 * Times are ms relative to today's midnight. Only today's and tomorrow's sunsets
 * are known exactly; a boundary further away uses today's sunset instead. Sunset
 * moves by at most ~3 min a day, so over a ~6-day span the error stays under 0.3%
 * of the ring — invisible — and the two boundaries that matter most (the Sabbath
 * starting today or tomorrow, ending today) are exact.
 */
function computeWeekProgress(sun: SunData, now: number, dow: number): number {
  const DAY_MS = 86400000;
  const { todaySunset, tomorrowSunset } = sun;
  const afterSunset = now >= todaySunset;

  if ((dow === 5 && afterSunset) || (dow === 6 && !afterSunset)) return 1;

  // Days from today back to the Saturday whose sunset ended the last Sabbath
  // (0 on Saturday evening), and forward to the Friday whose sunset starts the next.
  const daysSinceSat = (dow + 1) % 7;
  const daysToFri = dow === 6 ? 6 : 5 - dow;
  const sunsetOn = (days: number) => days * DAY_MS + (days === 1 ? tomorrowSunset : todaySunset);

  const start = sunsetOn(-daysSinceSat);
  const end = sunsetOn(daysToFri);
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

function fetchSunData(lat: number, lng: number): SunData {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  const t1 = getTimes(today, lat, lng);
  const t2 = getTimes(tomorrow, lat, lng);
  return {
    todaySunrise: dateToMsOfDay(t1.sunrise),
    todaySunset: dateToMsOfDay(t1.sunset),
    tomorrowSunrise: dateToMsOfDay(t2.sunrise),
    tomorrowSunset: dateToMsOfDay(t2.sunset),
  };
}

/**
 * One progress arc. `pathLength` normalises the circumference to 1, so the dash
 * is the value itself. Nothing is drawn at 0 — a zero-length dash with a round
 * cap would still paint a dot at 12 o'clock — and 1 draws the whole circle.
 */
function RingArc({ className, r, value }: { className: string; r: number; value: number | null }) {
  if (value === null || value <= 0) return null;
  return (
    <circle
      className={className}
      cx={RING_C}
      cy={RING_C}
      r={r}
      pathLength={1}
      strokeDasharray={value >= 1 ? undefined : `${value} 1`}
    />
  );
}

export default function SunsetClock({ apiUrl = 'https://api.sdarm.life/api/v1' }: SunsetClockProps) {
  const clockT = useTranslations('common.clock');

  const [current, pickLocation] = useSunsetLocation(clockT('defaultLocation'));
  const [locationInput, setLocationInput] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [clock, setClock] = useState<ClockState>({
    label: clockT('sunset'),
    sublabel: '…',
    timeVal: '–:––',
    progress: 0,
  });
  // null until the first tick, so the server render draws no week arc
  const [week, setWeek] = useState<number | null>(null);

  const sunData = useMemo(() => fetchSunData(current.lat, current.lng), [current.lat, current.lng]);

  // ?screenshotTime=HH:MM pins the clock for screenshot tests (with
  // ?screenshotLocation=, read by useSunsetLocation, and ?screenshotDay=).
  useEffect(() => {
    function tick() {
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const screenshotTime = params.get('screenshotTime');

      let now: number;
      if (screenshotTime) {
        // For screenshots, use fixed time: HH:MM format
        const [h, m] = screenshotTime.split(':').map(Number);
        now = (h * 3600 + m * 60) * 1000;
      } else {
        now = nowMs();
      }

      const dayParam = params.get('screenshotDay');
      const pinnedDay = dayParam !== null && /^[0-6]$/.test(dayParam) ? Number(dayParam) : SCREENSHOT_DOW;
      const dow = screenshotTime ? pinnedDay : new Date().getDay();
      const state = computeClock(sunData, now, dow, clockT);

      // Override display time directly when in screenshot mode
      if (screenshotTime) {
        state.timeVal = screenshotTime;
      }

      setClock(state);
      setWeek(computeWeekProgress(sunData, now, dow));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sunData, clockT]);

  useEffect(() => {
    if (locationInput.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${apiUrl}/geocode?q=${encodeURIComponent(locationInput)}&limit=3`);
        const data = (await res.json()) as NominatimResult[];
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch {}
    }, 320);
    return () => clearTimeout(timer);
  }, [locationInput, apiUrl]);

  function applyLocation(result: NominatimResult) {
    pickLocation({
      lat: Number(result.lat),
      lng: Number(result.lon),
      name: extractCityName(result),
    });
    setLocationInput('');
    setSuggestions([]);
    setShowSuggestions(false);
  }

  async function handleLocationChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (suggestions.length > 0) {
      applyLocation(suggestions[0]);
      return;
    }
    if (!locationInput.trim()) return;
    try {
      const geo = await fetch(`${apiUrl}/geocode?q=${encodeURIComponent(locationInput)}&limit=1`);
      const results = (await geo.json()) as NominatimResult[];
      if (!results.length) return;
      applyLocation(results[0]);
    } catch {}
  }

  // Both rings show ELAPSED progress, clockwise from 12 o'clock: empty at the
  // start of the period, full at its end. Outer — the current period (day, night,
  // Sabbath). Inner — the week.
  // `week` is set by the same tick as `clock`, so null means "not computed yet".
  const dayElapsed = week === null ? null : 1 - clock.progress;
  // Floored, so the label never says 100 % before the period is actually over.
  const pct = (v: number) => Math.floor(v * 100);
  const ringsLabel =
    dayElapsed === null || week === null
      ? undefined
      : `${clockT('ringDay', { label: clock.label, remaining: clock.sublabel, percent: pct(dayElapsed) })} ${
          week >= 1 ? clockT('ringWeekSabbath') : clockT('ringWeek', { percent: pct(week) })
        }`;

  return (
    <div className="sunset-clock">
      <div className="sunset-clock-wrap">
        <svg
          className="sunset-svg"
          viewBox={`0 0 ${RING_BOX} ${RING_BOX}`}
          role="img"
          aria-label={ringsLabel}
          aria-hidden={ringsLabel ? undefined : true}
        >
          <circle className="sunset-ring-track" cx={RING_C} cy={RING_C} r={RING_OUTER_R} />
          <circle className="sunset-ring-track" cx={RING_C} cy={RING_C} r={RING_INNER_R} />
          <RingArc className="sunset-ring-outer" r={RING_OUTER_R} value={dayElapsed} />
          <RingArc className="sunset-ring-inner" r={RING_INNER_R} value={week} />
        </svg>
        <div className="sunset-clock-inner">
          <div className="sunset-time-value">
            {clock.timeVal === '–:––' ? (
              clock.timeVal
            ) : (
              <>
                {clock.timeVal.split(':')[0]}
                <span className="sunset-colon">:</span>
                {clock.timeVal.split(':')[1]}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="sunset-text">
        <div className="sunset-city">{current.name}</div>
        <div className="sunset-label">{clock.label}</div>
        <div className="sunset-location-wrap">
          <form className="sunset-location-form" onSubmit={handleLocationChange}>
            <input
              type="text"
              className="sunset-location-input"
              placeholder={clockT('locationPlaceholder')}
              aria-label={clockT('locationInputAria')}
              autoComplete="off"
              spellCheck={false}
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            />
            <button type="submit" className="sunset-location-btn" aria-label={clockT('locationUpdateAria')}>
              <svg viewBox="0 0 13 13" aria-hidden="true">
                <line x1="1.5" y1="6.5" x2="11" y2="6.5" />
                <polyline points="7.5,3 11,6.5 7.5,10" />
              </svg>
            </button>
          </form>
          {showSuggestions && suggestions.length > 0 && (
            <ul className="sunset-suggestions">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button type="button" className="sunset-suggestion-item" onMouseDown={() => applyLocation(s)}>
                    {extractDropdownLabel(s)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
