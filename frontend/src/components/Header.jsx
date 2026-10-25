import React from 'react';
import { Wind, Activity, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function Header({ health, isRefreshing, onRefresh }) {
  const isHealthy = health?.status === 'healthy';

  return (
    <header className="top-nav">
      <div className="brand-wrapper">
        <div className="brand-icon">
          <Wind size={22} />
        </div>
        <div>
          <div className="brand-title">
            WindLens
            <span className="brand-badge">UK BMRS</span>
          </div>
          <div className="brand-subtitle">
            Elexon Wind Forecast vs Actuals Analytics for Day-Ahead Power Purchasing
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className="status-indicator" title={health?.message || 'Connecting to backend...'}>
          <span className={`status-dot ${isHealthy ? '' : 'degraded'}`} />
          <span>
            {isHealthy
              ? `Backend Connected (v${health?.version || '1.0'})`
              : 'Backend Connecting...'}
          </span>
        </div>
        
        <button
          className="btn-pill"
          onClick={onRefresh}
          disabled={isRefreshing}
          style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          <Activity size={14} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>
    </header>
  );
}
