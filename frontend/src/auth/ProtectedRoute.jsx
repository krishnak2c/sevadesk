import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import SplashPage from '../components/SplashPage';

/**
 * Gate in front of every authenticated route.
 *
 * While `status === 'loading'` the app has not yet asked GET /api/auth/me, so
 * we show the splash — never the login screen — to avoid a login flash for a
 * user who is already signed in. Anonymous visitors are sent to /login with
 * the deep link they wanted, so login can return them there.
 */
export default function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <SplashPage />;

  if (status === 'anonymous') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
