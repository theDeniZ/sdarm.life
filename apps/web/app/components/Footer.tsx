'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
  songbookUrl?: string;
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

const CIRC = 2 * Math.PI * 76;
const DEFAULT_LAT = 48.8922;
const DEFAULT_LNG = 8.6944;
const TZ = 'Europe/Berlin';

function parseTimeToMs(timeStr: string): number {
  const [time, period] = timeStr.split(' ');
  let [h] = time.split(':').map(Number);
  const m = Number(time.split(':')[1]);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return (h * 3600 + m * 60) * 1000;
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

function computeClock(sun: SunData, now: number, dow: number): ClockState {
  const DAY_MS = 86400000;

  const { todaySunrise, todaySunset, tomorrowSunrise, tomorrowSunset } = sun;

  const isFriday = dow === 5;
  const isSaturday = dow === 6;

  const isBeforeSunrise = now < todaySunrise;
  const isAfterSunset = now >= todaySunset;
  const isNight = isAfterSunset || isBeforeSunrise;

  const sunDay = isFriday ? 'Freitag' : isSaturday ? 'Samstag' : '';

  // Helper: consistent countdown progress (1 → 0)
  const calcProgress = (remaining: number, total: number) => Math.min(1, Math.max(0, remaining / total));

  // ---------- 🕯️ BEFORE SHABBAT (Friday before sunset)
  if (isFriday && !isAfterSunset) {
    const total = todaySunset - todaySunrise;
    const remaining = Math.max(0, todaySunset - now);

    return {
      label: 'Bis Schabbat',
      sublabel: fmtRemaining(remaining),
      timeVal: msToHHMM(todaySunset),
      progress: calcProgress(remaining, total),
      sunDay,
    };
  }

  // ---------- 🕯️ DURING SHABBAT (Friday sunset → Saturday sunset)
  if ((isFriday && isAfterSunset) || (isSaturday && !isAfterSunset)) {
    let start: number;
    let end: number;

    if (isFriday) {
      start = todaySunset;
      end = tomorrowSunset;
    } else {
      // Saturday → Shabbat started yesterday
      start = todaySunset - DAY_MS;
      end = todaySunset;
    }

    const total = end - start;

    const remaining = now <= end ? end - now : 0;

    return {
      label: 'Schabbat endet',
      sublabel: fmtRemaining(remaining),
      timeVal: msToHHMM(end),
      progress: calcProgress(remaining, total),
      sunDay,
    };
  }

  // ---------- 🌅 DAYTIME (normal days)
  if (!isNight) {
    const total = todaySunset - todaySunrise;
    const remaining = Math.max(0, todaySunset - now);

    return {
      label: 'Bis Sonnenuntergang',
      sublabel: fmtRemaining(remaining),
      timeVal: msToHHMM(todaySunset),
      progress: calcProgress(remaining, total),
      sunDay,
    };
  }

  // ---------- 🌙 NIGHTTIME
  const total = DAY_MS - todaySunset + tomorrowSunrise;

  const remaining = isAfterSunset ? DAY_MS - now + tomorrowSunrise : Math.max(0, tomorrowSunrise - now);

  return {
    label: 'Bis Sonnenaufgang',
    sublabel: fmtRemaining(remaining),
    timeVal: msToHHMM(tomorrowSunrise),
    progress: calcProgress(remaining, total),
    sunDay,
  };
}

async function fetchSunData(lat: number, lng: number): Promise<SunData> {
  const base = `https://api.sunrisesunset.io/json?lat=${lat}&lng=${lng}&timezone=${TZ}`;
  const [todayRes, tomorrowRes] = await Promise.all([fetch(`${base}&date=today`), fetch(`${base}&date=tomorrow`)]);
  const [todayData, tomorrowData] = await Promise.all([
    todayRes.json() as Promise<{ results: { sunrise: string; sunset: string } }>,
    tomorrowRes.json() as Promise<{ results: { sunrise: string; sunset: string } }>,
  ]);
  return {
    todaySunrise: parseTimeToMs(todayData.results.sunrise),
    todaySunset: parseTimeToMs(todayData.results.sunset),
    tomorrowSunrise: parseTimeToMs(tomorrowData.results.sunrise),
    tomorrowSunset: parseTimeToMs(tomorrowData.results.sunset),
  };
}

export default function Footer({
  config,
  apiUrl = 'https://api.sdarm.life/api/v1',
  songbookUrl = 'https://songs.sdarm.life',
}: FooterProps) {
  const facebookUrl = config?.facebook_url ?? '#';
  const instagramUrl = config?.instagram_url ?? '#';
  const youtubeUrl = config?.youtube_url ?? '#';

  const [email, setEmail] = useState('');
  const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'ok' | 'error' | 'conflict'>('idle');
  const [sunData, setSunData] = useState<SunData | null>(null);
  const [locationName, setLocationName] = useState('Pforzheim, Baden-Württemberg');
  const [locationInput, setLocationInput] = useState('');
  const [clock, setClock] = useState<ClockState>({ label: 'Untergang', sublabel: '…', timeVal: '–:––', progress: 0 });

  useEffect(() => {
    fetchSunData(DEFAULT_LAT, DEFAULT_LNG)
      .then(setSunData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!sunData) return;
    function tick() {
      const now = nowMs();
      const dow = new Date().getDay();
      setClock(computeClock(sunData!, now, dow));
    }
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [sunData]);

  async function handleSubscribe() {
    if (!email) return;
    setSubStatus('loading');
    try {
      const res = await fetch(`${apiUrl}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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

  async function handleLocationChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!locationInput.trim()) return;
    try {
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(locationInput)}&countrycodes=de&format=jsonv2&limit=1&addressdetails=1`
      );
      const results = (await geo.json()) as { lat: string; lon: string; display_name: string }[];
      if (!results.length) return;
      const { lat, lon, display_name } = results[0];
      const data = await fetchSunData(Number(lat), Number(lon));
      setSunData(data);
      setLocationName(display_name.split(',').slice(0, 2).join(',').trim());
      setLocationInput('');
    } catch {
      // silently fail
    }
  }

  const dashOffset = CIRC * (1 - clock.progress);

  return (
    <footer className="site-footer">
      <div className="footer-map" />

      <div className="footer-inner-wrap">
        {/* Column 1: contact + subscribe */}
        <div className="footer-contact">
          <h3 className="footer-heading">
            In <em>Kontakt</em> bleiben
          </h3>
          <div className="footer-info">
            Reformierte Adventisten
            <br />
            Deutschland &amp; Österreich
            <br />
            <br />
            <a href="mailto:info@sdarm.life">info@sdarm.life</a>
          </div>

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
            <a href="#" title="Telegram" aria-label="Telegram">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22 11 13 2 9l20-7z" />
              </svg>
            </a>
            <a href={facebookUrl} title="Facebook" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
              </svg>
            </a>
          </div>

          <div className="footer-form-label">Newsletter</div>
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
              placeholder="E-Mail-Adresse"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={subStatus === 'loading'}
            />
            <button className="footer-subscribe" type="submit" disabled={subStatus === 'loading'}>
              {subStatus === 'loading' ? '…' : '→'}
            </button>
          </form>
          {subStatus === 'ok' && <p className="f-sub-ok">Vielen Dank für Ihre Anmeldung!</p>}
          {subStatus === 'conflict' && <p className="f-sub-err">Diese E-Mail ist bereits registriert.</p>}
          {subStatus === 'error' && <p className="f-sub-err">Fehler. Bitte versuchen Sie es später.</p>}
        </div>

        {/* Column 2: nav links */}
        <div className="footer-nav">
          <div className="footer-nav-links">
            <Link href="/#neuigkeiten">Neues</Link>
            <Link href={songbookUrl}>Lieder</Link>
            <Link href="/#neuigkeiten">Events</Link>
            <Link href="/schaetze">Schätze</Link>
            <Link href="/about">Über uns</Link>
            <Link href="#kontakt">Kontakt</Link>
            <Link href="/impressum">Impressum</Link>
            <Link href="/datenschutz">Datenschutz</Link>
          </div>
        </div>

        {/* Column 3: sunset clock */}
        <div className="footer-sunset">
          <div className="sunset-clock-wrap">
            <svg className="sunset-svg" viewBox="0 0 180 180">
              <circle className="sunset-ring-track" cx="90" cy="90" r="76" />
              <circle
                className="sunset-ring-fill"
                cx="90"
                cy="90"
                r="76"
                strokeDasharray={CIRC}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div className="sunset-clock-inner">
              <div className="sunset-time-label">{clock.label}</div>
              <div className="sunset-time-value">{clock.sublabel}</div>
            </div>
          </div>
          <div className="sunset-footer-text">
            <div className="sunset-footer-label">{clock.label}</div>
            {clock.sunDay && <div className="sunset-footer-day">{clock.sunDay}</div>}
            <div className="sunset-footer-location">{locationName}</div>
            <form className="sunset-location-form" onSubmit={handleLocationChange}>
              <input
                type="text"
                className="sunset-location-input"
                placeholder="Stadt oder PLZ"
                autoComplete="off"
                spellCheck={false}
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
              />
              <button type="submit" className="sunset-location-btn" aria-label="Standort aktualisieren">
                →
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span className="footer-bottom-logo">
          SDARM<span>.life</span>
        </span>
        <span className="footer-copy">© 2026 SDARM.life — Siebenten-Tags-Adventisten Reformationsbewegung</span>
        <span className="footer-copy">Alle Rechte vorbehalten</span>
      </div>
    </footer>
  );
}
