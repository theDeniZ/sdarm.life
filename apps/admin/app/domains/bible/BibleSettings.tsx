'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BibleAdminTranslationDto } from '@sdarm/types';
import ConfirmDialog from '../../components/ConfirmDialog';
import LicenseEditor from './LicenseEditor';
import {
  createYouVersionRecord,
  fetchAllowlist,
  fetchCatalog,
  fetchLibrary,
  fetchLicenses,
  patchTranslation,
  saveAllowlist,
  takedown,
} from './repository';
import {
  BASIS_LABEL,
  hasRecord,
  LANGUAGE_OPTIONS,
  SOURCE_LABEL,
  SOURCE_NOTE,
  type BibleCatalogEntry,
  type BibleLicense,
  type CatalogPage,
  type LibraryRow,
  type TranslationPatch,
} from './types';
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

function rowLabel(row: LibraryRow): string {
  return hasRecord(row) ? row.name : row.id;
}

type LibraryRowViewProps = {
  row: LibraryRow;
  enabled: boolean;
  rank?: number;
  rankTotal?: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onEnable?: () => void;
  onDisable?: () => void;
  onTakedown?: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
  onSaveLicense?: (patch: TranslationPatch) => Promise<void>;
};

function LibraryRowView({
  row,
  enabled,
  rank,
  rankTotal,
  onMoveUp,
  onMoveDown,
  onEnable,
  onDisable,
  onTakedown,
  expanded,
  onToggleExpand,
  onSaveLicense,
}: LibraryRowViewProps) {
  if (!hasRecord(row)) {
    return (
      <li className="bible-enabled-row bible-row-orphan">
        <div className="bible-library-main">
          {rank !== undefined && <span className="bible-enabled-rank">{rank}</span>}
          <span className="bible-enabled-name">
            {row.id}
            <span className="bible-enabled-meta">
              {' '}
              No library record for this id — it was likely withdrawn, or is a stale numeric id from before self-hosting
              existed.
            </span>
          </span>
          <span className="bible-enabled-actions">
            {rank !== undefined && rankTotal !== undefined && (
              <>
                <button className="btn-ghost" onClick={onMoveUp} disabled={rank === 1} aria-label="Move up">
                  ↑
                </button>
                <button className="btn-ghost" onClick={onMoveDown} disabled={rank === rankTotal} aria-label="Move down">
                  ↓
                </button>
              </>
            )}
            <button className="btn-ghost" onClick={onDisable}>
              Remove from order
            </button>
            {onTakedown && (
              <button className="btn-danger" onClick={onTakedown}>
                Remove now
              </button>
            )}
          </span>
        </div>
      </li>
    );
  }

  const t = row;

  return (
    <li className={`bible-enabled-row${expanded ? ' is-expanded' : ''}`}>
      <div className="bible-library-main">
        {rank !== undefined ? (
          <span className="bible-enabled-rank">{rank}</span>
        ) : (
          <button className="btn-ghost btn-sm" onClick={onEnable}>
            Enable
          </button>
        )}
        <span className="bible-enabled-name">
          {t.name}
          <span className="bible-enabled-meta">
            {' '}
            {t.abbreviation} · {languageLabel(t.language)}
            {t.year ? ` · ${t.year}` : ''}
          </span>
          <span className="bible-badge-row">
            <span
              className={`pd-badge ${t.source === 'local' ? 'pd-public' : 'pd-warn'}`}
              title={SOURCE_NOTE[t.source]}
            >
              {SOURCE_LABEL[t.source]}
            </span>
            <span className="pd-badge pd-info" title={`License basis: ${BASIS_LABEL[t.license.basis]}`}>
              {BASIS_LABEL[t.license.basis]}
            </span>
          </span>
        </span>
        <span className="bible-enabled-actions">
          {enabled && rank !== undefined && rankTotal !== undefined && (
            <>
              <button className="btn-ghost" onClick={onMoveUp} disabled={rank === 1} aria-label="Move up">
                ↑
              </button>
              <button className="btn-ghost" onClick={onMoveDown} disabled={rank === rankTotal} aria-label="Move down">
                ↓
              </button>
            </>
          )}
          <button className="btn-ghost" onClick={onToggleExpand}>
            {expanded ? 'Hide license' : 'Edit license'}
          </button>
          {enabled && (
            <button className="btn-ghost" onClick={onDisable}>
              Disable
            </button>
          )}
          {enabled && onTakedown && (
            <button className="btn-danger" onClick={onTakedown}>
              Remove now
            </button>
          )}
        </span>
      </div>

      {t.source === 'local' && (
        <div className="bible-status-row">
          <span className="bible-status-item">{t.status.verseCount.toLocaleString()} verses</span>
          <span className="bible-status-item">{t.status.bookCount} books</span>
          <span className="bible-status-item">
            {t.status.ingestedAt
              ? `Ingested ${new Date(t.status.ingestedAt).toLocaleDateString()}`
              : 'Not ingested yet'}
          </span>
          <span className="bible-status-item">{t.status.hasBundle ? 'Offline bundle ready' : 'No offline bundle'}</span>
          {t.lxxPsalms && <span className="bible-status-item">LXX Psalm numbering</span>}
        </div>
      )}

      {expanded && onSaveLicense && <LicenseEditor translation={t} onSave={onSaveLicense} />}
    </li>
  );
}

