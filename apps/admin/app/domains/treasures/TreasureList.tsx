'use client';

import { useState } from 'react';
import Link from 'next/link';
import Pagination from '../../components/Pagination';
import { usePaginatedList } from '../../lib/hooks';
import { fetchTreasures, deleteTreasure, swapSortOrder, swapWithSortOrder, LIMIT } from './repository';
import type { TreasureListItem } from './types';

export default function TreasureList() {
  const { items, total, page, loading, setPage, reload } = usePaginatedList<TreasureListItem>(fetchTreasures);
  const [moving, setMoving] = useState<number | null>(null);
  const [swapInputs, setSwapInputs] = useState<Record<number, string>>({});
  const [swapErrors, setSwapErrors] = useState<Record<number, string>>({});

  async function handleMove(index: number, direction: 'up' | 'down') {
    const target = direction === 'up' ? index - 1 : index + 1;
    const a = items[index];
    const b = items[target];
    setMoving(a.id);
    try {
      await swapSortOrder(a, b);
      reload();
    } finally {
      setMoving(null);
    }
  }

  async function handleSwapWith(t: TreasureListItem) {
    const raw = swapInputs[t.id]?.trim();
    const target = Number(raw);
    if (!raw || isNaN(target) || target === t.sortOrder) return;
    setMoving(t.id);
    setSwapErrors((e) => ({ ...e, [t.id]: '' }));
    try {
      await swapWithSortOrder(t, target);
      setSwapInputs((s) => ({ ...s, [t.id]: '' }));
      reload();
    } catch (err) {
      setSwapErrors((e) => ({ ...e, [t.id]: String(err) }));
    } finally {
      setMoving(null);
    }
  }

  async function handleDelete(t: TreasureListItem) {
    if (!confirm(`Delete "${t.title}"?`)) return;
    await deleteTreasure(t.id);
    reload();
  }

  if (loading) return <div className="state-loading">Loading…</div>;
  if (items.length === 0) return <div className="state-empty">No treasures yet.</div>;

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 140 }}>Order</th>
              <th>Title</th>
              <th>Author</th>
              <th>Lang</th>
              <th>Price</th>
              <th>EPUB</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t, i) => (
              <tr key={t.id}>
                <td>
                  <div className="td-reorder">
                    <button
                      className="btn-reorder"
                      disabled={i === 0 || moving !== null}
                      onClick={() => handleMove(i, 'up')}
                      title="Move up"
                    >↑</button>
                    <span className="td-order-num">{t.sortOrder}</span>
                    <button
                      className="btn-reorder"
                      disabled={i === items.length - 1 || moving !== null}
                      onClick={() => handleMove(i, 'down')}
                      title="Move down"
                    >↓</button>
                    <form
                      className="swap-form"
                      onSubmit={(e) => { e.preventDefault(); handleSwapWith(t); }}
                    >
                      <input
                        className="swap-input"
                        type="number"
                        min={1}
                        placeholder="⇄"
                        value={swapInputs[t.id] ?? ''}
                        disabled={moving !== null}
                        title="Swap with sort order…"
                        onChange={(e) => setSwapInputs((s) => ({ ...s, [t.id]: e.target.value }))}
                      />
                    </form>
                  </div>
                  {swapErrors[t.id] && (
                    <div className="swap-error">{swapErrors[t.id]}</div>
                  )}
                </td>
                <td><div className="td-title">{t.title}</div></td>
                <td>{t.author ?? '—'}</td>
                <td>{t.language}</td>
                <td>{t.isFree ? <span className="badge badge-free">Free</span> : (t.price ?? '—')}</td>
                <td>{t.epubUrl ? '●' : ''}</td>
                <td>
                  <div className="td-actions">
                    <Link href={`/treasures/${t.id}`} className="btn-ghost">Edit</Link>
                    <button className="btn-danger" onClick={() => handleDelete(t)}>Delete</button>
                  </div>
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
