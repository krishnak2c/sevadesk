import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import ErrorState from '../components/ErrorState';
import PriorityBadge from '../components/PriorityBadge';
import Skeleton from '../components/Skeleton';
import StatusPill from '../components/StatusPill';
import { IconChevronLeft } from '../components/icons.jsx';
import OwnerRequestActions from '../features/requests/OwnerRequestActions';
import RequestOverview from '../features/requests/RequestOverview';
import StatusActionCard from '../features/requests/StatusActionCard';
import StatusTimeline from '../features/requests/StatusTimeline';
import { useRequestDetail } from '../features/requests/useRequestDetail';
import './RequestDetailPage.css';

/**
 * One request in full: overview, append-only audit trail, and the single
 * legal status transition. Edit/Delete markup is rendered only for owners —
 * staff never receives it in the DOM at all.
 */
export default function RequestDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { request, events, loading, error, advancing, advanceError, advance, reload } =
    useRequestDetail(id);

  const isOwner = user?.role === 'owner';

  return (
    <div className="page detail-page rise">
      <Link className="back-link" to="/requests">
        <IconChevronLeft size={15} />
        All requests
      </Link>

      {loading && <Skeleton detail />}

      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && request && (
        <>
          <header className="page__header detail__header">
            <div>
              <p className="eyebrow">Request #{request.id}</p>
              <h1 className="page__title">{request.customerName}</h1>
              <div className="detail__pills">
                <StatusPill status={request.status} />
                <PriorityBadge priority={request.priority} />
              </div>
            </div>
            {isOwner && <OwnerRequestActions requestId={request.id} />}
          </header>

          <div className="detail__grid">
            <div className="detail__main">
              <RequestOverview request={request} />

              <section className="panel" aria-labelledby="detail-timeline-title">
                <header className="panel__header">
                  <div>
                    <p className="eyebrow">Audit trail</p>
                    <h2 id="detail-timeline-title">Status history</h2>
                  </div>
                </header>
                <div className="panel__body">
                  <StatusTimeline events={events} />
                </div>
              </section>
            </div>

            <aside className="detail__side">
              <StatusActionCard
                status={request.status}
                advancing={advancing}
                error={advanceError}
                onAdvance={advance}
              />
              <p className="detail__hint">
                Status moves one legal step at a time: open → in progress → done → billed.
                Skips and reversals are rejected by the API.
              </p>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
