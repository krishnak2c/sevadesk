import { useCallback, useEffect, useRef, useState } from 'react';
import { listRequests } from '../../api/requests';

/**
 * Owns the list screen's URL-independent query state and its fetch cycle.
 *
 * Three deliberate choices:
 * - all filter/page changes mutate ONE query object, so React batches them
 *   into a single request instead of firing one per keystroke/select,
 * - search input is debounced (300ms) before it reaches the query,
 * - every fetch owns an AbortController, so a slow response for page 1 cannot
 *   overwrite page 2's result.
 */

export const EMPTY_QUERY = { q: '', status: '', priority: '', sort: '-createdAt', page: 1 };

const FALLBACK_PAGINATION = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
};

export function useRequestQuery() {
  const [query, setQuery] = useState(EMPTY_QUERY);
  const [searchText, setSearchText] = useState('');
  const [result, setResult] = useState({ data: [], pagination: FALLBACK_PAGINATION });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const debounceRef = useRef(null);

  // Debounce: `searchText` updates instantly, `query.q` settles after 300ms.
  const changeSearch = useCallback((value) => {
    setSearchText(value);
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setQuery((current) => ({ ...current, q: value.trim(), page: 1 }));
    }, 300);
  }, []);

  useEffect(() => () => window.clearTimeout(debounceRef.current), []);

  /** Any filter change restarts at page 1 — the server owns paging anyway. */
  const setFilter = useCallback((patch) => {
    setQuery((current) => ({ ...current, ...patch, page: 1 }));
  }, []);

  const goToPage = useCallback((page) => {
    setQuery((current) => ({ ...current, page }));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchText('');
    setQuery(EMPTY_QUERY);
  }, []);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setLoading(true);
    setError(null);

    listRequests(query, { signal: controller.signal })
      .then(({ data, pagination }) => {
        if (cancelled) return;
        setResult({ data, pagination: { ...FALLBACK_PAGINATION, ...pagination } });
        setLoading(false);
      })
      .catch((caught) => {
        if (cancelled || caught.name === 'AbortError') return;
        setError(caught);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [query, reloadKey]);

  const hasFilters = Boolean(query.q || query.status || query.priority);

  return {
    query,
    searchText,
    hasFilters,
    requests: result.data,
    pagination: result.pagination,
    loading,
    error,
    changeSearch,
    setFilter,
    goToPage,
    clearFilters,
    retry,
  };
}