export default function BibleSettings() {
  const [language, setLanguage] = useState('deu');
  const [jurisdiction, setJurisdiction] = useState(DEFAULT_JURISDICTION);
  const [showUnlicensed, setShowUnlicensed] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState<CatalogPage | null>(null);
  const [pageToken, setPageToken] = useState<string | undefined>(undefined);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [library, setLibrary] = useState<BibleAdminTranslationDto[]>([]);
  const [allowlist, setAllowlist] = useState<string[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const [licenses, setLicenses] = useState<BibleLicense[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<Flash>(null);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [takedownTarget, setTakedownTarget] = useState<LibraryRow | null>(null);
  const [takingDown, setTakingDown] = useState(false);

  const reloadLibrary = useCallback(() => {
    setLibraryLoading(true);
    Promise.all([fetchLibrary(), fetchAllowlist()])
      .then(([lib, ids]) => {
        setLibrary(lib);
        setAllowlist(ids);
        setLibraryError(null);
        setDirty(false);
      })
      .catch(() => setLibraryError('Could not load the Bible library.'))
      .finally(() => setLibraryLoading(false));
  }, []);

  useEffect(() => {
    reloadLibrary();
    fetchLicenses()
      .then(setLicenses)
      .catch(() => {
        /* the licenses reference panel just stays empty */
      });
  }, [reloadLibrary]);

  const loadCatalog = useCallback((lang: string, token: string | undefined, all: boolean) => {
    setCatalogLoading(true);
    setCatalogError(null);
    fetchCatalog(lang, token, all)
      .then(setPage)
      .catch((e: Error) => setCatalogError(e.message))
      .finally(() => setCatalogLoading(false));
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

  const libraryById = useMemo(() => new Map(library.map((t) => [t.id, t] as const)), [library]);

  const enabledRows: LibraryRow[] = useMemo(
    () => allowlist.map((id) => libraryById.get(id) ?? { id }),
    [allowlist, libraryById]
  );

  const availableRows: BibleAdminTranslationDto[] = useMemo(
    () => library.filter((t) => !allowlist.includes(t.id)),
    [library, allowlist]
  );

  function enable(id: string) {
    setAllowlist((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setDirty(true);
  }

  function disable(id: string) {
    setAllowlist((prev) => prev.filter((x) => x !== id));
    setDirty(true);
  }

  function move(id: string, direction: -1 | 1) {
    setAllowlist((prev) => {
      const idx = prev.indexOf(id);
      const target = idx + direction;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
    setDirty(true);
  }

  async function handleSaveAllowlist() {
    setSaving(true);
    try {
      await saveAllowlist(allowlist);
      setDirty(false);
      setFlash({ kind: 'ok', message: 'Saved. Public pages update within a day, or immediately after a cache purge.' });
    } catch {
      setFlash({ kind: 'err', message: 'Could not save. Please retry.' });
    } finally {
      setSaving(false);
      setTimeout(() => setFlash(null), 4000);
    }
  }

  async function toggleCatalogEntry(entry: BibleCatalogEntry) {
    const id = `yv:${entry.id}`;
    if (allowlist.includes(id)) {
      disable(id);
      return;
    }
    if (libraryById.has(id)) {
      enable(id);
      return;
    }
    setCreatingId(id);
    try {
      const created = await createYouVersionRecord(entry);
      setLibrary((prev) => [...prev, created]);
      enable(id);
    } catch (e) {
      setFlash({
        kind: 'err',
        message: e instanceof Error ? e.message : 'Could not add this translation to the library.',
      });
      setTimeout(() => setFlash(null), 4000);
    } finally {
      setCreatingId(null);
    }
  }

  async function handleSaveLicense(row: BibleAdminTranslationDto, patch: TranslationPatch) {
    await patchTranslation(row.id, patch);
    reloadLibrary();
  }

  async function confirmTakedown() {
    if (!takedownTarget) return;
    setTakingDown(true);
    try {
      await takedown(takedownTarget.id);
      setFlash({
        kind: 'ok',
        message: `Removed “${rowLabel(takedownTarget)}” and purged the edge cache for its URLs.`,
      });
      reloadLibrary();
    } catch (e) {
      setFlash({ kind: 'err', message: e instanceof Error ? e.message : 'Could not take this translation down.' });
    } finally {
      setTakingDown(false);
      setTakedownTarget(null);
      setTimeout(() => setFlash(null), 5000);
    }
  }

  /** The single license agreement that governs a YouVersion Bible, if we know of one. */
  const licenseFor = useCallback(
    (id: number): BibleLicense | null => licenses.find((l) => l.bibleIds.includes(id)) ?? null,
    [licenses]
  );

  const jur = getJurisdiction(jurisdiction);
  const curatedForLanguage = useMemo(() => pdTranslationsForLanguage(language), [language]);

  const visibleCatalog = (page?.items ?? []).filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.abbreviation.toLowerCase().includes(q) || String(item.id) === q;
  });

  const unlicensedOnPage = (page?.items ?? []).filter((i) => !i.licensed).length;

  return (
    <div className="bible-settings">
      <section className="card">
        <header className="config-card-header">
          <span className="config-label">Public now ({allowlist.length})</span>
          <button className="btn-primary" onClick={handleSaveAllowlist} disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save order'}
          </button>
        </header>
        <p className="muted-note">
          These are the translations visitors can read on treasures.sdarm.life/bible, in this order. The badge on each
          row says where the text actually comes from — <strong>{SOURCE_LABEL.local}</strong> rows never leave our
          infrastructure; <strong>{SOURCE_LABEL.youversion}</strong> rows are fetched from the YouVersion Platform API
          (Life.Church, USA) on every request. An operator must never be unsure which one a given row is.
        </p>

        {libraryLoading && <p className="muted-note">Loading the library…</p>}
        {libraryError && <p className="flash-err">{libraryError}</p>}

        {!libraryLoading && !libraryError && (
          <>
            {enabledRows.length === 0 ? (
              <p className="muted-note">Nothing public yet — enable a translation from the library below.</p>
            ) : (
              <ol className="bible-enabled-list">
                {enabledRows.map((row, i) => (
                  <LibraryRowView
                    key={row.id}
                    row={row}
                    enabled
                    rank={i + 1}
                    rankTotal={enabledRows.length}
                    onMoveUp={() => move(row.id, -1)}
                    onMoveDown={() => move(row.id, 1)}
                    onDisable={() => disable(row.id)}
                    onTakedown={() => setTakedownTarget(row)}
                    expanded={expandedId === row.id}
                    onToggleExpand={() => setExpandedId((cur) => (cur === row.id ? null : row.id))}
                    onSaveLicense={hasRecord(row) ? (patch) => handleSaveLicense(row, patch) : undefined}
                  />
                ))}
              </ol>
            )}
          </>
        )}

        {flash && <p className={flash.kind === 'ok' ? 'flash-ok' : 'flash-err'}>{flash.message}</p>}
      </section>

      <section className="card">
        <header className="config-card-header">
          <span className="config-label">In the library, not public ({availableRows.length})</span>
        </header>
        <p className="muted-note">
          Records that exist but are not on the public list — a locally ingested translation waiting to be published, or
          a YouVersion Bible added earlier and since disabled. Enabling one here adds it to the end of the public order
          above; nothing goes live until you also click &ldquo;Save order&rdquo;.
        </p>

        {!libraryLoading && !libraryError && (
          <>
            {availableRows.length === 0 ? (
              <p className="muted-note">Nothing waiting — every library record is public.</p>
            ) : (
              <ul className="bible-enabled-list">
                {availableRows.map((row) => (
                  <LibraryRowView
                    key={row.id}
                    row={row}
                    enabled={false}
                    onEnable={() => enable(row.id)}
                    expanded={expandedId === row.id}
                    onToggleExpand={() => setExpandedId((cur) => (cur === row.id ? null : row.id))}
                    onSaveLicense={(patch) => handleSaveLicense(row, patch)}
                  />
                ))}
              </ul>
            )}
          </>
        )}
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
          that matches anything, which is a common way for a translation to appear missing. Picking a translation here
          creates its library record — it still needs a license record and does not go public until saved above.
          {showUnlicensed
            ? ' Unlicensed rows are shown and cannot be enabled until their license is accepted.'
            : ' By default this shows only Bibles our app key is licensed for — switch the toggle above to see the rest of the platform.'}
        </p>

        {catalogError && <p className="flash-err">{catalogError}</p>}
        {catalogLoading && <p className="muted-note">Loading catalog…</p>}

        {!catalogLoading && !catalogError && (
          <>
            <ul className="bible-catalog-list">
              {visibleCatalog.map((item) => {
                const id = `yv:${item.id}`;
                const checked = allowlist.includes(id);
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
                        onChange={() => toggleCatalogEntry(item)}
                        disabled={(!item.licensed && !checked) || creatingId === id}
                      />
                      <span className="bible-catalog-name">{item.name}</span>
                      <span className="bible-catalog-meta">
                        {item.abbreviation} · {languageLabel(item.language)} · #{item.id}
                        {creatingId === id ? ' · adding…' : ''}
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
            {visibleCatalog.length === 0 && <p className="muted-note">No translations match.</p>}

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

      {takedownTarget && (
        <ConfirmDialog
          title="Remove this translation now?"
          danger
          confirmLabel={takingDown ? 'Removing…' : 'Remove & purge cache'}
          message={
            <>
              <p>
                This removes <strong>{rowLabel(takedownTarget)}</strong> from the public list and strands every cached
                chapter and parallel response on api.sdarm.life — visitors stop seeing it within about a minute, rather
                than up to 24 hours later, which is all a plain &ldquo;Disable&rdquo; + save would do.
              </p>
              <p>
                It cannot reach a copy already sitting in apps/treasures&rsquo; own Next Data Cache, or a copy a visitor
                already saved as an offline bundle. Those clear only when that cache window ends or the device deletes
                the file.
              </p>
            </>
          }
          onConfirm={confirmTakedown}
          onCancel={() => setTakedownTarget(null)}
        />
      )}
    </div>
  );
}
