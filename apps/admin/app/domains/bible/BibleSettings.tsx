'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchCatalog, fetchEnabledDetails, fetchEnabledIds, fetchLicenses, saveEnabledIds } from './repository';
import { LANGUAGE_OPTIONS, type BibleCatalogEntry, type BibleLicense, type CatalogPage } from './types';
import {
  DEFAULT_JURISDICTION,
  JURISDICTIONS,
  assessPublicDomain,
  getJurisdiction,
  languageLabel,
  pdTranslationsForLanguage,
  type PdStatus,
} from './publicDomain';

type Flash = { kind: 'ok' | 'err'; message: string } | null;

const STATUS_LABEL: Record<PdStatus, string> = {
  public: 'Public domain',
  copyrighted: 'Copyrighted',
  unknown: 'Unverified',
};

function PdBadge({ status, title }: { status: PdStatus; title: string }) {
  return (
    <span className={`pd-badge pd-${status}`} title={title}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export default function BibleSettings() {
  const [language, setLanguage] = useState('deu');
  const [jurisdiction, setJurisdiction] = useState(DEFAULT_JURISDICTION);
  const [showUnlicensed, setShowUnlicensed] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState<CatalogPage | null>(null);
  const [pageToken, setPageToken] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [enabledIds, setEnabledIds] = useState<number[]>([]);
  // Metadata for enabled translations, so the "Enabled" list stays readable
  // even when those bibles are not on the currently browsed catalog page.
  const [enabledDetails, setEnabledDetails] = useState<Record<number, BibleCatalogEntry>>({});
  const [licenses, setLicenses] = useState<BibleLicense[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<Flash>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchEnabledIds(), fetchEnabledDetails(), fetchLicenses()])
      .then(([ids, details, lics]) => {
        if (cancelled) return;
        setEnabledIds(ids);
        setEnabledDetails(Object.fromEntries(details.map((d) => [d.id, d])));
        setLicenses(lics);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the saved selection.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadCatalog = useCallback((lang: string, token: string | undefined, all: boolean) => {
    setLoading(true);
    setError(null);
    fetchCatalog(lang, token, all)
      .then((data) => {
        setPage(data);
        setEnabledDetails((prev) => {
          const next = { ...prev };
          for (const item of data.items) next[item.id] = item;
          return next;
        });
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCatalog(language, pageToken, showUnlicensed);
  }, [language, pageToken, showUnlicensed, loadCatalog]);

  function handleLanguageChange(code: string) {
    setLanguage(code);
    setPageToken(undefined);
  }

  function handleShowUnlicensed(next: boolean) {
    setShowUnlicensed(next);
    setPageToken(undefined);
  }

  function toggle(entry: BibleCatalogEntry) {
    setEnabledDetails((prev) => ({ ...prev, [entry.id]: entry }));
    setEnabledIds((prev) => (prev.includes(entry.id) ? prev.filter((id) => id !== entry.id) : [...prev, entry.id]));
    setDirty(true);
  }

  function remove(id: number) {
    setEnabledIds((prev) => prev.filter((x) => x !== id));
    setDirty(true);
  }

  function move(id: number, direction: -1 | 1) {
    setEnabledIds((prev) => {
      const idx = prev.indexOf(id);
      const target = idx + direction;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveEnabledIds(enabledIds);
      setDirty(false);
      setFlash({ kind: 'ok', message: 'Saved. Public pages update within a day, or immediately after a cache purge.' });
    } catch {
      setFlash({ kind: 'err', message: 'Could not save. Please retry.' });
    } finally {
      setSaving(false);
      setTimeout(() => setFlash(null), 4000);
    }
  }

  /** The single license agreement that governs a Bible, if we know of one. */
  const licenseFor = useCallback(
    (id: number): BibleLicense | null => licenses.find((l) => l.bibleIds.includes(id)) ?? null,
    [licenses]
  );

  const jur = getJurisdiction(jurisdiction);
  const curatedForLanguage = useMemo(() => pdTranslationsForLanguage(language), [language]);

  const visible = (page?.items ?? []).filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.abbreviation.toLowerCase().includes(q) || String(item.id) === q;
  });

  const unlicensedOnPage = (page?.items ?? []).filter((i) => !i.licensed).length;

  return (
    <div className="bible-settings">
      <section className="card">
        <header className="config-card-header">
          <span className="config-label">Enabled translations ({enabledIds.length})</span>
          <button className="btn-primary" onClick={handleSave} disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save selection'}
          </button>
        </header>
        <p className="muted-note">
          These are the translations visitors can read on treasures.sdarm.life/bible, in this order. Bible text is
          fetched from YouVersion on demand — nothing is stored in our database.
        </p>

        {enabledIds.length === 0 ? (
          <p className="muted-note">Nothing enabled yet — pick translations from the catalog below.</p>
        ) : (
          <ol className="bible-enabled-list">
            {enabledIds.map((id, i) => {
              const entry = enabledDetails[id];
              const verdict = entry ? assessPublicDomain(entry, jurisdiction) : null;
              return (
                <li key={id} className="bible-enabled-row">
                  <span className="bible-enabled-rank">{i + 1}</span>
                  <span className="bible-enabled-name">
                    {entry ? entry.name : `YouVersion #${id}`}
                    {entry && (
                      <span className="bible-enabled-meta">
                        {' '}
                        {entry.abbreviation} · {languageLabel(entry.language)}
                      </span>
                    )}
                    <span className="bible-badge-row">
                      {verdict && <PdBadge status={verdict.status} title={verdict.reason} />}
                    </span>
                  </span>
                  <span className="bible-enabled-actions">
                    <button className="btn-ghost" onClick={() => move(id, -1)} disabled={i === 0} aria-label="Move up">
                      ↑
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() => move(id, 1)}
                      disabled={i === enabledIds.length - 1}
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button className="btn-ghost btn-danger" onClick={() => remove(id)} aria-label="Remove">
                      ✕
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {flash && <p className={flash.kind === 'ok' ? 'flash-ok' : 'flash-err'}>{flash.message}</p>}
      </section>

      <section className="card">
        <header className="config-card-header">
          <span className="config-label">Copyright jurisdiction</span>
        </header>
        <p className="muted-note">
          Public domain is decided per country, so pick the one this deployment serves. Copyright terms differ (life +
          50 in China, life + 70 across the EU, life + 100 in Mexico) and some texts carry local quirks — the KJV is
          free in the United States but under perpetual Crown copyright in the United Kingdom.
        </p>
        <div className="bible-jurisdiction-row">
          <select
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
            aria-label="Copyright jurisdiction"
          >
            {JURISDICTIONS.map((j) => (
              <option key={j.code} value={j.code}>
                {j.name} — life + {j.authorDeathTerm}
              </option>
            ))}
          </select>
          {jur.note && <span className="muted-note">{jur.note}</span>}
        </div>
        <p className="muted-note">
          Guidance only, not legal advice. Where YouVersion itself declares a text public domain we show that instead —
          the publisher is the authority on their own text.
        </p>
      </section>

      <section className="card">
        <header className="config-card-header">
          <span className="config-label">Licenses ({licenses.length})</span>
        </header>
        <p className="muted-note">
          YouVersion grants access per <em>license</em>, not per version — one license covers a whole list of Bibles.
          Licenses are accepted in the YouVersion developer dashboard; this list is read-only reference. Whether a
          translation is actually readable is shown per row in the catalog below, not here — YouVersion does not report
          acceptance state to an app key.
        </p>
        {licenses.length === 0 ? (
          <p className="muted-note">No license data — the API key may be unset, or YouVersion is unreachable.</p>
        ) : (
          <ul className="bible-license-list">
            {licenses.map((l) => (
              <li key={l.id} className="bible-license-row">
                <span className="bible-license-name">
                  {l.name}
                  {l.organization && <span className="bible-enabled-meta"> · {l.organization}</span>}
                </span>
                <span className="muted-note">
                  {l.bibleIds.length} Bible{l.bibleIds.length === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <header className="config-card-header">
          <span className="config-label">YouVersion catalog</span>
        </header>

        <div className="bible-catalog-toolbar">
          <div className="chip-row">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                className="chip-filter"
                aria-pressed={language === opt.code}
                onClick={() => handleLanguageChange(opt.code)}
              >
                {opt.label}
                {opt.code !== 'all' && <span className="chip-code"> {opt.code}</span>}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Filter this page by name or abbreviation…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="bible-toggle">
            <input type="checkbox" checked={showUnlicensed} onChange={(e) => handleShowUnlicensed(e.target.checked)} />
            Show translations we have no license for
          </label>
        </div>

        <p className="muted-note">
          The catalog is filtered to one language at a time on purpose. YouVersion&rsquo;s language filter is
          first-match-wins rather than a union — passing several languages at once silently returns only the first one
          that matches anything, which is a common way for a translation to appear missing.
          {showUnlicensed
            ? ' Unlicensed rows are shown and cannot be enabled until their license is accepted.'
            : ' By default this shows only Bibles our app key is licensed for — switch the toggle above to see the rest of the platform.'}
        </p>

        {error && <p className="flash-err">{error}</p>}
        {loading && <p className="muted-note">Loading catalog…</p>}

        {!loading && !error && (
          <>
            <ul className="bible-catalog-list">
              {visible.map((item) => {
                const checked = enabledIds.includes(item.id);
                const verdict = assessPublicDomain(item, jurisdiction);
                const lic = licenseFor(item.id);
                return (
                  <li
                    key={item.id}
                    className={`bible-catalog-row${checked ? ' is-enabled' : ''}${item.licensed ? '' : ' is-unlicensed'}`}
                  >
                    <label>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(item)}
                        disabled={!item.licensed && !checked}
                      />
                      <span className="bible-catalog-name">{item.name}</span>
                      <span className="bible-catalog-meta">
                        {item.abbreviation} · {languageLabel(item.language)} · #{item.id}
                      </span>
                    </label>
                    <span className="bible-badge-row">
                      <PdBadge status={verdict.status} title={verdict.reason} />
                      {!item.licensed && (
                        <span
                          className="pd-badge pd-warn"
                          title={
                            lic
                              ? `Covered by "${lic.name}", which has not been accepted. Accept it in the YouVersion developer dashboard to enable this translation.`
                              : 'Our app key holds no license covering this Bible, so its text cannot be fetched.'
                          }
                        >
                          Not licensed
                        </span>
                      )}
                      {verdict.entry?.note && (
                        <span className="pd-badge pd-info" title={verdict.entry.note}>
                          Note
                        </span>
                      )}
                    </span>
                    {item.copyright && <span className="bible-catalog-copyright">{item.copyright}</span>}
                  </li>
                );
              })}
            </ul>
            {visible.length === 0 && <p className="muted-note">No translations match.</p>}

            <div className="bible-catalog-pager">
              <span className="muted-note">
                {page?.total ?? 0} translations in this language
                {unlicensedOnPage > 0 ? ` · ${unlicensedOnPage} unlicensed on this page` : ''}
                {page?.nextPageToken ? ' (paginated)' : ''}
              </span>
              <span>
                <button className="btn-ghost" onClick={() => setPageToken(undefined)} disabled={!pageToken}>
                  ← First page
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => setPageToken(page?.nextPageToken ?? undefined)}
                  disabled={!page?.nextPageToken}
                >
                  Next page →
                </button>
              </span>
            </div>
          </>
        )}
      </section>

      <section className="card">
        <header className="config-card-header">
          <span className="config-label">
            Known public-domain translations{language !== 'all' ? ` — ${languageLabel(language)}` : ''}
          </span>
        </header>
        <p className="muted-note">
          A curated reference of translations whose copyright position is known, evaluated for {jur.name}. Use it to
          decide what to search for in the catalog above. Entries that are <em>not</em> free are listed too, because
          several of them are widely assumed to be.
        </p>
        {curatedForLanguage.length === 0 ? (
          <p className="muted-note">Nothing curated for this language yet.</p>
        ) : (
          <ul className="bible-reference-list">
            {curatedForLanguage.map((t) => {
              const verdict = assessPublicDomain(
                { abbreviation: t.aliases[0], language: t.language, copyright: null },
                jurisdiction
              );
              return (
                <li key={`${t.language}-${t.title}`} className="bible-reference-row">
                  <PdBadge status={verdict.status} title={verdict.reason} />
                  <span className="bible-reference-title">
                    {t.title}
                    <span className="bible-enabled-meta"> {t.aliases.join(' / ')}</span>
                  </span>
                  <span className="muted-note">{t.note ?? verdict.reason}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
