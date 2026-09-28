import { useCallback, useEffect, useState } from 'react';
import { advanceStatus, getRequest, listRequestEvents } from '../../api/requests';

/**
 * Data for one request: the request itself, its append-only event trail, and
 * the single legal status transition. Kept as a hook so the detail page stays
 * declarative — it renders state and calls `advance`, nothing else.
 */
export function useRequestDetail(id) {
  const [state, setState] = useState({
    request: null,
    events: [],
    loading: true,
    error: null,
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));

    Promise.all([getRequest(id), listRequestEvents(id)])
      .then(([request, events]) => {
        if (cancelled) return;
        setState({
          request,
          events: Array.isArray(events) ? events : [],
          loading: false,
          error: null,
        });
      })
      .catch((error) => {
        if (cancelled || error.name === 'AbortError') return;
        setState({ request: null, events: [], loading: false, error });
      });

    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  /**
   * Attempts the one legal transition (the API rejects anything else with
   * `invalid_transition`). Returns true on success so the caller can clear
   * its note field; failures surface through `advanceError`.
   */
  const advance = useCallback(
    async (toStatus, note) => {
      setAdvancing(true);
      setAdvanceError('');
      try {
        await advanceStatus(id, { status: toStatus, note });
        reload();
        return true;
      } catch (error) {
        setAdvanceError(error?.message ?? 'Could not update the status.');
        return false;
      } finally {
        setAdvancing(false);
      }
    },
    [id, reload]
  );

  return { ...state, advancing, advanceError, advance, reload };
}
