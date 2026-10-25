import React from 'react';
import { CalendarDays, AlertCircle, CheckCircle } from 'lucide-react';

export default function DailyPerformanceTable({ dailyMetrics, cutoffStrategy }) {
  if (!dailyMetrics || dailyMetrics.length === 0) {
    return null;
  }

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title-group">
          <h2>
            <CalendarDays size={18} style={{ color: 'var(--color-forecast)' }} />
            Daily Forecast Performance & Purchasing Accuracy
          </h2>
          <p>
            Breakdown across January 2026. Useful for identifying extreme weather events and high-imbalance trading days.
          </p>
        </div>
      </div>

      <div className="data-table-container">
        <table className="styled-table">
          <thead>
            <tr>
              <th>Delivery Date</th>
              <th>Obs</th>
              <th>MAE (MW)</th>
              <th>RMSE (MW)</th>
              <th>System Bias (MW)</th>
              <th>Actual Energy</th>
              <th>Forecast Energy</th>
              <th>Imbalance Risk Profile</th>
            </tr>
          </thead>
          <tbody>
            {dailyMetrics.map((row) => {
              const isOver = row.bias_mw > 0;
              const biasColor = isOver ? 'var(--color-surplus)' : 'var(--color-short)';
              const isHighError = row.mae_mw > 3000;

              return (
                <tr key={row.date}>
                  <td className="tabular-nums" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {row.date}
                  </td>
                  <td className="tabular-nums">{row.observations}h</td>
                  <td className="tabular-nums">{row.mae_mw.toLocaleString()}</td>
                  <td className="tabular-nums">{row.rmse_mw.toLocaleString()}</td>
                  <td className="tabular-nums" style={{ color: biasColor, fontWeight: 500 }}>
                    {row.bias_mw > 0 ? `+${row.bias_mw.toLocaleString()}` : row.bias_mw.toLocaleString()}
                  </td>
                  <td className="tabular-nums">{row.actual_gwh.toLocaleString()} GWh</td>
                  <td className="tabular-nums">{row.forecast_gwh.toLocaleString()} GWh</td>
                  <td>
                    {isHighError ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-short)', fontSize: '0.75rem' }}>
                        <AlertCircle size={13} /> High Deviation Day
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-actual)', fontSize: '0.75rem' }}>
                        <CheckCircle size={13} /> Stable
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
