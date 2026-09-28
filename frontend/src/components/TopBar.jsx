import { useAuth } from '../auth/AuthContext';
import { IconLogout, IconMenu } from './icons.jsx';

/**
 * Right-hand chrome: drawer toggle on mobile, signed-in identity and sign-out.
 * The role badge is a word, never a colour on its own.
 */
export default function TopBar({ onMenu }) {
  const { user, logout } = useAuth();
  const initial = (user?.name ?? '?').trim().charAt(0).toUpperCase();

  return (
    <header className="topbar">
      <button
        type="button"
        className="btn btn--quiet topbar__menu"
        onClick={onMenu}
        aria-label="Open navigation menu"
        aria-controls="app-sidebar"
      >
        <IconMenu size={20} />
      </button>

      <p className="topbar__title">Service requests</p>

      <div className="topbar__right">
        <div className="user-chip">
          <span className="user-chip__avatar" aria-hidden="true">
            {initial}
          </span>
          <span className="user-chip__meta">
            <span className="user-chip__name">{user?.name}</span>
            <span className={`role-badge role-badge--${user?.role}`}>
              {user?.role === 'owner' ? 'Owner' : 'Staff'}
            </span>
          </span>
        </div>

        <button
          type="button"
          className="btn btn--quiet topbar__logout"
          onClick={logout}
          title={`Sign out ${user?.email ?? ''}`}
        >
          <IconLogout size={17} />
          <span className="topbar__logout-label">Sign out</span>
        </button>
      </div>
    </header>
  );
}
