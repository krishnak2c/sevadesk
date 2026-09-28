/**
 * Pure validation for request forms. Server `invalid_input` details use the
 * same field names, so one error map serves both client and API rejections.
 */

/** Phone numbers are matched by digits server-side, so validate the digits. */
function digitsOf(value) {
  return value.replace(/\D/g, '');
}

export function validateRequest(values) {
  const errors = {};
  if (values.customerName.trim().length < 2) {
    errors.customerName = 'Enter the customer name (at least 2 characters).';
  }
  const digits = digitsOf(values.phone);
  if (digits.length < 7 || digits.length > 15) {
    errors.phone = 'Enter a phone number with 7–15 digits (spaces and + are ignored).';
  }
  if (values.service.trim().length < 2) {
    errors.service = 'Describe the service requested (at least 2 characters).';
  }
  if (values.notes.length > 500) {
    errors.notes = 'Keep the note under 500 characters.';
  }
  return errors;
}
