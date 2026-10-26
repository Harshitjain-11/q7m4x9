import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, BookOpen, Database, LayoutDashboard, LineChart, Wind } from 'lucide-react';

const sections = [
  {
    label: 'WORKSPACE',
    items: [
      { id: 'overview', label: 'Position overview', shortLabel: 'Overview', path: '/app', icon: LayoutDashboard },
      { id: 'forecast', label: 'Forecast review', shortLabel: 'Forecast', path: '/app/analysis', icon: LineChart },
    ],
  },
  {
    label: 'REFERENCE',
    items: [
      { id: 'quality', label: 'Data integrity', shortLabel: 'Data', path: '/app/data-quality', icon: Database },
      { id: 'methodology', label: 'Method notes', shortLabel: 'Method', path: '/app/methodology', icon: BookOpen },
    ],
  },
];

export default function Header({ activeTab, health }) {
  const navigate = useNavigate();
  const isHealthy = health?.status === 'healthy';

  return (
    <aside className="workspace-sidebar">
      <Link to="/" className="workspace-brand" aria-label="WindLens home">
        <span className="brand-mark"><Wind size={20} strokeWidth={2.2} /></span>
        <span className="brand-copy">
          <strong>WindLens</strong>
          <small>POWER DESK / GB</small>
        </span>
      </Link>

      <div className="sidebar-context">
        <span className="context-kicker">MARKET</span>
        <span className="context-value"><span className="market-dot" /> Great Britain</span>
        <span className="context-note">National wind portfolio</span>
      </div>

      <nav className="workspace-nav" aria-label="Workspace navigation">
        {sections.map((section) => (
          <div className="nav-section" key={section.label}>
            <span className="nav-section-label">{section.label}</span>
            {section.items.map(({ id, label, shortLabel, path, icon: Icon }) => (
              <button
                type="button"
                key={id}
                className={`workspace-nav-item ${activeTab === id ? 'is-active' : ''}`}
                aria-current={activeTab === id ? 'page' : undefined}
                onClick={() => navigate(path)}
              >
                <Icon size={17} strokeWidth={1.8} />
                <span className="nav-label">{label}</span>
                <span className="nav-short-label">{shortLabel}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="feed-card">
          <div className="feed-card-top">
            <span className={`feed-status-dot ${isHealthy ? 'is-live' : ''}`} />
            <span>{isHealthy ? 'DATA READY' : 'CONNECTING'}</span>
            <Activity size={14} />
          </div>
          <p>{isHealthy ? 'BMRS files loaded for review' : 'Checking local data service'}</p>
          {health?.status === 'degraded' && <small title={health.message}>Service unavailable</small>}
        </div>
        <div className="sidebar-footnote">ELEXON BMRS <span>·</span> JAN 2026</div>
      </div>
    </aside>
  );
}
