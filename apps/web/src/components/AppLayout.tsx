import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuthStore } from '../state/auth';
import Button from './Button';

export default function AppLayout() {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const user = useAuthStore((state) => state.user);

  return (
    <div className="layout">
      <Sidebar />
      <div className="layout__main">
        <header className="layout__topbar">
          <div>
            <p className="layout__title">Welcome back</p>
            <p className="layout__subtitle">
              {user ? `Signed in as ${user.name}` : 'Sign in to continue'}
            </p>
          </div>
          {user ? (
            <Button variant="ghost" onClick={clearAuth}>
              Sign out
            </Button>
          ) : null}
        </header>
        <div className="layout__content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
