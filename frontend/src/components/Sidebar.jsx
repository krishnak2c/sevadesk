import { NavLink } from 'react-router-dom';
import HealthBadge from './HealthBadge';
import { IconClipboard, IconPlus } from './icons.jsx';

function BrandMark() {
  return (
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
  );
}

const NAV_ITEMS = [
  { to: '/requests', label: 'Requests', icon: IconClipboard, end: false },
  { to: '/requests/new', label: 'New request', icon: IconPlus, end: true, primary: true },
];

/** Slim left rail: brand, two destinations, API health. Drawer below 900px. */
export default function Sidebar({ open, onClose }) {
  return (
    <aside className={`sidebar ${open ? 'sidebar--open' : ''}`} id="app-sidebar">
      <div className="sidebar__top">
        <div className="brand">
          <BrandMark />
          <span className="brand__text">
            <span className="brand__name">SevaDesk</span>
            <span className="brand__clinic">Dr. Sharma Dental · Haldwani</span>
          </span>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Primary">
        <p className="sidebar__heading">Workspace</p>
        <ul className="sidebar__list">
          {NAV_ITEMS.map(({ to, label, icon: Glyph, end, primary }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) =>
                  `nav-link ${primary ? 'nav-link--primary' : ''} ${isActive ? 'is-active' : ''}`
                }
              >
                <Glyph size={17} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar__footer">
        <HealthBadge />
      </div>
    </aside>
  );
}
