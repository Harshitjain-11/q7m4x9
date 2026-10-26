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
import { BarChart3, Clock, AlertTriangle } from 'lucide-react';

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

  // 1. Calculate Error Distribution Histogram Bins (-1200 to +1600 MW in 400 MW intervals)
  const binEdges = [-1200, -800, -400, 0, 400, 800, 1200, 1600];
  const binCounts = new Array(binEdges.length - 1).fill(0);
  const binLabels = [
    '<-800 MW',
    '-800 to -400',
    '-400 to 0',
    '0 to +400',
    '+400 to +800',
    '+800 to +1200',
    '>+1200 MW'
  ];

  let positiveCount = 0;
  let totalValid = 0;

  // 2. Calculate Diurnal Bias by Hour of Day (0 to 23 UTC)
  const hourlyErrorSum = new Array(24).fill(0);
  const hourlyCount = new Array(24).fill(0);

  data.forEach((d) => {
    if (d.error_mw !== null && d.error_mw !== undefined) {
      totalValid++;
      const err = d.error_mw;
      if (err > 0) positiveCount++;

      // Place in histogram bins
      if (err < -800) binCounts[0]++;
      else if (err < -400) binCounts[1]++;
      else if (err < 0) binCounts[2]++;
      else if (err < 400) binCounts[3]++;
      else if (err < 800) binCounts[4]++;
      else if (err < 1200) binCounts[5]++;
      else binCounts[6]++;

      // Diurnal binning
      const hour = new Date(d.timestamp).getUTCHours();
      hourlyErrorSum[hour] += err;
      hourlyCount[hour]++;
    }
  });

  const overforecastPct = totalValid > 0 ? Math.round((positiveCount / totalValid) * 100) : 0;

  // Histogram Colors: Emerald for balanced/negative, Amber for positive over-forecast risks
  const histogramColors = [
    '#247C8B',                        // Petrol teal (under-forecast)
    '#247C8B',
    '#14866D',                        // Emerald near 0
    '#C78336',                        // Burnt amber (over-forecast)
    '#C78336',
    '#C78336',
    '#C78336',
  ];

  const histChartData = {
    labels: binLabels,
    datasets: [
      {
        label: 'Frequency (Intervals)',
        data: binCounts,
        backgroundColor: histogramColors,
        borderWidth: 0,
        borderRadius: 2,
      },
    ],
  };

  const histOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#18352D',
        titleColor: '#F6F5EF',
        bodyColor: '#D8D4C7',
        titleFont: { family: 'Inter', size: 11, weight: '600' },
        bodyFont: { family: 'JetBrains Mono', size: 11 },
        callbacks: {
          label: (ctx) => `${ctx.raw} delivery intervals (${Math.round((ctx.raw / totalValid) * 100)}%)`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#536B63', font: { family: 'JetBrains Mono', size: 9.5 } },
      },
      y: {
        grid: { color: 'rgba(216, 212, 199, 0.4)' },
        ticks: { color: '#536B63', font: { family: 'JetBrains Mono', size: 10 } },
      },
    },
  };

  // Hourly Diurnal Profile Data
  const diurnalLabels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  const diurnalAverages = hourlyErrorSum.map((sum, i) =>
    hourlyCount[i] > 0 ? Math.round(sum / hourlyCount[i]) : 0
  );

  const diurnalColors = diurnalAverages.map((val) =>
    val >= 0 ? '#C78336' : '#247C8B'
  );

  const diurnalChartData = {
    labels: diurnalLabels,
    datasets: [
      {
        label: 'Mean Forecast Bias (MW)',
        data: diurnalAverages,
        backgroundColor: diurnalColors,
        borderWidth: 0,
        borderRadius: 2,
      },
    ],
  };

  const diurnalOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#18352D',
        titleColor: '#F6F5EF',
        bodyColor: '#D8D4C7',
        titleFont: { family: 'Inter', size: 11, weight: '600' },
        bodyFont: { family: 'JetBrains Mono', size: 11 },
        callbacks: {
          label: (ctx) => {
            const val = ctx.raw;
            return `Mean Bias: ${val > 0 ? '+' : ''}${val.toLocaleString()} MW`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#536B63', font: { family: 'JetBrains Mono', size: 9 }, maxTicksLimit: 12 },
      },
      y: {
        grid: { color: 'rgba(216, 212, 199, 0.4)' },
        ticks: {
          color: '#536B63',
          font: { family: 'JetBrains Mono', size: 10 },
          callback: (v) => `${v > 0 ? '+' : ''}${v} MW`,
        },
      },
    },
  };

  return (
    <div className="analytical-grid-2col">
      {/* Panel 1: Forecast Error Distribution */}
      <div className="chart-card-editorial">
        <div className="chart-header-editorial">
          <div>
            <div className="chart-title-editorial">
              <BarChart3 size={15} style={{ color: 'var(--color-amber-risk)' }} />
              <span>Forecast Error Distribution (MW)</span>
            </div>
            <div className="chart-subtitle-editorial">
              Binned Frequency of (Forecast − Actual) · Positive values indicate over-forecasting
            </div>
          </div>

          <span className="tag-badge amber">
            {overforecastPct}% Intervals Over-Forecast
          </span>
        </div>

        <div style={{ height: '240px', width: '100%', position: 'relative' }}>
          <Bar data={histChartData} options={histOptions} />
        </div>

        <div className="chart-footer-meta">
          <span>ZERO LINE: BALANCED</span>
          <span>·</span>
          <span>AMBER TAIL: IMBALANCE EXPOSURE (&gt;400 MW)</span>
        </div>
      </div>

      {/* Panel 2: Diurnal Bias by Delivery Hour */}
      <div className="chart-card-editorial">
        <div className="chart-header-editorial">
          <div>
            <div className="chart-title-editorial">
              <Clock size={15} style={{ color: 'var(--color-forecast)' }} />
              <span>Diurnal Bias Profile (24h UTC Cycle)</span>
            </div>
            <div className="chart-subtitle-editorial">
              Average Net Forecast Bias by Hour of Delivery across the evaluated window
            </div>
          </div>

          <span className="tag-badge" style={{ background: 'var(--bg-surface-sage)', border: '1px solid var(--border-hairline)', color: 'var(--ink-secondary)' }}>
            Morning Ramp Peak
          </span>
        </div>

        <div style={{ height: '240px', width: '100%', position: 'relative' }}>
          <Bar data={diurnalChartData} options={diurnalOptions} />
        </div>

        <div className="chart-footer-meta">
          <span>PEAK BIAS: MORNING RAMP (08:00–12:00 UTC)</span>
        </div>
      </div>
    </div>
  );
}
