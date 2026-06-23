import { useEffect, useState } from 'react';

/**
 * Generic data-fetch hook for the SRD IPC bridge. Re-runs when the query
 * changes (compared by value), cancels stale results, and tracks loading.
 */
export function useSrdQuery<Q, R>(fetcher: (q: Q) => Promise<R[]>, query: Q) {
  const [data, setData] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcher(query).then((rows) => {
      if (!cancelled) {
        setData(rows);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(query)]);

  return { data, loading };
}
