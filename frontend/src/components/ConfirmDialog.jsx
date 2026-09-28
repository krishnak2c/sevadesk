import { useEffect, useId, useRef } from 'react';
import { IconAlert, IconClose } from './icons.jsx';

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Confirmation dialog for destructive actions. Native <dialog> gives us the
 * focus trap, Escape-to-close and inert background for free — the fallback is
 * a plain focus-and-return implementation so behaviour matches everywhere.
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onCancel?.();
    const handleCancel = (event) => {
      event.preventDefault();
      if (!busy) onCancel?.();
    };
    const handleKeydown = (event) => {
      if (event.key !== 'Tab' || typeof dialog.showModal !== 'function') return;
      const focusable = [...dialog.querySelectorAll(FOCUSABLE)].filter(
        (node) => node.offsetParent !== null
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('keydown', handleKeydown);
    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('keydown', handleKeydown);
    };
  }, [busy, onCancel]);

  if (!open) return null;

  return (
    <dialog className="dialog" ref={dialogRef} aria-labelledby={titleId}>
      <div className="dialog__panel">
        <header className="dialog__header">
          <span className={`dialog__icon ${danger ? 'dialog__icon--danger' : ''}`}>
            <IconAlert size={18} />
          </span>
          <h2 className="dialog__title" id={titleId}>
            {title}
          </h2>
          <button
            type="button"
            className="btn btn--quiet dialog__close"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close dialog"
          >
            <IconClose size={18} />
          </button>
        </header>

        <div className="dialog__body">{body}</div>

        <footer className="dialog__footer">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onCancel}
            disabled={busy}
            ref={cancelRef}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
            onClick={onConfirm}
            disabled={busy}
            ref={confirmRef}
          >
            {busy && <span className="spinner" style={{ width: 14, height: 14 }} />}
            {confirmLabel}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
