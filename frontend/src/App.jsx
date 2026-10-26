import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Clock3, RefreshCw, ShieldCheck } from 'lucide-react';
import Header from './components/Header';
import ControlBar from './components/ControlBar';
import KpiGrid from './components/KpiGrid';
import TimeSeriesChart from './components/TimeSeriesChart';
import ErrorDistributionChart from './components/ErrorDistributionChart';
import DailyPerformanceTable from './components/DailyPerformanceTable';
import DeliveryIntervalsTable from './components/DeliveryIntervalsTable';
import DataQualityAudit from './components/DataQualityAudit';
import LandingPage from './components/LandingPage';
import { apiUrl } from './api';

const tabForPath = (path) => {
  if (path.includes('/analysis')) return 'forecast';
  if (path.includes('/data-quality')) return 'quality';
  if (path.includes('/methodology')) return 'methodology';
  return 'overview';
};

const cutoffLabel = (cutoff) => ({
  da_dminus1_11: 'D−1 · 11:00 UTC',
  da_dminus1_12: 'D−1 · 12:00 UTC',
  da_dminus1_17: 'D−1 · 17:00 UTC',
  rolling_24h: '24 hours ahead',
  rolling_12h: '12 hours ahead',
  rolling_4h: '4 hours ahead',
  latest_predelivery: 'Latest before delivery',
}[cutoff] || 'Day-ahead cutoff');

const cutoffName = (cutoff) => ({
  overview: 'Position overview',
  forecast: 'Forecast review',
  quality: 'Data integrity',
  methodology: 'Method notes',
}[cutoff] || 'Wind forecast desk');

