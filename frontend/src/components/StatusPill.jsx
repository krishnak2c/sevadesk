import { STATUS_META } from '../features/requests/statusMeta';
import './StatusPill.css';

/**
 * Colour is never the only signal: the pill always carries the status word
 * and a distinct glyph, so it stays readable for colour-blind users and in
 * greyscale printouts.
 */
export default function StatusPill({ status, size = 'md' }) {
  const meta = STATUS_META[status];
  if (!meta) return null;

  const Glyph = meta.icon;

  return (
    <span className={`status-pill status-pill--${status} status-pill--${size}`}>
      <Glyph size={13} />
      {meta.label}
    </span>
  );
}
