import { useState } from 'react';
import { ApiError } from '../../api/client';
import FormField from '../../components/FormField';
import { PRIORITY_OPTIONS, priorityLabel } from './statusMeta';
import { toNotesArray } from '../../utils/notes';
import { validateRequest } from './requestValidation';

const EMPTY_VALUES = {
  customerName: '',
  phone: '',
  service: '',
  priority: 'normal',
  notes: '',
};

/**
 * Shared create/edit form.
 *
 * `initialValues.notes` is plain TEXT (for editing, convert the stored array
 * with `notesText()` first); `onSubmit` receives `{..., notes: [string]}`,
 * matching the API. The submit callback owns persistence — this component
 * owns inputs, validation and mapping server `details` back onto fields.
 */
export default function RequestForm({ initialValues, submitLabel, onSubmit }) {
  const [values, setValues] = useState({ ...EMPTY_VALUES, ...initialValues });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    const clientErrors = validateRequest(values);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        customerName: values.customerName.trim(),
        phone: values.phone.trim(),
        service: values.service.trim(),
        priority: values.priority,
        notes: toNotesArray(values.notes),
      });
    } catch (error) {
      if (error instanceof ApiError) {
        const details = error.fieldErrors();
        if (Object.keys(details).length > 0) setFieldErrors(details);
        setFormError(error.message);
      } else {
        setFormError('Unexpected error. Nothing was saved — please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} noValidate>
      <FormField
        id="customerName"
        label="Customer name"
        autoComplete="name"
        placeholder="e.g. Anita Bisht"
        value={values.customerName}
        onChange={update('customerName')}
        error={fieldErrors.customerName}
        required
      />

      <FormField
        id="phone"
        label="Phone"
        type="tel"
        autoComplete="tel"
        placeholder="e.g. 98765 43210"
        value={values.phone}
        onChange={update('phone')}
        error={fieldErrors.phone}
        hint="Search matches phone numbers by their digits, so formatting never affects results."
        required
      />

      <FormField
        id="service"
        label="Service requested"
        placeholder="e.g. Root canal follow-up"
        value={values.service}
        onChange={update('service')}
        error={fieldErrors.service}
        required
      />

      <FormField
        id="priority"
        label="Priority"
        type="select"
        options={PRIORITY_OPTIONS.map((value) => ({ value, label: priorityLabel(value) }))}
        value={values.priority}
        onChange={update('priority')}
        error={fieldErrors.priority}
      />

      <FormField
        id="notes"
        label="Notes"
        type="textarea"
        rows={4}
        optional
        placeholder="Anything the desk should know when this request is picked up."
        value={values.notes}
        onChange={update('notes')}
        error={fieldErrors.notes}
        hint="Saved as a single note on the request; the transition timeline keeps its own notes."
      />

      {formError && (
        <p className="form-error" role="alert">
          {formError}
        </p>
      )}

      <button type="submit" className="btn btn--primary btn--lg" disabled={submitting}>
        {submitting && <span className="spinner" style={{ width: 15, height: 15 }} />}
        {submitLabel}
      </button>
    </form>
  );
}
