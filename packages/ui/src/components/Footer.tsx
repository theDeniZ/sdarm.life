'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getTimes } from 'suncalc';
import CommunityMap from './CommunityMap';
import {
  DEFAULT_COORDS,
  findLocationSlug,
  readStoredLocation,
  writeStoredLocation,
  type StoredLocation,
} from '../lib/sunset-location';
import { useCurrentTheme, withTheme } from '../lib/theme-link';

export interface FooterConfig {
  donation_url?: string | null;
  facebook_url?: string | null;
  whatsapp_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;
}

interface FooterProps {
  config?: FooterConfig;
  apiUrl?: string;
  webUrl?: string;
  songbookUrl?: string;
  eventsUrl?: string;
  treasuresUrl?: string;
  sblUrl?: string;
  locale?: string;
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

export default function Footer({
  config,
  apiUrl = 'https://api.sdarm.life/api/v1',
  webUrl = 'https://sdarm.life',
  songbookUrl = 'https://songs.sdarm.life',
  eventsUrl = 'https://events.sdarm.life',
  treasuresUrl = 'https://treasures.sdarm.life',
  sblUrl = 'https://sbl.sdarm.life',
  locale = 'de',
}: FooterProps) {
  const t = useTranslations('common.footer');
  const clockT = useTranslations('common.clock');
  const navT = useTranslations('common.nav');
  const theme = useCurrentTheme();

  const facebookUrl = config?.facebook_url ?? '#';
  const instagramUrl = config?.instagram_url ?? '#';
  const youtubeUrl = config?.youtube_url ?? '#';
  const whatsappUrl = config?.whatsapp_url ?? '#';

  const [email, setEmail] = useState('');
  const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'ok' | 'error' | 'conflict'>('idle');
  const [current, setCurrent] = useState<StoredLocation>(() => ({
    ...DEFAULT_COORDS,
    name: clockT('defaultLocation'),
  }));
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

  // Restore from localStorage on mount (client-only — server has no localStorage).
  // Allow overriding via query params for screenshot tests: ?screenshotLocation=Pforzheim&screenshotTime=14:30
  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const screenshotLocation = params.get('screenshotLocation');
    if (screenshotLocation) {
      // Fixed location for testing
      setCurrent({
        lat: 48.895,
        lng: 8.681,
        name: screenshotLocation,
        slug: 'pforzheim',
      });
    } else {
      const saved = readStoredLocation();
      if (saved) setCurrent(saved);
    }
  }, []);

  const sunData = useMemo(() => fetchSunData(current.lat, current.lng), [current.lat, current.lng]);

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

  function handlePickLocation(loc: { lat: number; lng: number; name: string; slug?: string }) {
    const slug = loc.slug ?? findLocationSlug(loc.name);
    const next: StoredLocation = { lat: loc.lat, lng: loc.lng, name: loc.name, slug };
    setCurrent(next);
    writeStoredLocation(next);
  }

  async function handleSubscribe() {
    if (!email) return;
    setSubStatus('loading');
    try {
      const res = await fetch(`${apiUrl}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, language: locale }),
      });
      if (res.status === 409) {
        setSubStatus('conflict');
        return;
      }
      if (!res.ok) throw new Error();
      setSubStatus('ok');
      setEmail('');
    } catch {
      setSubStatus('error');
    }
  }

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
  }, [locationInput]);

  async function applyLocation(result: NominatimResult) {
    handlePickLocation({
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
      await applyLocation(suggestions[0]);
      return;
    }
    if (!locationInput.trim()) return;
    try {
      const geo = await fetch(`${apiUrl}/geocode?q=${encodeURIComponent(locationInput)}&limit=1`);
      const results = (await geo.json()) as NominatimResult[];
      if (!results.length) return;
      await applyLocation(results[0]);
    } catch {}
  }

  // Both rings show ELAPSED progress, clockwise from 12 o'clock: empty at the
  // start of the period, full at its end. Outer — the current period (day, night,
  // Sabbath), exactly what the single ring used to show. Inner — the week.
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
    <footer className="site-footer">
      <CommunityMap current={current} onPick={handlePickLocation} />

      <div className="footer-inner-wrap">
        {/* Column 1: contact + subscribe */}
        <div className="footer-contact">
          <h2 className="footer-heading">{t.rich('stayInTouch', { em: (chunks) => <em>{chunks}</em> })}</h2>

          <div className="footer-social">
            <a href={instagramUrl} title="Instagram" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a href={youtubeUrl} title="YouTube" aria-label="YouTube" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z" />
                <polygon points="9.75,15.02 15.5,12 9.75,8.98 9.75,15.02" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a href={whatsappUrl} title="WhatsApp" aria-label="WhatsApp" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
              </svg>
            </a>
            <a href={facebookUrl} title="Facebook" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
              </svg>
            </a>
          </div>

          <a className="footer-email-link" href="mailto:info@sdarm.life">
            info@sdarm.life
          </a>
          <form
            className="footer-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubscribe();
            }}
          >
            <input
              className="footer-input"
              type="email"
              placeholder={t('newsletter')}
              aria-label={t('emailInputAria')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={subStatus === 'loading'}
            />
            <button
              className="footer-subscribe"
              type="submit"
              disabled={subStatus === 'loading'}
              aria-label={t('subscribeButton')}
            >
              {subStatus === 'loading' ? (
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <circle
                    cx="8"
                    cy="8"
                    r="5"
                    strokeDasharray="28"
                    strokeDashoffset="10"
                    style={{ animation: 'footer-spin 0.8s linear infinite' }}
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <line x1="3" y1="8" x2="12" y2="8" />
                  <polyline points="8,4 12,8 8,12" />
                </svg>
              )}
            </button>
          </form>
          {subStatus === 'ok' && <p className="f-sub-ok">{t('subscribeSuccess')}</p>}
          {subStatus === 'conflict' && <p className="f-sub-err">{t('subscribeDuplicate')}</p>}
          {subStatus === 'error' && <p className="f-sub-err">{t('subscribeError')}</p>}
        </div>

        {/* Column 2: nav links */}
        <nav className="footer-nav" aria-label={t('footerNavAria')}>
          <div className="footer-nav-links">
            <Link href={withTheme(songbookUrl, theme)}>{navT('songs')}</Link>
            <Link href={withTheme(`${treasuresUrl}/bible`, theme)}>{navT('bible')}</Link>
            <Link href={withTheme(treasuresUrl, theme)}>{navT('treasures')}</Link>
            <Link href={sblUrl}>{navT('sbl')}</Link>
            <Link href={withTheme(eventsUrl, theme)}>{navT('events')}</Link>
            <Link href={withTheme(`${webUrl}/about`, theme)}>{navT('about')}</Link>
            <Link href={withTheme(`${webUrl}/kontakt`, theme)}>{navT('contact')}</Link>
          </div>
        </nav>

        {/* Column 3: sunset clock */}
        <div className="footer-sunset">
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
          <div className="sunset-footer-text">
            <div className="sunset-footer-location">{current.name}</div>
            <div className="sunset-footer-label">{clock.label}</div>
            <div className="sunset-location-wrap">
              <form className="sunset-location-form" onSubmit={handleLocationChange}>
                <input
                  type="text"
                  className="sunset-location-input"
                  placeholder={t('locationPlaceholder')}
                  aria-label={t('locationInputAria')}
                  autoComplete="off"
                  spellCheck={false}
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                />
                <button type="submit" className="sunset-location-btn" aria-label={t('locationUpdateAria')}>
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
      </div>

      <div className="footer-bottom">
        <span className="footer-bottom-logo">
          SDARM<span>.life</span>
        </span>
        <span className="footer-copy">{t('copyright', { year: new Date().getFullYear() })}</span>
        <div className="footer-legal">
          <Link href={withTheme(`${webUrl}/impressum`, theme)}>{navT('imprint')}</Link>
          <span>·</span>
          <Link href={withTheme(`${webUrl}/datenschutz`, theme)}>{navT('privacy')}</Link>
        </div>
      </div>
    </footer>
  );
}
