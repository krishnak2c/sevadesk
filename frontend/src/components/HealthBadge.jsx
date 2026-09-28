import { useCallback, useEffect, useState } from 'react';
import { checkHealth } from '../api/health';

const STATE_CLASS = { ok: 'ok', degraded: 'degraded', offline: 'offline', checking: 'checking' };

/**
 * Sidebar footer indicator. GET /health answers 200 even with a dead
 * database, so the payload is interpreted in src/api/health.js and a broken
 * backend degrades this dot — it never throws into render.
 */
export default function HealthBadge() {
  const [health, setHealth] = useState({ state: 'checking', label: 'Checking API…', detail: '' });

  const probe = useCallback(async () => {
    setHealth({ state: 'checking', label: 'Checking API…', detail: '' });
    setHealth(await checkHealth());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const result = await checkHealth();
      if (!cancelled) setHealth(result);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <button
      type="button"
      className="health"
      onClick={probe}
      title={`${health.label}${health.detail ? ` — ${health.detail}` : ''} (click to re-check)`}
    >
      <span className={`health__dot health__dot--${STATE_CLASS[health.state] ?? 'checking'}`} />
      <span className="health__label">{health.label}</span>
    </button>
  );
}
