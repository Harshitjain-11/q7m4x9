import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import ControlBar from './components/ControlBar';
import KpiGrid from './components/KpiGrid';
import TimeSeriesChart from './components/TimeSeriesChart';
import ErrorDistributionChart from './components/ErrorDistributionChart';
import DailyPerformanceTable from './components/DailyPerformanceTable';
import DataQualityAudit from './components/DataQualityAudit';
import { Info, AlertTriangle } from 'lucide-react';

export default function App() {
  const [health, setHealth] = useState(null);
  const [summary, setSummary] = useState(null);
  const [timeSeries, setTimeSeries] = useState([]);
  
  const [cutoff, setCutoff] = useState('da_dminus1_12');
  const [alignment, setAlignment] = useState('exact');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch application health status
  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (err) {
      console.error('Failed to fetch health:', err);
    }
  };

  // Fetch summary KPIs and audit reports
  const fetchSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        cutoff,
        alignment,
      });
      const res = await fetch(`/api/summary?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Summary API returned ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
      setError(err.message);
    }
  }, [cutoff, alignment]);

  // Fetch time series data points
  const fetchTimeSeries = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        cutoff,
        alignment,
      });
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await fetch(`/api/timeseries?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Time series API returned ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setTimeSeries(data.data || []);
    } catch (err) {
      console.error('Failed to fetch time series:', err);
      setError(err.message);
    }
  }, [cutoff, alignment, startDate, endDate]);

  // Initial load
  useEffect(() => {
    fetchHealth();
  }, []);

  // Synchronize on parameter changes
  useEffect(() => {
    let isCancelled = false;
    const loadAll = async () => {
      setLoading(true);
      setError(null);
      await Promise.all([fetchSummary(), fetchTimeSeries()]);
      if (!isCancelled) setLoading(false);
    };
    loadAll();
    return () => {
      isCancelled = true;
    };
  }, [fetchSummary, fetchTimeSeries]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchHealth(), fetchSummary(), fetchTimeSeries()]);
    setRefreshing(false);
  };

  return (
    <div className="app-container">
      <Header health={health} isRefreshing={refreshing} onRefresh={handleRefresh} />

      <ControlBar
        cutoff={cutoff}
        setCutoff={setCutoff}
        alignment={alignment}
        setAlignment={setAlignment}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
      />

      <main className="main-content">
        {/* Anti-Lookahead & Strategy Banner */}
        <div className="info-banner">
          <Info size={18} style={{ color: 'var(--color-forecast)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Purchasing Decision Cutoff: </strong>
            <span>
              {cutoff.startsWith('da_')
                ? `Simulating Day-Ahead auction decisions on Day D-1. Target delivery hours on Jan 1st are strictly excluded (missing prior D-1 vintage) to prevent look-ahead bias.`
                : cutoff.startsWith('rolling_')
                ? `Simulating rolling gate closure. Only forecasts published at least ${cutoff.replace('rolling_', '')} ahead of each delivery interval are utilized.`
                : `Real-time pre-delivery benchmark using the latest available forecast published prior to delivery interval start.`}
            </span>
          </div>
        </div>

        {error && (
          <div className="info-banner" style={{ borderLeftColor: 'var(--color-short)', background: 'rgba(244, 63, 94, 0.1)' }}>
            <AlertTriangle size={18} style={{ color: 'var(--color-short)', flexShrink: 0 }} />
            <div>
              <strong>Error Loading Data: </strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Real Computed KPI Cards */}
        <KpiGrid metrics={summary?.metrics} alignment={summary?.alignment} />

        {/* Primary Actual vs Forecast Chart */}
        <TimeSeriesChart
          data={timeSeries}
          alignmentMethod={alignment}
          cutoffStrategy={cutoff}
        />

        {/* Hourly Forecast Error / Imbalance Risk */}
        <ErrorDistributionChart data={timeSeries} />

        {/* Daily Breakdown Table */}
        <DailyPerformanceTable
          dailyMetrics={summary?.daily_metrics}
          cutoffStrategy={cutoff}
        />

        {/* Comprehensive Data Integrity & Quality Audit */}
        <DataQualityAudit
          quality={summary?.quality}
          alignment={summary?.alignment}
        />
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '1.5rem',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
      }}>
        WindLens — Gridbricks Full Stack SWE Challenge | Elexon BMRS WINDFOR & FUELHH Evaluation Engine | React + FastAPI
      </footer>
    </div>
  );
}
