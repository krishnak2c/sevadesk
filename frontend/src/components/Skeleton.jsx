import './Skeleton.css';

/**
 * Loading placeholders. Two shapes:
 * - <Skeleton rows={n} /> — list/table rows while GET /api/requests resolves
 * - <Skeleton detail />   — request detail skeleton
 * Matched to the real layout so the page does not jump when data lands.
 */
export default function Skeleton({ rows = 6, detail = false }) {
  if (detail) {
    return (
      <div className="skeleton-detail" aria-hidden="true">
        <div className="skeleton" style={{ height: '1.9rem', width: '46%' }} />
        <div className="skeleton" style={{ height: '1rem', width: '28%' }} />
        <div className="skeleton" style={{ height: '7rem', width: '100%' }} />
        <div className="skeleton" style={{ height: '1rem', width: '34%' }} />
        <div className="skeleton" style={{ height: '9rem', width: '100%' }} />
      </div>
    );
  }

  return (
    <div className="skeleton-list" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton-list__row" key={index}>
          <div className="skeleton" style={{ height: '0.95rem', width: '30%' }} />
          <div className="skeleton" style={{ height: '0.95rem', width: '20%' }} />
          <div className="skeleton" style={{ height: '0.95rem', width: '16%' }} />
          <div className="skeleton" style={{ height: '0.95rem', width: '14%' }} />
        </div>
      ))}
    </div>
  );
}