function DeskWorkspace() {
  const location = useLocation();
  const activeTab = tabForPath(location.pathname);
  const [health, setHealth] = useState(null);
  const [summary, setSummary] = useState(null);
  const [timeSeries, setTimeSeries] = useState([]);
  const [cutoffSensitivity, setCutoffSensitivity] = useState(null);
  const [cutoff, setCutoff] = useState('da_dminus1_12');
  const [alignment, setAlignment] = useState('exact');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-01-07');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [utcTime, setUtcTime] = useState('');

  const periodLabel = useMemo(() => {
    if (!startDate && !endDate) return 'January 2026';
    return `${startDate || '2026-01-01'} — ${endDate || '2026-01-31'}`;
  }, [startDate, endDate]);

  const summaryUrl = useCallback((strategy = cutoff) => {
    const params = new URLSearchParams({ cutoff: strategy, alignment });
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    return apiUrl(`/api/summary?${params.toString()}`);
  }, [cutoff, alignment, startDate, endDate]);

  const fetchHealth = useCallback(async () => {
    const response = await fetch(apiUrl('/api/health'));
    if (!response.ok) throw new Error(`Health check returned ${response.status}`);
    setHealth(await response.json());
  }, []);

  const fetchSummary = useCallback(async () => {
    const response = await fetch(summaryUrl());
    if (!response.ok) throw new Error(`Summary request returned ${response.status}`);
    setSummary(await response.json());
  }, [summaryUrl]);

  const fetchTimeSeries = useCallback(async () => {
    const params = new URLSearchParams({ cutoff, alignment });
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    const response = await fetch(apiUrl(`/api/timeseries?${params.toString()}`));
    if (!response.ok) throw new Error(`Delivery series request returned ${response.status}`);
    const result = await response.json();
    setTimeSeries(result.data || []);
  }, [cutoff, alignment, startDate, endDate]);

  const fetchCutoffSensitivity = useCallback(async () => {
    const [noonResponse, eveningResponse] = await Promise.all([
      fetch(summaryUrl('da_dminus1_12')),
      fetch(summaryUrl('da_dminus1_17')),
    ]);
    if (!noonResponse.ok || !eveningResponse.ok) throw new Error('Cutoff comparison could not be loaded');
    const [noon, evening] = await Promise.all([noonResponse.json(), eveningResponse.json()]);
    setCutoffSensitivity({ noon: noon.metrics, evening: evening.metrics });
  }, [summaryUrl]);

  const loadWorkspace = useCallback(async () => {
    setError('');
    try {
      await Promise.all([fetchHealth(), fetchSummary(), fetchTimeSeries(), fetchCutoffSensitivity()]);
    } catch (requestError) {
      setError(requestError.message || 'The data service could not be reached.');
    } finally {
      setLoading(false);
    }
  }, [fetchHealth, fetchSummary, fetchTimeSeries, fetchCutoffSensitivity]);

  useEffect(() => {
    setLoading(true);
    loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    const updateClock = () => setUtcTime(new Date().toISOString().slice(11, 16));
    updateClock();
    const timer = setInterval(updateClock, 30000);
    return () => clearInterval(timer);
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await loadWorkspace();
    setRefreshing(false);
  };

  const metrics = summary?.metrics;
  const biasDirection = metrics?.bias_mw > 0 ? 'over' : metrics?.bias_mw < 0 ? 'under' : 'balanced';
  const maeChange = cutoffSensitivity?.noon?.mae_mw
    ? ((cutoffSensitivity.noon.mae_mw - cutoffSensitivity.evening.mae_mw) / cutoffSensitivity.noon.mae_mw) * 100
    : null;

  const pageHeading = activeTab === 'overview'
    ? ['Forecast position', 'Compare the day-ahead wind view with settled generation.']
    : activeTab === 'forecast'
      ? ['Forecast review', 'Inspect the selected vintage and compare decision cutoffs.']
      : activeTab === 'quality'
        ? ['Data integrity', 'Trace the source records, boundaries, and delivery-hour coverage.']
        : ['Method notes', 'How the replay selects forecast vintages and scores forecast error.'];

  return (
    <div className="app-container">
      <Header activeTab={activeTab} health={health} />
      <div className="workspace-main">
        <header className="workspace-topline">
          <div className="breadcrumb"><span>WIND PROCUREMENT</span><span className="breadcrumb-divider">/</span><strong>{cutoffName(activeTab)}</strong></div>
          <div className="topline-actions">
            <div className={`topline-status ${health?.status === 'healthy' ? 'is-ready' : ''}`}>
              <span className="topline-status-dot" />
              {health?.status === 'healthy' ? 'Local data ready' : 'Checking data service'}
            </div>
            <span className="topline-clock"><Clock3 size={14} /> {utcTime || '--:--'} UTC</span>
            <button type="button" className="refresh-button" onClick={refresh} disabled={refreshing}>
              <RefreshCw size={14} className={refreshing ? 'is-spinning' : ''} />
              {refreshing ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
        </header>

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
          {error && (
            <div className="service-notice" role="alert">
              <AlertTriangle size={17} />
              <span><strong>Data service unavailable.</strong> {error}</span>
              <button type="button" onClick={refresh}>Try again</button>
            </div>
          )}

          <div className="page-intro">
            <div>
              <span className="page-kicker">GB WIND · DECISION REPLAY</span>
              <h1>{pageHeading[0]}</h1>
              <p>{pageHeading[1]}</p>
            </div>
            <div className="page-context">
              <span className="context-label">DELIVERY WINDOW</span>
              <strong>{periodLabel}</strong>
              <span>{cutoffLabel(cutoff)} <i>·</i> {alignment === 'exact' ? 'Exact hour' : 'Hourly mean'}</span>
            </div>
          </div>

          {loading && !summary ? (
            <div className="loading-state"><span className="loading-spinner" /> Loading January settlement records…</div>
          ) : activeTab === 'overview' ? (
            <>
              <KpiGrid metrics={metrics} alignment={summary?.alignment} />
              <div className="overview-grid">
                <section className="panel chart-panel">
                  <TimeSeriesChart data={timeSeries} alignmentMethod={alignment} cutoffStrategy={cutoff} />
                </section>
                <aside className="desk-brief">
                  <div className="brief-header"><span className="brief-icon"><Activity size={16} /></span><span>DECISION READOUT</span></div>
                  <div className="brief-cutoff"><span>Forecast cutoff</span><strong>{cutoffLabel(cutoff)}</strong></div>
                  <div className={`brief-signal ${biasDirection === 'over' ? 'signal-amber' : biasDirection === 'under' ? 'signal-teal' : 'signal-neutral'}`}>
                    {biasDirection === 'over' ? <ArrowUpRight size={17} /> : biasDirection === 'under' ? <ArrowDownRight size={17} /> : <Activity size={17} />}
                    <div><strong>{biasDirection === 'over' ? 'Wind over-forecast' : biasDirection === 'under' ? 'Wind under-forecast' : 'Wind bias balanced'}</strong><span>{biasDirection === 'over' ? 'Actual generation came in below the selected forecast.' : biasDirection === 'under' ? 'Actual generation came in above the selected forecast.' : 'Forecast and actual generation were aligned on average.'}</span></div>
                  </div>
                  <div className="brief-comparison">
                    <div className="brief-comparison-title"><span>Cutoff sensitivity</span><span>MAE · MW</span></div>
                    <div><span>D−1 · 12:00</span><strong>{cutoffSensitivity ? Math.round(cutoffSensitivity.noon.mae_mw).toLocaleString() : '—'}</strong></div>
                    <div><span>D−1 · 17:00</span><strong>{cutoffSensitivity ? Math.round(cutoffSensitivity.evening.mae_mw).toLocaleString() : '—'}</strong></div>
                    {maeChange !== null && <small>{maeChange >= 0 ? 'Lower' : 'Higher'} MAE at 17:00 by {Math.abs(maeChange).toFixed(1)}%</small>}
                  </div>
                  <p className="brief-caveat"><ShieldCheck size={14} /> Volume accuracy only. No price or cash impact is calculated.</p>
                </aside>
              </div>
              <ErrorDistributionChart data={timeSeries} />
              <DailyPerformanceTable dailyMetrics={summary?.daily_metrics} cutoffStrategy={cutoff} />
            </>
          ) : activeTab === 'forecast' ? (
            <>
              <section className="panel comparison-panel">
                <div className="section-heading"><div><span className="page-kicker">VINTAGE COMPARISON</span><h2>What changes when the decision moves later?</h2></div><span className="comparison-period">{periodLabel}</span></div>
                <div className="comparison-metrics">
                  <div><span>D−1 · 12:00 UTC</span><strong>{cutoffSensitivity ? Math.round(cutoffSensitivity.noon.mae_mw).toLocaleString() : '—'} <small>MW MAE</small></strong></div>
                  <div><span>D−1 · 17:00 UTC</span><strong>{cutoffSensitivity ? Math.round(cutoffSensitivity.evening.mae_mw).toLocaleString() : '—'} <small>MW MAE</small></strong></div>
                  <div><span>Relative change</span><strong>{maeChange === null ? '—' : `${maeChange.toFixed(1)}%`} <small>at 17:00</small></strong></div>
                </div>
                <p className="comparison-note">Each value is recomputed from the same delivery window and alignment. This compares forecast accuracy only; it does not estimate cash savings or trading outcomes.</p>
              </section>
              <section className="panel chart-panel"><TimeSeriesChart data={timeSeries} alignmentMethod={alignment} cutoffStrategy={cutoff} /></section>
              <DeliveryIntervalsTable data={timeSeries} cutoff={cutoff} />
            </>
          ) : activeTab === 'quality' ? (
            <>
              <section className="coverage-banner">
                <div className="coverage-mark"><ShieldCheck size={20} /></div>
                <div><strong>{summary?.alignment?.coverage_pct ?? '—'}% of selected delivery hours matched</strong><span>{summary?.alignment?.matched_observations ?? '—'} paired hours from {summary?.alignment?.total_target_hours ?? '—'} possible in this window.</span></div>
                <span className="coverage-cutoff">{cutoffLabel(cutoff)}</span>
              </section>
              <DataQualityAudit quality={summary?.quality} alignment={summary?.alignment} isDedicatedView />
              <DailyPerformanceTable dailyMetrics={summary?.daily_metrics} cutoffStrategy={cutoff} />
            </>
          ) : (
            <section className="method-notes-grid">
              <article className="panel method-note-card">
                <span className="method-number">01</span><h2>Pair the right forecast</h2>
                <p>For every delivery hour, the replay keeps the latest WINDFOR record published on or before the selected decision cutoff. Later records are not eligible for that historical decision.</p>
                <div className="method-equation">publishTime ≤ decision cutoff</div>
                <ul><li>Day-ahead cutoffs are measured on the previous UTC date.</li><li>Rolling cutoffs require the chosen lead time before delivery.</li><li>January 1 has no prior-day vintage in the supplied file.</li></ul>
              </article>
              <article className="panel method-note-card">
                <span className="method-number">02</span><h2>Align forecasts with outturn</h2>
                <p>WINDFOR is hourly and FUELHH is half-hourly. Choose a consistent comparison method before reading the error metrics.</p>
                <div className="method-equation">error = forecast MW − actual MW</div>
                <ul><li><strong>Exact hour:</strong> match the :00 actual to each hourly forecast.</li><li><strong>Hourly mean:</strong> average both half-hour actuals within the hour.</li><li>Positive bias means forecast wind exceeded actual outturn.</li></ul>
              </article>
              <article className="panel method-note-card method-note-wide">
                <span className="method-number">03</span><h2>Read the measures in context</h2>
                <div className="metric-definitions">
                  <div><strong>MAE</strong><span>Mean absolute error in MW across matched hours.</span></div>
                  <div><strong>RMSE</strong><span>Root mean squared error; larger misses contribute more.</span></div>
                  <div><strong>Bias</strong><span>Signed mean error. Positive is forecast above actual.</span></div>
                  <div><strong>WAPE</strong><span>Total absolute error divided by total actual generation.</span></div>
                  <div><strong>Coverage</strong><span>Matched forecast and actual pairs divided by target hours.</span></div>
                </div>
                <p className="comparison-note">This pilot uses the supplied national wind datasets. It does not include demand, market prices, dispatch constraints, or a financial P&amp;L.</p>
              </article>
            </section>
          )}
        </main>

        <footer className="workspace-footer"><span>WINDLENS <i>·</i> UK WIND PROCUREMENT REVIEW</span><span><ShieldCheck size={13} /> Elexon BMRS · All times UTC</span></footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app/*" element={<DeskWorkspace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
