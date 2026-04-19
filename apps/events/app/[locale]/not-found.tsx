export const runtime = 'edge';

import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

export default async function NotFound() {
  let locale = 'de';
  try {
    locale = await getLocale();
  } catch {
    // keep default
  }
  const t = await getTranslations({ locale, namespace: 'common.notFound' });
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '2rem' }}
    >
      <section style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', margin: '0 0 1rem 0', color: '#c0392b' }}>404</h1>
        <h2 style={{ fontSize: '2rem', margin: '0 0 1rem 0' }}>
          {t.rich('title', { em: (chunks) => <em>{chunks}</em> })}
        </h2>
        <p style={{ fontSize: '1.1rem', color: 'var(--muted)', margin: '1rem 0 2rem 0' }}>{t('backPrompt')}</p>
        <Link
          href={`/${locale}`}
          style={{
            display: 'inline-block',
            marginTop: '1rem',
            padding: '0.75rem 2rem',
            background: 'var(--gold)',
            color: 'var(--dark)',
            textDecoration: 'none',
            fontWeight: 600,
            letterSpacing: '0.05em',
          }}
        >
          {t('homeLink')}
        </Link>
      </section>
    </div>
  );
}
