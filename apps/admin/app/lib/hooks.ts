'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ListResponse } from '@sdarm/types';

export function usePaginatedList<T>(fetcher: (page: number) => Promise<ListResponse<T>>, deps: unknown[] = []) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcher(page)
      .then(({ items, total }) => {
        if (!cancelled) {
          setItems(items);
          setTotal(total);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, tick, ...deps]);

  return {
    items,
    total,
    page,
    loading,
    setPage,
    reload: () => setTick((t) => t + 1),
  };
}

/**
 * Click handler for a table row that opens a record (`<tr className="row-link">`).
 *
 * The row is a large pointer target layered over the real `Edit` link, which
 * stays in the last cell as the keyboard and screen-reader path — a bare
 * onClick on a <tr> is reachable by neither. Clicks that start on anything
 * already interactive are ignored, so `Delete`, checkboxes and inline inputs
 * keep their own behaviour and never navigate; a cell marked
 * `data-no-row-link` (a cluster of small controls, where a near miss is
 * likely) is excluded the same way. A click that ends a text
 * selection is ignored too, so a title can still be copied out of the table.
 */
export function useRowLink() {
  const router = useRouter();
  return (href: string) => (e: React.MouseEvent<HTMLTableRowElement>) => {
    if ((e.target as HTMLElement).closest('a, button, input, select, textarea, label, [data-no-row-link]')) return;
    if (window.getSelection()?.toString()) return;
    if (e.metaKey || e.ctrlKey) {
      window.open(href, '_blank');
      return;
    }
    router.push(href);
  };
}
