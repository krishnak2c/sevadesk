/**
 * Pure validation for the auth form — kept out of the component so the JSX
 * stays readable and the rules can be checked without rendering anything.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAuth(values, isRegister) {
  const errors = {};
  if (isRegister && values.name.trim().length < 2) {
    errors.name = 'Enter your full name (at least 2 characters).';
  }
  if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Enter a valid email address, e.g. owner@demo.com.';
  }
  if (values.password.length < (isRegister ? 8 : 1)) {
    errors.password = isRegister
      ? 'Password must be at least 8 characters.'
      : 'Enter your password.';
  }
  return errors;
}
