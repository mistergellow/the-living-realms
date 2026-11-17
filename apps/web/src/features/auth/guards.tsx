import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageMessage } from '../../shared/ui/FullPageMessage';
import { useMe } from './api';

/** Only for logged-in accounts; otherwise redirect to /login. */
export function RequireAuth() {
  const me = useMe();
  const location = useLocation();
  if (me.isPending) return <FullPageMessage>Loading…</FullPageMessage>;
  if (me.isError)
    return <FullPageMessage>Cannot reach the server. Please try again shortly.</FullPageMessage>;
  if (!me.data) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Only for guests; logged-in accounts go straight to character selection. */
export function GuestOnly() {
  const me = useMe();
  if (me.isPending) return <FullPageMessage>Loading…</FullPageMessage>;
  if (me.data) return <Navigate to="/characters" replace />;
  return <Outlet />;
}
