import React from 'react';
import { Target, TrendingUp, Compass, Zap, Percent, CheckCircle2, AlertCircle } from 'lucide-react';

export default function KpiGrid({ metrics, alignment }) {
  if (!metrics) {
    return (
      <div className="kpi-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-title">Loading KPI...</div>
            <div className="kpi-value" style={{ opacity: 0.3 }}>---</div>
          </div>
        ))}
      </div>
    );
  }

  const isPositiveBias = metrics.bias_mw > 0;
  const biasLabel = isPositiveBias ? 'Over-forecast' : metrics.bias_mw < 0 ? 'Under-forecast' : 'Zero Bias';
  const biasColor = isPositiveBias ? 'var(--color-surplus)' : 'var(--color-short)';

  return (
    <div className="kpi-grid">
      {/* MAE */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Mean Absolute Error</span>
          <Target className="kpi-icon" />
        </div>
        <div className="kpi-value tabular-nums">
          {metrics.mae_mw?.toLocaleString()}
          <span className="kpi-unit">MW</span>
        </div>
        <div className="kpi-subtitle">
          Average magnitude of hourly purchasing deviation
        </div>
      </div>

      {/* RMSE */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Root Mean Squared Error</span>
          <TrendingUp className="kpi-icon" />
        </div>
        <div className="kpi-value tabular-nums">
          {metrics.rmse_mw?.toLocaleString()}
          <span className="kpi-unit">MW</span>
        </div>
        <div className="kpi-subtitle">
          Penalizes large volumetric forecasting shocks
        </div>
      </div>

      {/* Bias / Mean Error */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">System Bias (Mean Error)</span>
          <Compass className="kpi-icon" />
        </div>
        <div className="kpi-value tabular-nums" style={{ color: biasColor }}>
          {metrics.bias_mw > 0 ? `+${metrics.bias_mw.toLocaleString()}` : metrics.bias_mw?.toLocaleString()}
          <span className="kpi-unit">MW</span>
        </div>
        <div className="kpi-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontWeight: 600, color: biasColor }}>{biasLabel}</span>
          <span>(Forecast − Actual)</span>
        </div>
      </div>

      {/* WAPE */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">WAPE</span>
          <Percent className="kpi-icon" />
        </div>
        <div className="kpi-value tabular-nums">
          {metrics.wape_pct}%
        </div>
        <div className="kpi-subtitle">
          Normalized error: {metrics.nrmse_pct}% nRMSE
        </div>
      </div>

      {/* Correlation */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Correlation (Pearson r)</span>
          <Zap className="kpi-icon" />
        </div>
        <div className="kpi-value tabular-nums">
          {metrics.correlation}
        </div>
        <div className="kpi-subtitle">
          Tracking linearity between forecast and actuals
        </div>
      </div>

      {/* Evaluation Coverage */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Evaluated Coverage</span>
          {metrics.coverage_pct >= 95 ? (
            <CheckCircle2 className="kpi-icon" style={{ color: 'var(--color-actual)' }} />
          ) : (
            <AlertCircle className="kpi-icon" style={{ color: 'var(--color-surplus)' }} />
          )}
        </div>
        <div className="kpi-value tabular-nums">
          {metrics.coverage_pct}%
        </div>
        <div className="kpi-subtitle">
          {metrics.matched_count} / {alignment?.total_target_hours_january || 744} hours matched
        </div>
      </div>
    </div>
  );
}
