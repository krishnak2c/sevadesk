import { Link, useNavigate } from 'react-router-dom';
import { IconChevronLeft, IconPlus } from '../components/icons.jsx';
import { createRequest } from '../api/requests';
import RequestForm from '../features/requests/RequestForm';

/** Create flow: one form, then straight to the fresh request's detail page. */
export default function NewRequestPage() {
  const navigate = useNavigate();

  async function handleSubmit(values) {
    const created = await createRequest(values);
    // Prefer the created id; fall back to the list if the API omits it.
    navigate(created?.id ? `/requests/${created.id}` : '/requests', { replace: true });
  }

  return (
    <div className="page rise">
      <Link className="back-link" to="/requests">
        <IconChevronLeft size={15} />
        All requests
      </Link>

      <header className="page__header">
        <div>
          <p className="eyebrow">Front desk</p>
          <h1 className="page__title">New request</h1>
          <p className="lede">Log the job so the desk can pick it up and carry it to billing.</p>
        </div>
      </header>

      <section className="panel form-card" aria-labelledby="new-request-title">
        <header className="panel__header">
          <div>
            <p className="eyebrow">Details</p>
            <h2 id="new-request-title">Customer and service</h2>
          </div>
        </header>
        <div className="panel__body">
          <RequestForm
            initialValues={{ priority: 'normal' }}
            submitLabel="Create request"
            onSubmit={handleSubmit}
          />
        </div>
      </section>
    </div>
  );
}
