import StatusPill from '../../components/StatusPill';
import { STATUS_OPTIONS } from './statusMeta';

/**
 * Legend for the status colours. Every pill prints its word and icon, so the
 * table stays readable in greyscale and for colour-blind reviewers — colour
 * is only ever a second signal.
 */
export default function StatusLegend() {
  return (
    <div className="legend" role="note" aria-label="Status colour legend">
      <span className="legend__label">Workflow:</span>
      <span className="legend__pills">
        {STATUS_OPTIONS.map((status) => (
          <StatusPill key={status} status={status} size="sm" />
        ))}
      </span>
      <span className="legend__hint">one legal step at a time — open → in progress → done → billed</span>
    </div>
  );
}
