import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { BarChart3 } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function ErrorDistributionChart({ data }) {
  if (!data || data.length === 0) {
    return null;
  }

  // Format labels
  const labels = data.map((d) => {
    const dt = new Date(d.timestamp);
    const day = String(dt.getUTCDate()).padStart(2, '0');
    const hour = String(dt.getUTCHours()).padStart(2, '0') + ':00';
    return `${day}d ${hour}`;
  });

  const errors = data.map((d) => (d.error_mw !== null && d.error_mw !== undefined ? d.error_mw : 0));
  const backgroundColors = data.map((d) => {
    if (d.error_mw === null || d.error_mw === undefined) return 'transparent';
    return d.error_mw >= 0 ? 'rgba(245, 158, 11, 0.7)' : 'rgba(244, 63, 94, 0.7)';
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Hourly Error (Forecast − Actual MW)',
        data: errors,
        backgroundColor: backgroundColors,
        borderWidth: 0,
        borderRadius: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 20, 34, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          title: (tooltipItems) => {
            const idx = tooltipItems[0].dataIndex;
            return `Target: ${data[idx].timestamp} UTC`;
          },
          label: (context) => {
            const val = context.raw;
            const sign = val > 0 ? '+' : '';
            const status = val > 0 ? 'Over-forecast (Surplus)' : val < 0 ? 'Under-forecast (Short)' : 'Exact';
            return `Error: ${sign}${val.toLocaleString()} MW [${status}]`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#64748b',
          font: {
            family: 'JetBrains Mono',
            size: 10,
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
            size: 10,
          },
          callback: (value) => `${value.toLocaleString()} MW`,
        },
        title: {
          display: true,
          text: 'Forecast Deviation (MW)',
          color: '#64748b',
          font: {
            family: 'Inter',
            size: 11,
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
            <BarChart3 size={18} style={{ color: 'var(--color-surplus)' }} />
            Hourly Forecast Imbalance Error (Forecast − Actual)
          </h2>
          <p>
            Amber bars represent Over-forecasting (surplus utility volume). Crimson bars represent Under-forecasting (short imbalance exposure).
          </p>
        </div>

        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: 'var(--color-surplus)' }} />
            <span>Over-forecast (+)</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: 'var(--color-short)' }} />
            <span>Under-forecast (−)</span>
          </div>
        </div>
      </div>

      <div className="chart-wrapper-sm">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
