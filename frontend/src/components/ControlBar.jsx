import React from 'react';
import { Filter, Calendar, Clock, Layers } from 'lucide-react';

export default function ControlBar({
  cutoff,
  setCutoff,
  alignment,
  setAlignment,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}) {
  const handleQuickRange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="control-bar">
      {/* Forecast Decision Cutoff */}
      <div className="control-group">
        <span className="control-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={13} /> Forecast Decision Cutoff:
        </span>
        <select
          className="custom-select"
          value={cutoff}
          onChange={(e) => setCutoff(e.target.value)}
        >
          <optgroup label="Day-Ahead Cutoffs (Anti-Lookahead D-1)">
            <option value="da_dminus1_12">Day-Ahead D-1 12:00 UTC (Noon Benchmark)</option>
            <option value="da_dminus1_11">Day-Ahead D-1 11:00 UTC (EPEX/NordPool Auction)</option>
            <option value="da_dminus1_17">Day-Ahead D-1 17:00 UTC (Elexon Indicative)</option>
          </optgroup>
          <optgroup label="Rolling Lead Time Cutoffs">
            <option value="rolling_24h">Rolling 24h Lead Time</option>
            <option value="rolling_12h">Rolling 12h Lead Time</option>
            <option value="rolling_4h">Rolling 4h Lead Time</option>
          </optgroup>
          <optgroup label="Real-Time / Pre-Delivery">
            <option value="latest_predelivery">Latest Pre-Delivery (Lead Time ≥ 0h)</option>
          </optgroup>
        </select>
      </div>

      {/* Cadence Alignment */}
      <div className="control-group">
        <span className="control-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Layers size={13} /> Cadence Alignment:
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className={`btn-pill ${alignment === 'exact' ? 'active' : ''}`}
            onClick={() => setAlignment('exact')}
            title="Exact match on :00 hourly timestamps. Reports :30 actuals as unmatched."
          >
            Exact Match (:00 only)
          </button>
          <button
            className={`btn-pill ${alignment === 'hourly_mean' ? 'active' : ''}`}
            onClick={() => setAlignment('hourly_mean')}
            title="Averages :00 and :30 half-hourly actuals to match hourly forecast window."
          >
            Hourly Mean (:00 & :30)
          </button>
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="control-group">
        <span className="control-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Calendar size={13} /> Time Window:
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className={`btn-pill ${!startDate && !endDate ? 'active' : ''}`}
            onClick={() => handleQuickRange('', '')}
          >
            All Jan
          </button>
          <button
            className={`btn-pill ${startDate === '2026-01-01' && endDate === '2026-01-07' ? 'active' : ''}`}
            onClick={() => handleQuickRange('2026-01-01', '2026-01-07')}
          >
            W1 (Jan 1-7)
          </button>
          <button
            className={`btn-pill ${startDate === '2026-01-08' && endDate === '2026-01-14' ? 'active' : ''}`}
            onClick={() => handleQuickRange('2026-01-08', '2026-01-14')}
          >
            W2 (Jan 8-14)
          </button>
          <button
            className={`btn-pill ${startDate === '2026-01-15' && endDate === '2026-01-21' ? 'active' : ''}`}
            onClick={() => handleQuickRange('2026-01-15', '2026-01-21')}
          >
            W3 (Jan 15-21)
          </button>
          <button
            className={`btn-pill ${startDate === '2026-01-22' && endDate === '2026-01-31' ? 'active' : ''}`}
            onClick={() => handleQuickRange('2026-01-22', '2026-01-31')}
          >
            W4+ (Jan 22-31)
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
          <input
            type="date"
            className="custom-input tabular-nums"
            min="2026-01-01"
            max="2026-01-31"
            value={startDate || '2026-01-01'}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>→</span>
          <input
            type="date"
            className="custom-input tabular-nums"
            min="2026-01-01"
            max="2026-01-31"
            value={endDate || '2026-01-31'}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
