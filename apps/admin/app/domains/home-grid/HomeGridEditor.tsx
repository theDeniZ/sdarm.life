'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { defaultGridConfig, parseGridConfig } from '@sdarm/types';
import type { GridBlockConfig, GridBlockId, GridScrim, GridTextColor, HomeGridConfig } from '@sdarm/types';
import ImagePicker from '../images/ImagePicker';
import { measureLuminance } from './luminance';
import { fetchGridConfigRaw, saveGridConfig, uploadImage } from './repository';

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://sdarm.life';

/** What each block is, and what an editor cannot change about it. */
const BLOCKS: { id: GridBlockId; name: string; slot: string; note: string }[] = [
  {
    id: 'plan',
    name: 'Reading plan',
    slot: 'Column 1 · 724px',
    note: 'The only card that sends visitors off-site. Ships with its own photo.',
  },
  {
    id: 'verse',
    name: 'Verse of the hour',
    slot: 'Column 2 · 420px',
    note: 'Verse and reference rotate hourly and cannot be typed here. Clicking always opens the share dialog, so it has no link of its own.',
  },
  { id: 'invite', name: 'Invitation', slot: 'Column 2 · 280px', note: 'Leads to Kontakt by default.' },
  {
    id: 'book',
    name: 'Latest book',
    slot: 'Column 3 · 350px',
    note: 'Title comes from the treasures API unless you override it here.',
  },
  { id: 'faith', name: 'Points of faith', slot: 'Column 3 · 350px', note: 'Leads to the Glauben page by default.' },
];

const POSITIONS = [
  ['0% 0%', '50% 0%', '100% 0%'],
  ['0% 50%', '50% 50%', '100% 50%'],
  ['0% 100%', '50% 100%', '100% 100%'],
];

const SCRIMS: { value: GridScrim; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'strong', label: 'Strong' },
];

