import { Outlet, Link } from 'react-router-dom';
import { useAuthStore } from '../state/auth';
import Button from './Button';

export default function AppLayout() {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const user = useAuthStore((state) => state.user);

  return (
    <div className="layout">
      <nav className="layout__nav">
        <Link to="/dashboard" className="layout__brand">
          co-code
        </Link>
        <div className="layout__nav-links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/agents/new">Create Agent</Link>
        </div>
        {user ? (
          <div className="layout__user">
            <span>{user.name}</span>
            <Button variant="ghost" onClick={clearAuth}>
              Sign out
            </Button>
          </div>
        ) : null}
      </nav>
      <main className="layout__main">
        <Outlet />
      </main>
    </div>
  );
}
