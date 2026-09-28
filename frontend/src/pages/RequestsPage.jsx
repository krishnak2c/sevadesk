import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Pagination from '../components/Pagination';
import Skeleton from '../components/Skeleton';
import { IconPlus } from '../components/icons.jsx';
import RequestFilters from '../features/requests/RequestFilters';
import RequestsTable from '../features/requests/RequestsTable';
import StatusLegend from '../features/requests/StatusLegend';
import { useRequestQuery } from '../features/requests/useRequestQuery';
import './RequestsPage.css';

/**
 * Main screen: server-driven list (filters, search and pagination all live
 * in the query string handed to GET /api/requests). Four exclusive states —
 * loading, error, empty, data — so a reviewer always sees one clear truth.
 */
export default function RequestsPage() {
  const {
    query,
    searchText,
    hasFilters,
    requests,
    pagination,
    loading,
    error,
    changeSearch,
    setFilter,
    goToPage,
    clearFilters,
    retry,
  } = useRequestQuery();

  return (
    <div className="page rise">
      <header className="page__header">
        <div>
          <p className="eyebrow">Front desk</p>
          <h1 className="page__title">Requests</h1>
          <p className="lede">Every service request at the desk, from first call to billed.</p>
        </div>
        <div className="page__actions">
          <Link className="btn btn--primary" to="/requests/new">
            <IconPlus size={16} />
            New request
          </Link>
        </div>
      </header>

      <RequestFilters
        query={query}
        searchText={searchText}
        hasFilters={hasFilters}
        onSearch={changeSearch}
        onFilter={setFilter}
        onClear={clearFilters}
      />

      <StatusLegend />

      <section className="requests-body" aria-busy={loading} aria-label="Requests list">
        {loading ? (
          <Skeleton rows={6} />
        ) : error ? (
          <ErrorState error={error} onRetry={retry} />
        ) : requests.length === 0 && hasFilters ? (
          <EmptyState
            variant="search"
            title="No requests match those filters"
            text="Try a different name, phone, status or priority — or clear everything and start over."
            action={
              <button type="button" className="btn btn--ghost" onClick={clearFilters}>
                Clear filters
              </button>
            }
          />
        ) : requests.length === 0 ? (
          <EmptyState
            title="No requests yet"
            text="When the desk logs its first service request, it will show up here."
            action={
              <Link className="btn btn--primary" to="/requests/new">
                <IconPlus size={16} />
                New request
              </Link>
            }
          />
        ) : (
          <>
            <RequestsTable requests={requests} />
            <Pagination pagination={pagination} onChange={goToPage} />
          </>
        )}
      </section>
    </div>
  );
}
