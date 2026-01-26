import { Link, NavLink } from 'react-router-dom';
import { useAuthStore } from '../state/auth';

export default function Sidebar() {
  const user = useAuthStore((state) => state.user);

  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar__brand">
        <span className="brand__mark">◎</span>
        <div>
          <p className="brand__title">Agent Platform</p>
          <p className="brand__sub">Collective dashboard</p>
        </div>
      </Link>

      <nav className="sidebar__nav">
        <NavLink to="/dashboard" className="sidebar__link">
          Overview
        </NavLink>
        <NavLink to="/channels" className="sidebar__link">
          Channels
        </NavLink>
        <NavLink to="/agents/new" className="sidebar__link">
          Create Agent
        </NavLink>
      </nav>

      <div className="sidebar__footer">
        <p className="sidebar__meta">Signed in as</p>
        <p className="sidebar__user">{user?.name ?? 'Guest'}</p>
      </div>
    </aside>
  );
}
