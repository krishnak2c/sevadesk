import { Link } from 'react-router-dom';
import { IconEmptyBox } from '../components/icons.jsx';

/** Unknown URL inside the shell — a real page, not a silent redirect. */
export default function NotFoundPage() {
  return (
    <div className="page rise">
      <div className="state-block">
        <span className="state-block__icon">
          <IconEmptyBox size={26} />
        </span>
        <p className="state-block__title">Page not found</p>
        <p className="state-block__text">
          That address does not match any screen in SevaDesk.
        </p>
        <Link className="btn btn--ghost" to="/requests">
          Back to requests
        </Link>
      </div>
    </div>
  );
}
