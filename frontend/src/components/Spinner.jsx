/** Indeterminate activity indicator. Announced politely to screen readers. */
export default function Spinner({ label = 'Loading', size = 20 }) {
  return (
    <span className="spinner" style={{ width: size, height: size }} role="status">
      <span className="sr-only">{label}…</span>
    </span>
  );
}
