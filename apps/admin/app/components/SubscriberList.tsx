'use client';

import { useEffect, useState } from 'react';
import Pagination from './Pagination';

const LIMIT = 20;

type Subscriber = {
  id: number;
  email: string;
  createdAt: string | null;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.sdarm.life';

function adminHeaders(): HeadersInit {
  return {
    'CF-Access-Client-Id': process.env.NEXT_PUBLIC_CF_CLIENT_ID ?? '',
    'CF-Access-Client-Secret': process.env.NEXT_PUBLIC_CF_CLIENT_SECRET ?? '',
  };
}

function fmtDate(ts: string | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function SubscriberList() {
  const [items, setItems] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(p: number) {
    setLoading(true);
    setError(null);
    try {
      const offset = (p - 1) * LIMIT;
      const res = await fetch(
        `${API}/api/v1/admin/subscribers?limit=${LIMIT}&offset=${offset}`,
        { headers: adminHeaders() },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { items: Subscriber[]; total: number };
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(page); }, [page]);

  async function remove(sub: Subscriber) {
    if (!confirm(`Remove ${sub.email}?`)) return;
    await fetch(`${API}/api/v1/admin/subscribers/${sub.id}`, {
      method: 'DELETE',
      headers: adminHeaders(),
    });
    load(page);
  }

  if (loading) return <div className="state-loading">Loading…</div>;
  if (error)   return <div className="state-error">{error}</div>;
  if (items.length === 0) return <div className="state-empty">No subscribers yet.</div>;

  return (
    <>
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Subscribed</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((sub) => (
            <tr key={sub.id}>
              <td>{sub.email}</td>
              <td>{fmtDate(sub.createdAt)}</td>
              <td>
                <button className="btn-danger" onClick={() => remove(sub)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
    </>
  );
}
