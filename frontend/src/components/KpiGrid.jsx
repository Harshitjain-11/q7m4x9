import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, Gauge, Target, TrendingUp } from 'lucide-react';

const number = (value, digits = 0) => Number(value ?? 0).toLocaleString(undefined, {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits,
});

export default function KpiGrid({ metrics, alignment }) {
  if (!metrics) {
    return (
      <section className="metrics-grid" aria-label="Performance metrics" aria-busy="true">
        {[0, 1, 2, 3].map((item) => <div className="metric-card metric-skeleton" key={item} />)}
      </section>
    );
  }

  const biasPositive = metrics.bias_mw > 0;
  const cards = [
    {
      label: 'Mean absolute error',
      value: number(metrics.mae_mw),
      unit: 'MW',
      note: 'Average size of hourly forecast miss',
      icon: Target,
      tone: 'neutral',
    },
    {
      label: 'Mean forecast bias',
      value: `${metrics.bias_mw > 0 ? '+' : ''}${number(metrics.bias_mw)}`,
      unit: 'MW',
      note: biasPositive ? 'Forecast wind above actual outturn' : metrics.bias_mw < 0 ? 'Actual wind above forecast' : 'Forecast and outturn balanced on average',
      icon: TrendingUp,
      tone: biasPositive ? 'amber' : metrics.bias_mw < 0 ? 'teal' : 'neutral',
    },
    {
      label: 'Matched coverage',
      value: number(metrics.coverage_pct, 1),
      unit: '%',
      note: `${number(metrics.matched_count)} of ${number(alignment?.total_target_hours)} delivery hours`,
      icon: CheckCircle2,
      tone: metrics.coverage_pct >= 95 ? 'teal' : 'amber',
    },
    {
      label: 'Weighted absolute error',
      value: number(metrics.wape_pct, 1),
      unit: '%',
      note: 'Absolute error relative to actual generation',
      icon: Gauge,
      tone: 'neutral',
    },
  ];

  return (
    <section className="metrics-grid" aria-label="Performance metrics">
      {cards.map(({ label, value, unit, note, icon: Icon, tone }, index) => (
        <article className={`metric-card metric-${tone}`} key={label}>
          <div className="metric-topline">
            <span>{label}</span>
            <span className="metric-icon"><Icon size={16} strokeWidth={1.8} /></span>
          </div>
          <div className="metric-reading">
            <strong>{value}</strong>
            <span>{unit}</span>
          </div>
          <div className="metric-footline">
            {index === 0 && <Activity size={13} />}
            {index === 1 && <AlertTriangle size={13} />}
            {index === 2 && <CheckCircle2 size={13} />}
            {index === 3 && <Gauge size={13} />}
            <span>{note}</span>
          </div>
        </article>
      ))}
    </section>
  );
}
