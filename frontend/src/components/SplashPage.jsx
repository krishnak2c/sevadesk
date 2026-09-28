import Spinner from './Spinner';

/**
 * Shown while the app asks GET /api/auth/me whether a session exists.
 * Keeps first paint honest: a signed-in user never sees the login flash.
 */
export default function SplashPage() {
  return (
    <div className="splash fade">
      <div className="splash__mark" aria-hidden="true">
        <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
          <path
            d="M9 10.5h14M9 16h8.5M9 21.5h5"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="m18.5 20 2.6 2.6 4.6-5.2"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.55"
          />
        </svg>
      </div>
      <p className="splash__brand">SevaDesk</p>
      <p className="splash__hint">
        <Spinner size={14} label="Checking your session" />
        <span>Checking your session…</span>
      </p>
    </div>
  );
}
