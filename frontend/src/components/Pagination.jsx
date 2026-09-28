import { IconChevronLeft, IconChevronRight } from './icons.jsx';

/**
 * Server-driven pagination: every control only moves one page and asks the
 * API again — nothing is sliced client-side. The `pagination` object from
 * GET /api/requests is the single source of truth for what is reachable.
 */
export default function Pagination({ pagination, onChange }) {
  const { page, totalPages, total, hasNext, hasPrev, limit } = pagination;

  if (!total) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav className="pagination" aria-label="Requests pages">
      <p className="pagination__count">
        Showing <strong>{from}–{to}</strong> of <strong>{total}</strong> request
        {total === 1 ? '' : 's'}
      </p>

      <div className="pagination__controls">
        <button
          type="button"
          className="btn btn--ghost"
          disabled={!hasPrev}
          onClick={() => onChange(page - 1)}
        >
          <IconChevronLeft size={15} />
          Previous
        </button>

        <span className="pagination__page" aria-live="polite">
          Page {page} of {Math.max(totalPages, 1)}
        </span>

        <button
          type="button"
          className="btn btn--ghost"
          disabled={!hasNext}
          onClick={() => onChange(page + 1)}
        >
          Next
          <IconChevronRight size={15} />
        </button>
      </div>
    </nav>
  );
}
