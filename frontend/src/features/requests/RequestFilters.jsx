import { useState } from 'react';
import { IconClipboard, IconClose, IconSearch } from '../../components/icons.jsx';
import { PRIORITY_OPTIONS, STATUS_OPTIONS, priorityLabel, statusLabel } from './statusMeta';

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'createdAt', label: 'Oldest first' },
];

/**
 * Search + filter bar. Every change goes straight into the server query
 * (via `onFilter` / `onSearch`), so what you see on screen is always what
 * the API was asked for — no local copy to drift out of sync.
 */
export default function RequestFilters({
  query,
  searchText,
  hasFilters,
  onSearch,
  onFilter,
  onClear,
}) {
  // Below 900px the selects hide behind a disclosure button so the bar stops
  // eating the phone viewport. On desktop the panel is `display: contents`,
  // so this state has no effect there.
  const [open, setOpen] = useState(false);
  const activeCount = (query.status ? 1 : 0) + (query.priority ? 1 : 0);

  return (
    <div className={open ? 'filters filters--open' : 'filters'} role="search" aria-label="Filter requests">
      <div className="filters__search">
        <label className="sr-only" htmlFor="requests-search">
          Search by customer name or phone
        </label>
        <span className="filters__search-icon" aria-hidden="true">
          <IconSearch size={16} />
        </span>
        <input
          id="requests-search"
          type="search"
          className="filters__input"
          placeholder="Search name or phone…"
          value={searchText}
          onChange={(event) => onSearch(event.target.value)}
        />
        {searchText && (
          <button
            type="button"
            className="filters__clear"
            aria-label="Clear search"
            onClick={() => onSearch('')}
          >
            <IconClose size={14} />
          </button>
        )}
      </div>

      <button
        type="button"
        className="btn btn--ghost filters__toggle"
        aria-expanded={open}
        aria-controls="filters-panel"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        <IconClipboard size={16} />
        <span>{activeCount > 0 ? `Filters (${activeCount})` : 'Filters'}</span>
      </button>

      <div className="filters__panel" id="filters-panel">
        <div className="filters__control">
          <label htmlFor="filter-status">Status</label>
          <select
            id="filter-status"
            className="select"
            value={query.status}
            onChange={(event) => onFilter({ status: event.target.value })}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {statusLabel(value)}
              </option>
            ))}
          </select>
        </div>

        <div className="filters__control">
          <label htmlFor="filter-priority">Priority</label>
          <select
            id="filter-priority"
            className="select"
            value={query.priority}
            onChange={(event) => onFilter({ priority: event.target.value })}
          >
            <option value="">All priorities</option>
            {PRIORITY_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {priorityLabel(value)}
              </option>
            ))}
          </select>
        </div>

        <div className="filters__control">
          <label htmlFor="filter-sort">Sort</label>
          <select
            id="filter-sort"
            className="select"
            value={query.sort}
            onChange={(event) => onFilter({ sort: event.target.value })}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <button type="button" className="btn btn--ghost filters__reset" onClick={onClear}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
