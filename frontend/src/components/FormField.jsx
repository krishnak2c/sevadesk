import { IconAlert } from './icons.jsx';

/**
 * Label + control + hint/error with the accessibility plumbing wired once:
 * `htmlFor`, `aria-invalid` and `aria-describedby` are derived here so no
 * form can ship an input that screen readers cannot describe.
 */
export default function FormField({
  id,
  label,
  type = 'text',
  options = [],
  hint,
  error,
  optional = false,
  ...controlProps
}) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        <span>{label}</span>
        {optional && <span className="field__optional">optional</span>}
      </label>

      {type === 'select' ? (
        <select
          className="select"
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...controlProps}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          className="textarea"
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...controlProps}
        />
      ) : (
        <input
          className="input"
          id={id}
          type={type}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...controlProps}
        />
      )}

      {hint && !error && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}

      {error && (
        <p className="field__error" id={errorId}>
          <IconAlert size={14} />
          {error}
        </p>
      )}
    </div>
  );
}
