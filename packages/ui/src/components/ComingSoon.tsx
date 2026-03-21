'use client';

import { useTranslations } from 'next-intl';

interface ComingSoonProps {
  title: string;
  subtitle?: string;
}

export default function ComingSoon({ title, subtitle }: ComingSoonProps) {
  const t = useTranslations('common');
  return (
    <div className="coming-soon">
      <div className="coming-soon-inner">
        <span className="coming-soon-eyebrow">{t('comingSoon')}</span>
        <h1>{title}</h1>
        {subtitle && <p className="coming-soon-sub">{subtitle}</p>}
        <div className="coming-soon-line" />
      </div>
    </div>
  );
}
