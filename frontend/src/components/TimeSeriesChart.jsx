import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Activity } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function TimeSeriesChart({ data, alignmentMethod, cutoffStrategy }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-card-editorial">
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-muted)' }}>
          <p className="tabular-nums">No time-series data available for the selected filters.</p>
        </div>
      </div>
    );
  }

  // Format labels: "05 Jan 14:00"
  const labels = data.map((d) => {
    const dt = new Date(d.timestamp);
    const day = String(dt.getUTCDate()).padStart(2, '0');
    const month = dt.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const hour = String(dt.getUTCHours()).padStart(2, '0') + ':00';
    return `${day} ${month} ${hour}`;
  });

  const actuals = data.map((d) => d.actual_mw);
  const forecasts = data.map((d) => d.forecast_mw);

  // Compute maximum values for header metadata
  const validActuals = actuals.filter((v) => v !== null && v !== undefined);
  const maxActual = validActuals.length > 0 ? Math.max(...validActuals) : 0;
  const validForecasts = forecasts.filter((v) => v !== null && v !== undefined);
  const maxForecast = validForecasts.length > 0 ? Math.max(...validForecasts) : 0;

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Actual Generation (FUELHH)',
        data: actuals,
        borderColor: '#0B806B',
        backgroundColor: 'rgba(11, 128, 107, 0.05)',
        fill: false,
        tension: 0.15,
        borderWidth: 2,
        pointRadius: data.length > 96 ? 0 : 2,
        pointHoverRadius: 5,
        pointBackgroundColor: '#0B806B',
        order: 2,
      },
      {
        label: 'Forecast at selected cutoff',
        data: forecasts,
        borderColor: '#537DA7',
        backgroundColor: 'rgba(83, 125, 167, 0.04)',
        borderDash: [5, 4],
        fill: false,
        tension: 0.15,
        borderWidth: 2,
        pointRadius: data.length > 96 ? 0 : 2,
        pointHoverRadius: 5,
        pointBackgroundColor: '#537DA7',
        order: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#18352D',           // Deep Forest Ink
        titleColor: '#F6F5EF',
        bodyColor: '#D8D4C7',
        borderColor: '#536B63',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 4,
        titleFont: {
          family: 'Inter',
          size: 12,
          weight: '600',
        },
        bodyFont: {
          family: 'JetBrains Mono',
          size: 11,
        },
        callbacks: {
          title: (tooltipItems) => {
            const idx = tooltipItems[0].dataIndex;
            return `Delivery Interval: ${data[idx].timestamp} UTC`;
          },
          label: (context) => {
            const val = context.raw;
            if (val === null || val === undefined) return `${context.dataset.label}: Missing Interval`;
            return `${context.dataset.label}: ${val.toLocaleString()} MW`;
          },
          afterBody: (tooltipItems) => {
            const idx = tooltipItems[0].dataIndex;
            const pt = data[idx];
            const lines = [];
            if (pt.error_mw !== null && pt.error_mw !== undefined) {
              const sign = pt.error_mw > 0 ? '+' : '';
              const direction = pt.error_mw > 0
                ? 'Wind below forecast (backup shortfall risk)'
                : 'Wind above forecast (potential excess procurement)';
              lines.push(`Net Delta (F - A): ${sign}${pt.error_mw.toLocaleString()} MW [${direction}]`);
            }
            if (pt.vintage_publish_time) {
              lines.push(`Forecast published: ${pt.vintage_publish_time} UTC`);
            }
            if (pt.status === 'missing_forecast') {
              lines.push('⚠️ Missing Vintage: Look-ahead prevented publication inclusion');
            }
            return lines;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(216, 212, 199, 0.4)',  // Subtle hairline grey-green
        },
        ticks: {
          color: '#536B63',
          font: {
            family: 'JetBrains Mono',
            size: 10,
          },
          maxTicksLimit: 12,
        },
      },
      y: {
        grid: {
          color: 'rgba(216, 212, 199, 0.4)',
        },
        ticks: {
          color: '#536B63',
          font: {
            family: 'JetBrains Mono',
            size: 10,
          },
          callback: (value) => `${value.toLocaleString()} MW`,
        },
        title: {
          display: true,
          text: 'Generation Output (MW)',
          color: '#536B63',
          font: {
            family: 'Inter',
            size: 10,
            weight: '600',
          },
        },
      },
    },
  };

  return (
    <div className="chart-card-editorial">
      <div className="chart-header-editorial">
        <div>
          <div className="chart-title-editorial">
            <Activity size={15} style={{ color: 'var(--color-forecast)' }} />
            <span>Selected forecast vs wind outturn</span>
          </div>
          <div className="chart-subtitle-editorial">
            WINDFOR forecast · FUELHH actual · {alignmentMethod === 'hourly_mean' ? 'Hourly mean' : 'Exact hour (:00)'}
          </div>
        </div>

        <div className="chart-legend-editorial">
          <div className="legend-item-editorial">
            <span className="legend-line-actual" />
            <span>Actual outturn</span>
          </div>
          <div className="legend-item-editorial">
            <span className="legend-line-forecast" />
            <span>Forecast at cutoff</span>
          </div>
        </div>
      </div>

      <div className="chart-wrapper-editorial">
        <Line data={chartData} options={options} />
      </div>

      <div className="chart-footer-meta">
        <span>MAX OUTTURN: <strong className="tabular-nums" style={{ color: 'var(--ink-primary)' }}>{maxActual.toLocaleString()} MW</strong></span>
        <span>·</span>
        <span>MAX FORECAST: <strong className="tabular-nums" style={{ color: 'var(--ink-primary)' }}>{maxForecast.toLocaleString()} MW</strong></span>
        <span>·</span>
        <span>DELIVERY HOURS IN VIEW: <strong className="tabular-nums" style={{ color: 'var(--ink-primary)' }}>{data.length}</strong></span>
        <span>·</span>
        <span>SOURCE: ELEXON BMRS P305 STREAM</span>
      </div>
    </div>
  );
}
