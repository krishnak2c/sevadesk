import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import ErrorState from '../components/ErrorState';
import Skeleton from '../components/Skeleton';
import { IconChevronLeft } from '../components/icons.jsx';
import RequestForm from '../features/requests/RequestForm';
import { getRequest, updateRequest } from '../api/requests';
import { notesText } from '../utils/notes';

/** Map an API request onto the text-based shape the shared form expects. */
function toFormValues(request) {
  return {
    customerName: request.customerName,
    phone: request.phone,
    service: request.service,
    priority: request.priority,
    notes: notesText(request.notes),
  };
}

/** Owner-only edit screen. Staff deep-linking here land back on read-only. */
export default function EditRequestPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFormValues(null);
    setError(null);
    getRequest(id)
      .then((request) => {
        if (!cancelled) setFormValues(toFormValues(request));
      })
      .catch((requestError) => {
        if (!cancelled && requestError.name !== 'AbortError') setError(requestError);
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  async function handleSubmit(values) {
    await updateRequest(id, values);
    navigate(`/requests/${id}`, { replace: true });
  }

  // Structural guard: staff never see the edit form (the API would 403 it too).
  if (user?.role !== 'owner') return <Navigate to={`/requests/${id}`} replace />;

  return (
    <div className="page rise">
      <Link className="back-link" to="/requests">
        <IconChevronLeft size={15} />
        All requests
      </Link>

      <header className="page__header">
        <div>
          <p className="eyebrow">Owner action</p>
          <h1 className="page__title">Edit request</h1>
          <p className="lede">Update the details the desk works from. Status moves separately.</p>
        </div>
      </header>

      {error ? (
        <ErrorState error={error} onRetry={() => setReloadKey((key) => key + 1)} />
      ) : !formValues ? (
        <Skeleton detail />
      ) : (
        <section className="panel form-card" aria-labelledby="edit-request-title">
          <header className="panel__header">
            <div>
              <p className="eyebrow">Details</p>
              <h2 id="edit-request-title">Customer and service</h2>
            </div>
          </header>
          <div className="panel__body">
            <RequestForm
              initialValues={formValues}
              submitLabel="Save changes"
              onSubmit={handleSubmit}
            />
          </div>
        </section>
      )}
    </div>
  );
}
