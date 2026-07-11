'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sparkline from '../../components/Sparkline';
import { fmtDate, fmtSize } from '../../lib/format';
import { fetchDashboardData } from './repository';
import type { DashboardData } from './repository';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData()
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="state-error">{error}</div>;
  if (!data) return <div className="state-loading">Loading…</div>;

  const delta = data.posts.thisMonth - data.posts.lastMonth;

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="dashboard-grid-2">
        <div className="card">
          <div className="hero-stat-label">Content this month</div>
          <div className="hero-stat-value">
            {data.posts.thisMonth}
            {delta !== 0 && (
              <span className="hero-stat-delta">
                {delta > 0 ? '+' : ''}
                {delta}
              </span>
            )}
          </div>
          <div className="hero-stat-sub">
            posts published · {data.posts.featured} featured · {data.posts.withVideo} with video
          </div>
          <Sparkline values={data.posts.monthlyCounts} />
        </div>

        <div className="card compact-stats">
          <div className="compact-stat-row">
            <span className="csr-label">Subscribers</span>
            <span className="csr-value">{data.subscribers.total}</span>
            <span className="csr-sub">{data.subscribers.confirmed} confirmed</span>
          </div>
          <div className="compact-stat-row">
            <span className="csr-label">Songs</span>
            <span className="csr-value">{data.songs.total}</span>
            <span className="csr-sub">in {data.songs.songbookCount} songbooks</span>
          </div>
          <div className="compact-stat-row">
            <span className="csr-label">Treasures</span>
            <span className="csr-value">{data.treasures.total}</span>
            <span className="csr-sub">{data.treasures.free} free</span>
          </div>
          <div className="compact-stat-row">
            <span className="csr-label">Images</span>
            <span className="csr-value">{data.images.total}</span>
            <span className="csr-sub">{fmtSize(data.images.totalBytes)}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid-2">
        <div className="card">
          <div className="card-h">
            <h3>Latest posts</h3>
            <Link href="/posts" className="btn-ghost btn-sm">
              View all
            </Link>
          </div>
          {data.posts.latest.length === 0 ? (
            <div className="state-empty">No posts yet.</div>
          ) : (
            <div className="table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Published</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.posts.latest.map((post) => (
                    <tr key={post.id}>
                      <td>{post.title}</td>
                      <td>{fmtDate(post.publishedAt)}</td>
                      <td>
                        <span className={post.publishedAt ? 'badge badge-active' : 'badge badge-revoked'}>
                          {post.publishedAt ? 'Live' : 'Draft'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Latest subscribers</h3>
            <Link href="/subscribers" className="btn-ghost btn-sm">
              View all
            </Link>
          </div>
          {data.subscribers.latest.length === 0 ? (
            <div className="state-empty">No subscribers yet.</div>
          ) : (
            <div className="table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Lang</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.subscribers.latest.map((sub) => (
                    <tr key={sub.id}>
                      <td>{sub.email}</td>
                      <td>
                        <span className="chip">{sub.language.toUpperCase()}</span>
                      </td>
                      <td>
                        <span className={sub.confirmedAt ? 'badge badge-active' : 'badge badge-revoked'}>
                          {sub.confirmedAt ? 'Confirmed' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
