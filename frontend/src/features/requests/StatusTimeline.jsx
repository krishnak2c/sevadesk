import { IconArrowRight } from '../../components/icons.jsx';
import { formatDateTime } from '../../utils/dates';
import { statusLabel } from './statusMeta';

/**
 * Append-only audit trail as a vertical timeline: who moved what, when, and
 * why. Newest event first — the API already returns them in that order.
 */
export default function StatusTimeline({ events }) {
  if (events.length === 0) {
    return (
      <p className="muted timeline__empty">
        No transitions yet — the request is still in its first state.
      </p>
    );
  }

  return (
    <ol className="timeline">
      {events.map((event) => (
        <li className="timeline__item" key={event.id}>
          <span className="timeline__dot" aria-hidden="true" />
          <div className="timeline__body">
            <div className="timeline__head">
              <span className="timeline__actor">{event.actor?.name ?? 'Unknown user'}</span>
              <time className="timeline__time" dateTime={event.at}>
                {formatDateTime(event.at)}
              </time>
            </div>

            <p className="timeline__transition">
              <span className="timeline__status">
                {event.fromStatus ? statusLabel(event.fromStatus) : 'Created'}
              </span>
              <IconArrowRight size={13} />
              <span className="timeline__status">{statusLabel(event.toStatus)}</span>
            </p>

            {event.note && <p className="timeline__note">“{event.note}”</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
