import React from 'react';
import { CalendarDays, Clock3, Layers3, RotateCw } from 'lucide-react';

export default function ControlBar({ cutoff, setCutoff, alignment, setAlignment, startDate, setStartDate, endDate, setEndDate }) {
  const applyPreset = (preset) => {
    const ranges = {
      month: ['2026-01-01', '2026-01-31'],
      first: ['2026-01-01', '2026-01-07'],
      second: ['2026-01-08', '2026-01-14'],
      third: ['2026-01-15', '2026-01-21'],
      fourth: ['2026-01-22', '2026-01-31'],
    };
    if (ranges[preset]) {
      setStartDate(ranges[preset][0]);
      setEndDate(ranges[preset][1]);
    }
  };

  const selectedPreset = [
    ['month', '2026-01-01', '2026-01-31'],
    ['first', '2026-01-01', '2026-01-07'],
    ['second', '2026-01-08', '2026-01-14'],
    ['third', '2026-01-15', '2026-01-21'],
    ['fourth', '2026-01-22', '2026-01-31'],
  ].find(([, start, end]) => (startDate || '2026-01-01') === start && (endDate || '2026-01-31') === end)?.[0] || 'custom';

  return (
    <section className="desk-toolbar" aria-label="Evaluation controls">
      <div className="toolbar-heading">
        <span className="toolbar-eyebrow">REPLAY PARAMETERS</span>
        <strong>January 2026</strong>
      </div>

      <div className="toolbar-control cutoff-control">
        <label htmlFor="cutoff-select"><Clock3 size={14} /> Decision cutoff</label>
        <select id="cutoff-select" className="toolbar-select" value={cutoff} onChange={(event) => setCutoff(event.target.value)}>
          <optgroup label="Day-ahead decisions">
            <option value="da_dminus1_11">D-1 · 11:00 UTC</option>
            <option value="da_dminus1_12">D-1 · 12:00 UTC</option>
            <option value="da_dminus1_17">D-1 · 17:00 UTC</option>
          </optgroup>
          <optgroup label="Rolling lead time">
            <option value="rolling_24h">24 hours ahead</option>
            <option value="rolling_12h">12 hours ahead</option>
            <option value="rolling_4h">4 hours ahead</option>
          </optgroup>
          <optgroup label="Pre-delivery">
            <option value="latest_predelivery">Latest before delivery</option>
          </optgroup>
        </select>
      </div>

      <div className="toolbar-control period-control">
        <label htmlFor="window-start"><CalendarDays size={14} /> Delivery window</label>
        <div className="date-range-controls">
          <input id="window-start" type="date" aria-label="Start date" min="2026-01-01" max="2026-01-31" value={startDate || '2026-01-01'} onChange={(event) => setStartDate(event.target.value)} />
          <span className="date-separator">to</span>
          <input type="date" aria-label="End date" min="2026-01-01" max="2026-01-31" value={endDate || '2026-01-31'} onChange={(event) => setEndDate(event.target.value)} />
          <select aria-label="Quick date range" className="toolbar-select preset-select" value={selectedPreset} onChange={(event) => applyPreset(event.target.value)}>
            <option value="custom">Custom</option>
            <option value="month">Full month</option>
            <option value="first">01–07 Jan</option>
            <option value="second">08–14 Jan</option>
            <option value="third">15–21 Jan</option>
            <option value="fourth">22–31 Jan</option>
          </select>
        </div>
      </div>

      <div className="toolbar-control alignment-control">
        <label><Layers3 size={14} /> Actual alignment</label>
        <div className="segmented-control" role="group" aria-label="Actual alignment">
          <button type="button" className={alignment === 'exact' ? 'is-selected' : ''} onClick={() => setAlignment('exact')} aria-pressed={alignment === 'exact'}>Exact hour</button>
          <button type="button" className={alignment === 'hourly_mean' ? 'is-selected' : ''} onClick={() => setAlignment('hourly_mean')} aria-pressed={alignment === 'hourly_mean'}>Hourly mean</button>
        </div>
      </div>

      <div className="toolbar-timezone"><span className="timezone-icon"><RotateCw size={13} /></span><span>UTC</span></div>
    </section>
  );
}
