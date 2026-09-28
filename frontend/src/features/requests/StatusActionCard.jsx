import { useState } from 'react';
import StatusPill from '../../components/StatusPill';
import { IconArrowRight } from '../../components/icons.jsx';
import { STATUS_META, nextStatus } from './statusMeta';

/**
 * The one legal status button.
 *
 * The workflow only allows open → in-progress → done → billed, so the card
 * offers exactly the next step (never a dropdown of illegal options) and
 * disables itself with an explanation when the request is already billed.
 */
export default function StatusActionCard({ status, advancing, error, onAdvance }) {
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');

  const target = nextStatus(status);
  const current = STATUS_META[status];
  const hintId = `status-hint-${status}`;

  async function handleAdvance() {
    const trimmed = note.trim();
    if (trimmed.length > 500) {
      setNoteError('Notes are limited to 500 characters.');
      return;
    }
    setNoteError('');
    const succeeded = await onAdvance(target, trimmed || undefined);
    if (succeeded) setNote('');
  }

  return (
    <section className="panel status-action" aria-labelledby="status-action-title">
      <header className="panel__header">
        <div>
          <p className="eyebrow">Workflow</p>
          <h2 id="status-action-title">Status</h2>
        </div>
        <StatusPill status={status} />
      </header>

      <div className="panel__body status-action__body">
        <p className="status-action__rule" id={hintId}>
          {current?.hint}{' '}
          {target
            ? `Next legal step: ${STATUS_META[target].label}.`
            : 'This is the final state — there is no legal next step.'}
        </p>

        {target ? (
          <>
            <div className="field">
              <label className="field__label" htmlFor="transition-note">
                Transition note <span className="field__optional">optional</span>
              </label>
              <textarea
                id="transition-note"
                className="textarea"
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={`Why is it moving to ${STATUS_META[target].label.toLowerCase()}?`}
                aria-invalid={Boolean(noteError)}
              />
              {noteError && <p className="field__error">{noteError}</p>}
            </div>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              className="btn btn--primary"
              onClick={handleAdvance}
              disabled={advancing}
              aria-describedby={hintId}
            >
              {advancing ? (
                <span className="spinner" style={{ width: 15, height: 15 }} />
              ) : (
                <IconArrowRight size={16} />
              )}
              Move to {STATUS_META[target].label}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn--primary"
            disabled
            title="No legal next status — billed is the final state."
            aria-describedby={hintId}
          >
            <IconArrowRight size={16} />
            Move to next status
          </button>
        )}
      </div>
    </section>
  );
}
