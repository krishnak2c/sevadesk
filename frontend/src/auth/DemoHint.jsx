import { IconInfo } from '../components/icons.jsx';

/** Seeded demo logins so a reviewer can sign in without asking for credentials. */
export default function DemoHint() {
  return (
    <div className="demo-hint">
      <span className="demo-hint__icon">
        <IconInfo size={15} />
      </span>
      <div className="demo-hint__text">
        <strong>Demo accounts (seeded data)</strong>
        <code>owner@demo.com</code> · <code>Staff@123</code> — owner (full access)
        <br />
        <code>staff@demo.com</code> · <code>Staff@123</code> — staff (no edit/delete)
      </div>
    </div>
  );
}
