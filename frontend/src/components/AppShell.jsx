import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import './AppShell.css';

/**
 * Authenticated chrome: sidebar + top bar + routed content.
 * Rendered only for a verified session (see App.jsx routes), so an anonymous
 * visitor never sees a shell without a user behind it.
 */
export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Navigating closes the mobile drawer — otherwise it covers the new page.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      {menuOpen && (
        <button
          type="button"
          className="shell__scrim"
          aria-label="Close navigation menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="shell__main">
        <TopBar onMenu={() => setMenuOpen(true)} />
        <main className="shell__content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
