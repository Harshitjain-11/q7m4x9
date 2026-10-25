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
      <div className="chart-card">
        <div className="state-container">
          <p style={{ color: 'var(--text-muted)' }}>No time series data available for the selected filters.</p>
        </div>
      </div>
    );
  }

  // Format labels: "Jan 05 14:00"
  const labels = data.map((d) => {
    const dt = new Date(d.timestamp);
    const month = dt.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const day = String(dt.getUTCDate()).padStart(2, '0');
    const hour = String(dt.getUTCHours()).padStart(2, '0') + ':00';
    return `${month} ${day} ${hour}`;
  });

  const actuals = data.map((d) => d.actual_mw);
  const forecasts = data.map((d) => d.forecast_mw);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Actual Wind Generation (MW)',
        data: actuals,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        fill: true,
        tension: 0.15,
        borderWidth: 2,
        pointRadius: data.length > 100 ? 0 : 2,
        pointHoverRadius: 5,
        pointBackgroundColor: '#10b981',
      },
      {
        label: 'Day-Ahead Wind Forecast (MW)',
        data: forecasts,
        borderColor: '#38bdf8',
        backgroundColor: 'transparent',
        borderDash: [],
        tension: 0.15,
        borderWidth: 2,
        pointRadius: data.length > 100 ? 0 : 2,
        pointHoverRadius: 5,
        pointBackgroundColor: '#38bdf8',
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
        display: false, // We have a custom styled legend in the header
      },
      tooltip: {
        backgroundColor: 'rgba(15, 20, 34, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        titleFont: {
          family: 'Inter',
          size: 13,
          weight: '600',
        },
        bodyFont: {
          family: 'JetBrains Mono',
          size: 12,
        },
        callbacks: {
          title: (tooltipItems) => {
            const idx = tooltipItems[0].dataIndex;
            return `Target: ${data[idx].timestamp} UTC`;
          },
          afterBody: (tooltipItems) => {
            const idx = tooltipItems[0].dataIndex;
            const pt = data[idx];
            const lines = [];
            if (pt.error_mw !== null && pt.error_mw !== undefined) {
              const sign = pt.error_mw > 0 ? '+' : '';
              lines.push(`Error (F - A): ${sign}${pt.error_mw.toLocaleString()} MW`);
            }
            if (pt.vintage_publish_time) {
              lines.push(`Vintage Published: ${pt.vintage_publish_time} UTC`);
            }
            if (pt.lead_time_hours !== null && pt.lead_time_hours !== undefined) {
              lines.push(`Lead Time: ${pt.lead_time_hours} hrs`);
            }
            if (pt.status === 'missing_forecast') {
              lines.push('⚠️ No forecast published prior to cutoff (look-ahead protected)');
            }
            return lines;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
        },
        ticks: {
          color: '#64748b',
          font: {
            family: 'JetBrains Mono',
            size: 11,
          },
          maxTicksLimit: 14,
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#64748b',
          font: {
            family: 'JetBrains Mono',
            size: 11,
          },
          callback: (value) => `${value.toLocaleString()} MW`,
        },
        title: {
          display: true,
          text: 'Generation / Forecast (MW)',
          color: '#64748b',
          font: {
            family: 'Inter',
            size: 11,
            weight: '500',
          },
        },
      },
    },
  };

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title-group">
          <h2>
            <Activity size={18} style={{ color: 'var(--color-forecast)' }} />
            Wind Generation: Day-Ahead Forecast vs Actual Generation
          </h2>
          <p>
            Evaluated delivery window: January 2026 UTC. Hourly resolution ({alignmentMethod === 'hourly_mean' ? 'Hourly Mean Actuals' : 'Exact Timestamp Match'}).
          </p>
        </div>

        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: 'var(--color-actual)' }} />
            <span>Actual (FUELHH)</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: 'var(--color-forecast)' }} />
            <span>Forecast (WINDFOR)</span>
          </div>
        </div>
      </div>

      <div className="chart-wrapper">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
