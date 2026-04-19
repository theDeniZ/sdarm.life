import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ConnectedFooter } from '@sdarm/ui';

export const runtime = 'edge';

const API = process.env.API_URL ?? 'https://api.sdarm.life/api/v1';

export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('web.confirm');
  const { token } = await searchParams;

  if (!token) {
    return (
      <>
        <main className="page unsubscribe-page">
          <p>{t('invalidLink')}</p>
        </main>
        <ConnectedFooter locale={locale} />
      </>
    );
  }

  let message: string;
  try {
    const res = await fetch(`${API}/confirm?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as { status: 'confirmed' | 'already' };
      message = data.status === 'already' ? t('already') : t('success');
    } else {
      message = t('error');
    }
  } catch {
    message = t('error');
  }

  return (
    <>
      <main className="page unsubscribe-page">
        <p>{message}</p>
      </main>
      <ConnectedFooter locale={locale} />
    </>
  );
}
