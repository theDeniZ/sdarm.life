import { useTranslations } from 'next-intl';

export const runtime = 'edge';

export default function NotFound() {
  const t = useTranslations('common.notFound');
  return (
    <main className="page" style={{ textAlign: 'center' }}>
      <h1 className="page-title">404</h1>
      <p className="page-subtitle">{t('description')}</p>
    </main>
  );
}
