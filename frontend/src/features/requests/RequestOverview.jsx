import {
  IconCalendar,
  IconClipboard,
  IconPaperclip,
  IconPhone,
  IconUser,
} from '../../components/icons.jsx';
import { formatDateTime } from '../../utils/dates';
import { notesText } from '../../utils/notes';

/**
 * "Service details" panel: contact facts, attachment and free-text notes.
 * Split out of the detail page so each file stays small and single-purpose.
 */
export default function RequestOverview({ request }) {
  return (
    <section className="panel" aria-labelledby="detail-info-title">
      <header className="panel__header">
        <div>
          <p className="eyebrow">Overview</p>
          <h2 id="detail-info-title">Service details</h2>
        </div>
      </header>
      <div className="panel__body">
        <dl className="meta">
          <div className="meta__item">
            <dt>
              <IconPhone size={14} /> Phone
            </dt>
            <dd className="meta__mono">{request.phone}</dd>
          </div>
          <div className="meta__item">
            <dt>
              <IconClipboard size={14} /> Service
            </dt>
            <dd>{request.service}</dd>
          </div>
          <div className="meta__item">
            <dt>
              <IconUser size={14} /> Assignee
            </dt>
            <dd>
              {request.assignee ? (
                <span className="assignee">{request.assignee.name}</span>
              ) : (
                <span className="muted">Unassigned</span>
              )}
            </dd>
          </div>
          <div className="meta__item">
            <dt>
              <IconCalendar size={14} /> Created
            </dt>
            <dd>{formatDateTime(request.createdAt)}</dd>
          </div>
          <div className="meta__item">
            <dt>Created by</dt>
            <dd>{request.createdBy?.name ?? '—'}</dd>
          </div>
          <div className="meta__item">
            <dt>Last updated</dt>
            <dd>{formatDateTime(request.updatedAt)}</dd>
          </div>
        </dl>

        {request.attachmentUrl && (
          <a
            className="detail__attachment"
            href={request.attachmentUrl}
            target="_blank"
            rel="noreferrer"
          >
            <IconPaperclip size={15} />
            View attachment
          </a>
        )}

        <div className="detail__notes">
          <h3 className="detail__notes-title">Request notes</h3>
          {request.notes?.length ? (
            notesText(request.notes)
              .split('\n')
              .map((note, index) => (
                <p className="detail__note" key={index}>
                  {note}
                </p>
              ))
          ) : (
            <p className="muted">No notes were added with this request.</p>
          )}
        </div>
      </div>
    </section>
  );
}
