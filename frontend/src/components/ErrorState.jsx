import { IconAlert, IconRefresh } from './icons.jsx';

/** Maps an ApiError to copy a human can act on — 5xx reads differently from a outage. */
function describe(error) {
  if (!error) {
    return { title: 'Something went wrong', text: 'The request could not be completed.' };
  }
  if (error.isOffline) {
    return {
      title: 'Cannot reach the server',
      text: 'The SevaDesk API is not responding. Check that the backend is running on the configured URL, then try again.',
    };
  }
  if (error.status >= 500) {
    return {
      title: 'Server error',
      text: `The server hit a problem handling this request (${error.code || 'internal_error'}). This is on the backend, not your data — try again in a moment.`,
    };
  }
  return { title: 'Could not load data', text: error.message };
}

export default function ErrorState({ error, onRetry }) {
  const { title, text } = describe(error);

  return (
    <div className="state-block state-block--error fade" role="alert">
      <span className="state-block__icon">
        <IconAlert size={24} />
      </span>
      <p className="state-block__title">{title}</p>
      <p className="state-block__text">{text}</p>
      {onRetry && (
        <button type="button" className="btn btn--ghost" onClick={onRetry}>
          <IconRefresh size={15} />
          Try again
        </button>
      )}
    </div>
  );
}
