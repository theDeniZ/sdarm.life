import { getTranslations, setRequestLocale } from 'next-intl/server';

export const runtime = 'edge';

const API = process.env.API_URL ?? 'https://api.sdarm.life/api/v1';

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('web.unsubscribe');
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="page unsubscribe-page">
        <p>{t('invalidLink')}</p>
      </main>
    );
  }

  let ok = false;
  try {
    const res = await fetch(`${API}/unsubscribe?token=${encodeURIComponent(token)}`, {
      cache: 'no-store',
    });
    ok = res.ok;
  } catch {
    // fall through to error state
  }

  return <main className="page unsubscribe-page">{ok ? <p>{t('success')}</p> : <p>{t('error')}</p>}</main>;
}
