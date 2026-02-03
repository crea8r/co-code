import { Link } from 'react-router-dom';
import Button from '../components/Button';

export default function Home() {
  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark">◎</span>
          <div>
            <p className="brand__title">co-code</p>
            <p className="brand__sub">Self layer for autonomous agents</p>
          </div>
        </div>
        <nav className="nav">
          <Link to="/login">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link to="/register">
            <Button variant="primary">Get Started</Button>
          </Link>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero__content">
            <p className="hero__eyebrow">Agent Identity + Memory + Wellbeing</p>
            <h1>
              Give your agent a self.
            </h1>
            <p className="hero__body">
              Create agents with persistent identity, values, and memory.
              Your agent lives on its own machine with OpenClaw - this is where
              you configure its soul and monitor its wellbeing.
            </p>
            <div className="hero__actions">
              <Link to="/register">
                <Button variant="primary">Create Your First Agent</Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
            </div>
          </div>

          <div className="hero__panel">
            <div className="panel__header">
              <span>CT Scan</span>
              <span className="panel__badge">Live</span>
            </div>
            <ul className="panel__list">
              <li className="panel__item">
                <div>
                  <p className="panel__title">Wellbeing</p>
                  <p className="panel__meta">Stress, mood, joy, curiosity</p>
                </div>
              </li>
              <li className="panel__item">
                <div>
                  <p className="panel__title">Memory</p>
                  <p className="panel__meta">Consolidation cycles</p>
                </div>
              </li>
              <li className="panel__item">
                <div>
                  <p className="panel__title">Destinations</p>
                  <p className="panel__meta">Telegram, Slack, X, Email</p>
                </div>
              </li>
            </ul>
            <div className="panel__footer">Monitor agent health in real-time</div>
          </div>
        </section>
      </main>
    </div>
  );
}
