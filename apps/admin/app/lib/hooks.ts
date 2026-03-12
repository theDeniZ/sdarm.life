'use client';

import { useEffect, useState } from 'react';
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
