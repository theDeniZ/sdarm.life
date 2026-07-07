'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  open: boolean;
  onClose: () => void;
  apiUrl: string;
}

type Status = 'idle' | 'loading' | 'ok' | 'error';

const BOOKS_KEYS = ['wegZuChristus', 'grosserKampf', 'lebenJesu', 'bibel'] as const;

export default function BookRequestModal({ open, onClose, apiUrl }: Props) {
  const t = useTranslations('treasures.bookRequest');

  const [land, setLand] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [plz, setPlz] = useState('');
  const [city, setCity] = useState('');
  const [wish, setWish] = useState('');
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [bookError, setBookError] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const FOCUSABLE =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  // Focus management: capture trigger on open, focus first element, restore on close
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      const first = modalRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  // ESC to close + Tab focus trap
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const modal = modalRef.current;
      if (!modal) return;
      const focusable = Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  function toggleBook(key: string) {
    setSelectedBooks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setBookError(false);
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  function resetForm() {
    setLand('');
    setName('');
    setEmail('');
    setPhone('');
    setStreet('');
    setPlz('');
    setCity('');
    setWish('');
    setSelectedBooks(new Set());
    setConsent(false);
    setStatus('idle');
    setBookError(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedBooks.size === 0) {
      setBookError(true);
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch(`${apiUrl}/book-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          land,
          street,
          plz,
          city,
          books: [...selectedBooks].map((k) => t(`books.${k}` as Parameters<typeof t>[0])),
          wish: wish || undefined,
        }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      setStatus('ok');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="br-overlay" onClick={handleOverlayClick} role="presentation">
      <div className="br-modal" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="br-modal-title">
        <button className="br-close" onClick={handleClose} aria-label={t('closeAria')}>
          ✕
        </button>

        {status === 'ok' ? (
          <div className="br-success">
            <div className="br-success-icon">✓</div>
            <h2 className="br-success-title">{t('successTitle')}</h2>
            <p className="br-success-body">{t('successBody')}</p>
            <button className="br-submit" onClick={handleClose}>
              {t('successClose')}
            </button>
          </div>
        ) : (
          <div className="br-form-wrap">
            <div className="br-modal-header">
              <h2 className="br-modal-title" id="br-modal-title">
                {t('modalTitle')}
              </h2>
              <p className="br-modal-subtitle">{t('modalSubtitle')}</p>
            </div>

            <div className="br-notice">{t('notice')}</div>

            <form className="br-form" onSubmit={handleSubmit}>
              <div className="br-field">
                <label>
                  {t('fieldLand')} <span className="br-req">{t('required')}</span>
                </label>
                <select name="land" value={land} onChange={(e) => setLand(e.target.value)} required>
                  <option value="" disabled>
                    {t('landPlaceholder')}
                  </option>
                  <option value="DE">{t('landDe')}</option>
                  <option value="AT">{t('landAt')}</option>
                  <option value="CH">{t('landCh')}</option>
                </select>
              </div>

              <div className="br-field">
                <label>
                  {t('fieldName')} <span className="br-req">{t('required')}</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('namePlaceholder')}
                  required
                />
              </div>

              <div className="br-field">
                <label>
                  {t('fieldEmail')} <span className="br-req">{t('required')}</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  required
                />
              </div>

              <div className="br-field">
                <label>
                  {t('fieldPhone')} <span className="br-opt">({t('optional')})</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('phonePlaceholder')}
                />
              </div>

              <div className="br-field-row">
                <div className="br-field" style={{ flex: 2 }}>
                  <label>
                    {t('fieldStreet')} <span className="br-req">{t('required')}</span>
                  </label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder={t('streetPlaceholder')}
                    required
                  />
                </div>
                <div className="br-field" style={{ flex: 1 }}>
                  <label>
                    {t('fieldPlz')} <span className="br-req">{t('required')}</span>
                  </label>
                  <input
                    type="text"
                    value={plz}
                    onChange={(e) => setPlz(e.target.value)}
                    placeholder={t('plzPlaceholder')}
                    required
                  />
                </div>
              </div>

              <div className="br-field">
                <label>
                  {t('fieldCity')} <span className="br-req">{t('required')}</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t('cityPlaceholder')}
                  required
                />
              </div>

              <div className="br-divider" />

              <div className="br-field">
                <label>
                  {t('fieldBooks')} <span className="br-req">{t('required')}</span>
                </label>
                <div className="br-check-list">
                  {BOOKS_KEYS.map((key) => {
                    const label = t(`books.${key}` as Parameters<typeof t>[0]);
                    const checked = selectedBooks.has(key);
                    return (
                      <label
                        key={key}
                        className={`br-check-item${checked ? ' selected' : ''}`}
                        onClick={() => toggleBook(key)}
                      >
                        <span className="br-box">{checked ? '✓' : ''}</span>
                        {label}
                      </label>
                    );
                  })}
                </div>
                {bookError && <p className="br-book-error">{t('errorMinBook')}</p>}

                <div className="br-field" style={{ marginTop: 16, marginBottom: 0 }}>
                  <label>
                    {t('fieldWish')} <span className="br-opt">({t('optional')})</span>
                  </label>
                  <input
                    type="text"
                    value={wish}
                    onChange={(e) => setWish(e.target.value)}
                    placeholder={t('wishPlaceholder')}
                  />
                </div>
              </div>

              <div className="br-divider" />

              <div className="br-dsgvo-notice">
                <p className="br-dsgvo-notice__text">{t('dsgvoNotice')}</p>
              </div>

              <label className={`br-consent${consent ? ' selected' : ''}`} onClick={() => setConsent((v) => !v)}>
                <span className="br-box">{consent ? '✓' : ''}</span>
                <span>
                  {t('consent')}{' '}
                  <a
                    href="/de/datenschutz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="br-consent-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t('consentPrivacyLink')}
                  </a>
                  {'. '}
                  <span className="br-req">{t('required')}</span>
                </span>
                <input type="checkbox" checked={consent} onChange={() => {}} required style={{ display: 'none' }} />
              </label>

              {status === 'error' && <p className="br-book-error">{t('errorSubmit')}</p>}

              <button type="submit" className="br-submit" disabled={status === 'loading'} style={{ marginTop: 32 }}>
                {status === 'loading' ? '…' : t('submit')}
              </button>

              <p className="br-submit-note">{t('submitNote')}</p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
