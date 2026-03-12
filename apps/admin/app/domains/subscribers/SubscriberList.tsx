'use client';

import Pagination from '../../components/Pagination';
import { usePaginatedList } from '../../lib/hooks';
import { fmtDate } from '../../lib/format';
import { fetchSubscribers, deleteSubscriber, LIMIT } from './repository';
import type { SubscriberListItem } from './types';

export default function SubscriberList() {
  const { items, total, page, loading, setPage, reload } = usePaginatedList<SubscriberListItem>(fetchSubscribers);

  async function handleRemove(sub: SubscriberListItem) {
    if (!confirm(`Remove ${sub.email}?`)) return;
    await deleteSubscriber(sub.id);
    reload();
  }

  if (loading) return <div className="state-loading">Loading…</div>;
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
                  <button className="btn-danger" onClick={() => handleRemove(sub)}>Remove</button>
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
