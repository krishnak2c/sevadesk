import { Outlet } from 'react-router-dom';
import './auth.css';

/**
 * Centred auth chrome: brand story on the left, routed form on the right.
 * Collapses to a single column on small screens.
 */
export default function AuthLayout() {
  return (
    <div className="auth">
      <section className="auth__pitch">
        <div className="auth__pitch-inner">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                <path
                  d="M9 10.5h14M9 16h8.5M9 21.5h5"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
                <path
                  d="m18.5 20 2.6 2.6 4.6-5.2"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.55"
                />
              </svg>
            </span>
            <span className="brand__text">
              <span className="brand__name">SevaDesk</span>
              <span className="brand__clinic">Dr. Sharma Dental · Haldwani</span>
            </span>
          </div>

          <p className="eyebrow">Service-request tracker</p>
          <h1 className="auth__headline">
            Every patient request,
            <br />
            tracked from open to billed.
          </h1>
          <p className="auth__sub">
            Log calls and walk-ins in seconds, hand them to staff, and keep an audit trail of who
            moved what — built for small clinics that run on a front desk, not an IT team.
          </p>

          <ul className="auth__points">
            <li>One legal next step per status — no accidental skips</li>
            <li>Append-only timeline: every transition, actor and note</li>
            <li>Search by name or phone digits, filters and server-side paging</li>
          </ul>
        </div>
      </section>

      <section className="auth__form-side">
        <div className="auth__form-wrap">
          <Outlet />
        </div>
      </section>
    </div>
  );
}
