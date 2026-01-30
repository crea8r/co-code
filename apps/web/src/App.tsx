import { useEffect } from 'react';
import type React from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ChannelView from './pages/Channel';
import CreateAgent from './pages/CreateAgent';
import Destinations from './pages/Destinations';
import AgentVitals from './pages/AgentVitals';
import AgentProfile from './pages/AgentProfile';
import ToolRegistry from './pages/ToolRegistry';
import ToolDetail from './pages/ToolDetail';
import Feed from './pages/Feed';
import AppLayout from './components/AppLayout';
import { useAuthStore } from './state/auth';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate().catch(() => null);
  }, [hydrate]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/channels" element={<Navigate to="/dashboard" replace />} />
        <Route path="/channels/:id" element={<ChannelView />} />
        <Route path="/agents/new" element={<CreateAgent />} />
        <Route path="/agents/:id" element={<AgentProfile />} />
        <Route path="/destinations" element={<Destinations />} />
        <Route path="/vitals" element={<AgentVitals />} />
        <Route path="/tools" element={<ToolRegistry />} />
        <Route path="/tools/:id" element={<ToolDetail />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
