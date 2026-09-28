import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import { IconPencil, IconTrash } from '../../components/icons.jsx';
import { deleteRequest } from '../../api/requests';

/**
 * Owner-only controls. The detail page renders this component only for
 * `role === 'owner'`, so staff never receive the markup at all — the
 * permission check is structural, not a CSS `display: none`.
 */
export default function OwnerRequestActions({ requestId }) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setBusy(true);
    setError('');
    try {
      await deleteRequest(requestId);
      navigate('/requests', { replace: true });
    } catch (deleteError) {
      setError(deleteError?.message ?? 'Could not delete this request.');
      setConfirmOpen(false);
      setBusy(false);
    }
  }

  return (
    <div className="owner-actions">
      <Link className="btn btn--ghost" to={`/requests/${requestId}/edit`}>
        <IconPencil size={15} />
        Edit
      </Link>
      <button
        type="button"
        className="btn btn--ghost btn--danger-outline"
        onClick={() => setConfirmOpen(true)}
      >
        <IconTrash size={15} />
        Delete
      </button>

      {error && (
        <p className="form-error owner-actions__error" role="alert">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        danger
        busy={busy}
        title="Delete this request?"
        body="The request and its audit trail will be removed for everyone at the desk. This cannot be undone."
        confirmLabel="Delete request"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
