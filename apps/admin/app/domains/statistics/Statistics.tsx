'use client';

import { useEffect, useState } from 'react';
import BarChart from '../../components/BarChart';
import HBarChart from '../../components/HBarChart';
import { fmtSize } from '../../lib/format';
import { fetchStatisticsData } from './repository';
import type { StatisticsData } from './repository';

function RoadmapBadge() {
  return (
    <span className="info-badge" title="Collected once usage tracking ships — see issue #109">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </span>
  );
}

export default function Statistics() {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatisticsData()
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="state-error">{error}</div>;
  if (!data) return <div className="state-loading">Loading…</div>;

  return (
    <>
      <div className="page-header">
        <h1>Statistics</h1>
      </div>

      <div className="dashboard-grid-2">
        <div className="card">
          <div className="card-h">
            <h3>Audience — signups per month</h3>
          </div>
          <div className="stat-mini">
            <div>
              <b>{data.audience.total}</b>
              <span>total</span>
            </div>
            <div>
              <b>{data.audience.confirmed}</b>
              <span>confirmed</span>
            </div>
            <div>
              <b>{data.audience.pending}</b>
              <span>pending</span>
            </div>
            <div>
              <b>{data.audience.byLanguage.map((l) => l.count).join(' / ') || '—'}</b>
              <span>{data.audience.byLanguage.map((l) => l.language.toUpperCase()).join(' / ') || 'by language'}</span>
            </div>
          </div>
          <BarChart values={data.audience.monthly} labels={data.monthLabels} />
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Content — posts per month</h3>
          </div>
          <div className="stat-mini">
            <div>
              <b>{data.content.published}</b>
              <span>published</span>
            </div>
            <div>
              <b>{data.content.drafts}</b>
              <span>drafts</span>
            </div>
            <div>
              <b>{data.content.featured}</b>
              <span>featured</span>
            </div>
            <div>
              <b>{data.content.withVideo}</b>
              <span>with video</span>
            </div>
          </div>
          <BarChart values={data.content.monthly} labels={data.monthLabels} />
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Songbook — songs per book</h3>
          </div>
          <HBarChart rows={data.songbooks.map((b) => ({ label: b.title, value: b.count }))} />
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Media — uploads per month</h3>
          </div>
          <div className="stat-mini">
            <div>
              <b>{data.media.total}</b>
              <span>images</span>
            </div>
            <div>
              <b>{fmtSize(data.media.totalBytes)}</b>
              <span>storage</span>
            </div>
          </div>
          <BarChart values={data.media.monthly} labels={data.monthLabels} />
        </div>

        <div className="card card--roadmap">
          <div className="card-h">
            <h3>Top 10 songs</h3>
            <RoadmapBadge />
          </div>
          <div className="state-empty">Requires usage tracking — planned, not yet collected.</div>
        </div>

        <div className="card card--roadmap">
          <div className="card-h">
            <h3>Usage by language</h3>
            <RoadmapBadge />
          </div>
          <div className="state-empty">Requires usage tracking — planned, not yet collected.</div>
        </div>
      </div>
    </>
  );
}
