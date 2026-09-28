import { IconEmptyBox } from './icons.jsx';

/**
 * Empty state. `variant` separates the two genuinely different empties:
 * - 'empty'  → the clinic has no requests yet
 * - 'search' → filters/search matched nothing (data exists elsewhere)
 */
export default function EmptyState({ variant = 'empty', title, text, action }) {
  const copy =
    variant === 'search'
      ? {
          title: 'No requests match your filters',
          text: 'Try a different search term, or clear the status and priority filters to see everything.',
        }
      : {
          title: 'No requests yet',
          text: 'Log the first service request and it will appear here, ready to be moved along its workflow.',
        };

  return (
    <div className="state-block fade">
      <span className="state-block__icon">
        <IconEmptyBox size={24} />
      </span>
      <p className="state-block__title">{title ?? copy.title}</p>
      <p className="state-block__text">{text ?? copy.text}</p>
      {action}
    </div>
  );
}
