import { PRIORITY_META } from '../features/requests/statusMeta';

/** Word + arrow icon + colour: three redundant signals, never colour alone. */
export default function PriorityBadge({ priority }) {
  const meta = PRIORITY_META[priority];
  if (!meta) return null;

  const Glyph = meta.icon;

  return (
    <span className={`priority-badge priority-badge--${priority}`}>
      <Glyph size={13} />
      {meta.label}
    </span>
  );
}
