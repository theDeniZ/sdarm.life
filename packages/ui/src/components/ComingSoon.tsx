'use client';

import Link from 'next/link';

interface ComingSoonProps {
  title: string;
  subtitle?: string;
}

export default function ComingSoon({ title, subtitle }: ComingSoonProps) {
  return (
    <div className="coming-soon">
      <div className="coming-soon-inner">
        <span className="coming-soon-eyebrow">Demnächst</span>
        <h1>{title}</h1>
        {subtitle && <p className="coming-soon-sub">{subtitle}</p>}
        <div className="coming-soon-line" />
      </div>
    </div>
  );
}
