import React from 'react';
import { CalendarDays, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';

export default function DailyPerformanceTable({ dailyMetrics, cutoffStrategy }) {
  if (!dailyMetrics || dailyMetrics.length === 0) {
    return null;
  }

  return (
    <div className="table-card-editorial">
      <div className="table-header-strip">
        <div className="table-title">
          <CalendarDays size={15} style={{ color: 'var(--ink-secondary)' }} />
          <span>Daily Aggregated Performance & Purchasing Accuracy</span>
          <span className="brand-badge tabular-nums">
            {dailyMetrics.length} Days
          </span>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)' }}>
          ELEXON BMRS SETTLEMENT AUDIT
        </div>
      </div>

      <div className="table-container-scroll">
        <table className="editorial-table">
          <thead>
            <tr>
              <th>Delivery Date</th>
              <th style={{ textAlign: 'right' }}>Evaluated Hours</th>
              <th style={{ textAlign: 'right' }}>MAE (MW)</th>
              <th style={{ textAlign: 'right' }}>RMSE (MW)</th>
              <th style={{ textAlign: 'right' }}>Daily Bias (MW)</th>
              <th style={{ textAlign: 'right' }}>Actual Energy</th>
              <th style={{ textAlign: 'right' }}>Forecast Energy</th>
              <th>Forecast pattern</th>
            </tr>
          </thead>
          <tbody>
            {dailyMetrics.map((row) => {
              const isOver = row.bias_mw > 0;
              const isHighDeviation = row.mae_mw > 3000;
              const biasColor = isOver ? 'var(--color-amber-risk)' : 'var(--color-forecast)';

              return (
                <tr key={row.date} className={isHighDeviation ? 'highlight-peak' : ''}>
                  <td className="tabular-nums" style={{ fontWeight: 600 }}>
                    {row.date}
                  </td>
                  <td className="tabular-nums" style={{ textAlign: 'right', color: 'var(--ink-secondary)' }}>
                    {row.observations}h
                  </td>
                  <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 600 }}>
                    {row.mae_mw.toLocaleString()} MW
                  </td>
                  <td className="tabular-nums" style={{ textAlign: 'right', color: 'var(--ink-secondary)' }}>
                    {row.rmse_mw.toLocaleString()} MW
                  </td>
                  <td className="tabular-nums" style={{ textAlign: 'right', color: biasColor, fontWeight: 600 }}>
                    {row.bias_mw > 0 ? `+${row.bias_mw.toLocaleString()}` : row.bias_mw.toLocaleString()} MW
                  </td>
                  <td className="tabular-nums" style={{ textAlign: 'right', color: 'var(--color-actual)' }}>
                    {row.actual_gwh.toLocaleString()} GWh
                  </td>
                  <td className="tabular-nums" style={{ textAlign: 'right', color: 'var(--color-forecast)' }}>
                    {row.forecast_gwh.toLocaleString()} GWh
                  </td>
                  <td>
                    {isHighDeviation ? (
                      <span className="tag-badge amber">
                        <AlertCircle size={10} /> High Forecast Error
                      </span>
                    ) : (
                      <span className="tag-badge emerald">
                        <CheckCircle size={10} /> Lower Error Day
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