const TEXT_COLORS: { value: GridTextColor; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

type Status = { kind: 'idle' | 'saving' | 'saved' | 'error'; message?: string };

export default function HomeGridEditor() {
  const [config, setConfig] = useState<HomeGridConfig | null>(null);
  const [applied, setApplied] = useState<HomeGridConfig | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [open, setOpen] = useState<GridBlockId | null>('plan');

  const [lang, setLang] = useState<'de' | 'en'>('de');
  const [themes, setThemes] = useState<'dark' | 'light' | 'both'>('both');
  const [width, setWidth] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  useEffect(() => {
    fetchGridConfigRaw()
      .then((raw) => {
        const parsed = parseGridConfig(raw);
        setConfig(parsed);
        setApplied(parsed);
      })
      .catch(() => setStatus({ kind: 'error', message: 'Could not load the current settings.' }));
  }, []);

  const dirty = useMemo(
    () => !!config && !!applied && JSON.stringify(config) !== JSON.stringify(applied),
    [config, applied]
  );

  const patchBlock = useCallback((id: GridBlockId, patch: Partial<GridBlockConfig>) => {
    setConfig((c) => (c ? { ...c, blocks: { ...c.blocks, [id]: { ...c.blocks[id], ...patch } } } : c));
  }, []);

  const patchText = useCallback(
    (id: GridBlockId, field: 'label' | 'title' | 'button', value: string) => {
      setConfig((c) =>
        c
          ? {
              ...c,
              blocks: {
                ...c.blocks,
                [id]: {
                  ...c.blocks[id],
                  text: { ...c.blocks[id].text, [lang]: { ...c.blocks[id].text[lang], [field]: value } },
                },
              },
            }
          : c
      );
    },
    [lang]
  );

  const patchImage = useCallback((id: GridBlockId, patch: Partial<GridBlockConfig['image']>) => {
    setConfig((c) =>
      c ? { ...c, blocks: { ...c.blocks, [id]: { ...c.blocks[id], image: { ...c.blocks[id].image, ...patch } } } } : c
    );
  }, []);

  async function apply() {
    if (!config) return;
    setStatus({ kind: 'saving' });
    try {
      await saveGridConfig(config);
      setApplied(config);
      setStatus({ kind: 'saved' });
      setTimeout(() => setStatus({ kind: 'idle' }), 2500);
    } catch {
      setStatus({ kind: 'error', message: 'Saving failed. Nothing was changed on the site.' });
    }
  }

  if (!config) {
    return <p className="muted">{status.kind === 'error' ? status.message : 'Loading…'}</p>;
  }

  const previewThemes: ('dark' | 'light')[] = themes === 'both' ? ['dark', 'light'] : [themes];

  return (
    <div className="grid-editor">
      <div className="grid-editor__panel">
        <p className="muted grid-editor__hint">
          Leave a text field empty to use the translation from the message files. Anything you type here overrides it
          for that language only.
        </p>

        {BLOCKS.map((meta) => {
          const b = config.blocks[meta.id];
          const isOpen = open === meta.id;
          return (
            <section key={meta.id} className={`card grid-editor__block${b.visible ? '' : ' is-hidden'}`}>
              <button
                type="button"
                className="grid-editor__block-head"
                onClick={() => setOpen(isOpen ? null : meta.id)}
                aria-expanded={isOpen}
              >
                <span>
                  <strong>{meta.name}</strong>
                  <span className="muted grid-editor__slot">{meta.slot}</span>
                </span>
                <span className="muted">{isOpen ? '−' : '+'}</span>
              </button>

              {isOpen && (
                <div className="grid-editor__block-body">
                  <p className="muted grid-editor__hint">{meta.note}</p>

                  <div className="grid-editor__row">
                    <Toggle
                      label="Show this block"
                      checked={b.visible}
                      onChange={(v) => patchBlock(meta.id, { visible: v })}
                    />
                    {meta.id !== 'verse' && (
                      <Toggle
                        label="Block is clickable"
                        checked={b.clickable}
                        onChange={(v) => patchBlock(meta.id, { clickable: v })}
                      />
                    )}
                  </div>

                  {meta.id !== 'verse' && b.clickable && (
                    <>
                      <Field
                        label="Link"
                        value={b.href ?? ''}
                        placeholder="Leave empty to keep the built-in destination"
                        onChange={(v) => patchBlock(meta.id, { href: v.trim() === '' ? null : v })}
                      />
                      <Toggle
                        label="Open in a new tab"
                        checked={b.newTab}
                        onChange={(v) => patchBlock(meta.id, { newTab: v })}
                      />
                    </>
                  )}

                  <div className="grid-editor__row">
                    <Toggle
                      label="Show label"
                      checked={b.showLabel}
                      onChange={(v) => patchBlock(meta.id, { showLabel: v })}
                    />
                    {meta.id !== 'verse' && (
                      <Toggle
                        label="Show button"
                        checked={b.showButton}
                        onChange={(v) => patchBlock(meta.id, { showButton: v })}
                      />
                    )}
                  </div>

                  {meta.id !== 'verse' && (
                    <>
                      {b.showLabel && (
                        <Field
                          label={`Label (${lang.toUpperCase()})`}
                          value={b.text[lang].label}
                          placeholder="From the translation"
                          onChange={(v) => patchText(meta.id, 'label', v)}
                        />
                      )}
                      <Field
                        label={`Headline (${lang.toUpperCase()})`}
                        value={b.text[lang].title}
                        placeholder="From the translation"
                        textarea
                        onChange={(v) => patchText(meta.id, 'title', v)}
                      />
                      {b.showButton && (
                        <Field
                          label={`Button text (${lang.toUpperCase()})`}
                          value={b.text[lang].button}
                          placeholder="From the translation"
                          onChange={(v) => patchText(meta.id, 'button', v)}
                        />
                      )}
                    </>
                  )}

                  <ImageSettings block={b} onPatch={(patch) => patchImage(meta.id, patch)} />
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="grid-editor__preview">
        <div className="grid-editor__toolbar">
          <Segment
            value={lang}
            onChange={(v) => setLang(v as 'de' | 'en')}
            options={[
              { value: 'de', label: 'DE' },
              { value: 'en', label: 'EN' },
            ]}
          />
          <Segment
            value={themes}
            onChange={(v) => setThemes(v as typeof themes)}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
              { value: 'both', label: 'Both' },
            ]}
          />
          <Segment
            value={width}
            onChange={(v) => setWidth(v as typeof width)}
            options={[
              { value: 'desktop', label: 'Desktop' },
              { value: 'tablet', label: 'Tablet' },
              { value: 'mobile', label: 'Mobile' },
            ]}
          />
          <span className="grid-editor__spacer" />
          {dirty && <span className="chip">Unapplied changes</span>}
          {status.kind === 'saved' && <span className="chip badge-active">Applied</span>}
          {status.kind === 'error' && <span className="chip badge-revoked">{status.message}</span>}
          <button type="button" className="btn-ghost" disabled={!dirty} onClick={() => setConfig(applied)}>
            Discard
          </button>
          <button type="button" className="btn-ghost" onClick={() => setConfig(defaultGridConfig())}>
            Reset to defaults
          </button>
          <button type="button" className="btn-primary" disabled={!dirty || status.kind === 'saving'} onClick={apply}>
            {status.kind === 'saving' ? 'Applying…' : 'Apply'}
          </button>
        </div>

        <div className={`grid-editor__frames grid-editor__frames--${previewThemes.length > 1 ? 'split' : 'single'}`}>
          {previewThemes.map((theme) => (
            <PreviewFrame key={theme} config={config} lang={lang} theme={theme} width={width} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * The preview is the live site in an iframe, not a rebuilt copy of the card.
 * The draft config goes in over postMessage, so what an editor checks before
 * pressing Apply is the same component the public page renders — a second
 * implementation would drift the first time either side changed.
 */
function PreviewFrame({
  config,
  lang,
  theme,
  width,
}: {
  config: HomeGridConfig;
  lang: 'de' | 'en';
  theme: 'dark' | 'light';
  width: 'desktop' | 'tablet' | 'mobile';
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  const src = `${WEB_URL}/${lang}?gridPreview=1&theme=${theme}`;

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if ((e.data as { type?: string })?.type !== 'sdarm:grid-preview-ready') return;
      if (e.source !== ref.current?.contentWindow) return;
      setReady(true);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    ref.current?.contentWindow?.postMessage({ type: 'sdarm:grid-preview', config }, '*');
  }, [config, ready]);

  const frameWidth = width === 'desktop' ? 1280 : width === 'tablet' ? 900 : 390;
  // Real device heights. The mobile frame used to be 1900px tall, which is no
  // phone that exists — and every `vh` rule on the page then resolved against
  // it, so the preview showed a hero and a spacing nobody would ever get. A
  // preview whose viewport is invented previews an invented layout.
  const frameHeight = width === 'mobile' ? 844 : width === 'tablet' ? 1180 : 900;
  // Scaled down so a 1280px page fits the panel while keeping the real
  // breakpoints — resizing the iframe instead would change which media query
  // applies and preview the wrong layout.
  const scale = width === 'desktop' ? 0.42 : width === 'tablet' ? 0.55 : 0.85;

  return (
    <div className="grid-editor__frame">
      <div className="grid-editor__frame-label">
        {theme === 'dark' ? 'Dark' : 'Light'} · {frameWidth}px
      </div>
      {/* transform: scale() shrinks what is painted but not the layout box, so
          the wrapper carries the scaled size explicitly or it overflows. */}
      <div
        className="grid-editor__frame-view"
        style={{ width: frameWidth * scale, height: frameHeight * scale, maxWidth: '100%' }}
      >
        <iframe
          ref={ref}
          title={`Preview ${theme}`}
          src={src}
          style={{
            width: frameWidth,
            height: frameHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            border: 0,
          }}
        />
      </div>
      {!ready && <p className="muted grid-editor__hint">Connecting to {WEB_URL}…</p>}
    </div>
  );
}

function ImageSettings({
  block,
  onPatch,
}: {
  block: GridBlockConfig;
  onPatch: (p: Partial<GridBlockConfig['image']>) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      // Measure before upload: the luminance has to come from the local file,
      // because reading pixels back from the CDN needs cross-origin permission.
      const luminance = await measureLuminance(file);
      const key = await uploadImage(file);
      onPatch({ key, luminance, enabled: true });
    } catch {
      setError('Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  const auto = block.image.luminance === null ? null : block.image.luminance >= 0.5 ? 'dark' : 'light';

  return (
    <div className="grid-editor__image">
      <h3 className="grid-editor__sub">Image</h3>

      <label className="grid-editor__upload">
        <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} disabled={busy} />
        <span>{busy ? 'Uploading…' : 'Upload a new image'}</span>
      </label>
      {error && <p className="grid-editor__error">{error}</p>}

      <p className="muted grid-editor__hint">…or pick one already in the library:</p>
      <ImagePicker value={block.image.key} onChange={(key) => onPatch({ key, luminance: null })} />

      {block.image.key && (
        <>
          <Toggle
            label="Use this image on the card"
            checked={block.image.enabled}
            onChange={(v) => onPatch({ enabled: v })}
          />

          <h4 className="grid-editor__sub">Crop</h4>
          <p className="muted grid-editor__hint">
            The card crops the image. Pick the part that must stay in frame — a face at the top of a portrait is lost
            with the default centre crop.
          </p>
          <div className="grid-editor__positions">
            {POSITIONS.flat().map((pos) => (
              <button
                key={pos}
                type="button"
                className={`grid-editor__pos${block.image.position === pos ? ' is-active' : ''}`}
                onClick={() => onPatch({ position: pos })}
                aria-label={`Focus ${pos}`}
              />
            ))}
          </div>

          <h4 className="grid-editor__sub">Readability</h4>
          <Select
            label="Darkening behind the text"
            value={block.image.scrim}
            options={SCRIMS}
            onChange={(v) => onPatch({ scrim: v as GridScrim })}
          />
          <Select
            label="Text colour"
            value={block.image.textColor}
            options={TEXT_COLORS}
            onChange={(v) => onPatch({ textColor: v as GridTextColor })}
          />
          <p className="muted grid-editor__hint">
            {auto === null
              ? 'Auto has no measurement for this image — it was picked from the library rather than uploaded here, so it falls back to light text. Upload it again to measure, or set the colour by hand.'
              : `Measured brightness of the lower third: ${Math.round((block.image.luminance ?? 0) * 100)}%. Auto would use ${auto} text.`}
          </p>
        </>
      )}
    </div>
  );
}

/* ── small controls ─────────────────────────────────────────────────────── */

function Field({
  label,
  value,
  placeholder,
  textarea,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  textarea?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="grid-editor__field">
      <span className="grid-editor__field-label">{label}</span>
      {textarea ? (
        <textarea rows={2} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="checkbox-row">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="grid-editor__field">
      <span className="grid-editor__field-label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Segment({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid-editor__segment">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? 'is-active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
