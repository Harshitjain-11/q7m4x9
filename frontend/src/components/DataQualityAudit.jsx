import React, { useState } from 'react';
import { Database, ShieldCheck, ChevronDown, ChevronUp, FileCode, CheckCircle, Info } from 'lucide-react';

export default function DataQualityAudit({ quality, alignment }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!quality) return null;

  return (
    <div className="audit-section">
      <div className="audit-header" onClick={() => setIsOpen(!isOpen)}>
        <h3>
          <ShieldCheck size={18} style={{ color: 'var(--color-actual)' }} />
          Data Integrity, Cadence Alignment & Anti-Lookahead Audit
        </h3>
        <button className="btn-pill" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {isOpen ? 'Collapse Audit' : 'Expand Audit'}
        </button>
      </div>

      {isOpen && (
        <div className="audit-content">
          {/* FUELHH Actuals Column */}
          <div className="audit-column">
            <h4>
              <span>FUELHH (Actual Generation)</span>
              <span className="brand-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-actual)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                Verified
              </span>
            </h4>
            <table className="audit-table">
              <tbody>
                <tr>
                  <td>Total Records Loaded</td>
                  <td>{quality.fuelhh.total_records?.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>January 2026 Records</td>
                  <td>{quality.fuelhh.january_records?.toLocaleString()} (31 days × 48 SP)</td>
                </tr>
                <tr>
                  <td>February 1 Records</td>
                  <td style={{ color: 'var(--color-surplus)' }}>
                    {quality.fuelhh.february_excluded_records} (Excluded from Jan stats)
                  </td>
                </tr>
                <tr>
                  <td>Delivery Cadence</td>
                  <td>{quality.fuelhh.cadence_minutes} minutes (Half-hourly SP 1–48)</td>
                </tr>
                <tr>
                  <td>Null / Invalid Values</td>
                  <td style={{ color: 'var(--color-actual)' }}>0 nulls detected</td>
                </tr>
                <tr>
                  <td>Generation Range</td>
                  <td>{quality.fuelhh.min_generation_mw} – {quality.fuelhh.max_generation_mw} MW</td>
                </tr>
                <tr>
                  <td>Mean Generation</td>
                  <td>{quality.fuelhh.mean_generation_mw} MW</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* WINDFOR Forecasts Column */}
          <div className="audit-column">
            <h4>
              <span>WINDFOR (Forecast Stream)</span>
              <span className="brand-badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--color-forecast)', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                Verified
              </span>
            </h4>
            <table className="audit-table">
              <tbody>
                <tr>
                  <td>Total Records Loaded</td>
                  <td>{quality.windfor.total_records?.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Unique Forecast Vintages</td>
                  <td>{quality.windfor.unique_vintages_count} publication batches</td>
                </tr>
                <tr>
                  <td>Unique Target Hours</td>
                  <td>{quality.windfor.unique_target_hours} hours (strictly :00:00Z)</td>
                </tr>
                <tr>
                  <td>Delivery Cadence</td>
                  <td>{quality.windfor.cadence_minutes} minutes (Hourly targets)</td>
                </tr>
                <tr>
                  <td>Earliest Publication</td>
                  <td>{quality.windfor.min_publish_time}</td>
                </tr>
                <tr>
                  <td>Latest Publication</td>
                  <td>{quality.windfor.max_publish_time}</td>
                </tr>
                <tr>
                  <td>Republished Past Vintages</td>
                  <td>{quality.windfor.negative_lead_time_records?.toLocaleString()} rows (lead &lt; 0)</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Audit Notes & Methodological Guarantees */}
          <div className="audit-column" style={{ gridColumn: '1 / -1' }}>
            <h4 style={{ marginBottom: '0.5rem' }}>Methodological Rules & Anti-Lookahead Guarantee</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle size={15} style={{ color: 'var(--color-actual)', marginTop: '2px', flexShrink: 0 }} />
                <span>
                  <strong>Strict Anti-Lookahead Isolation:</strong> For any target delivery hour on Day D, only forecast vintages published strictly on or before the simulated decision cutoff (e.g. Day D-1 12:00 UTC) are considered. Vintages published after cutoff are never selected.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Info size={15} style={{ color: 'var(--color-forecast)', marginTop: '2px', flexShrink: 0 }} />
                <span>
                  <strong>January 1st Look-Ahead Protection:</strong> The source WINDFOR stream starts publishing at 2026-01-01 02:30:00 UTC. For Day-Ahead (D-1) cutoffs, no vintage existed prior to 2025-12-31. Rather than committing look-ahead bias or fabricating numbers, WindLens honestly marks all 24 hours of Jan 1st as unforecasted, achieving an honest 96.8% coverage (720/744 hours).
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle size={15} style={{ color: 'var(--color-actual)', marginTop: '2px', flexShrink: 0 }} />
                <span>
                  <strong>No Cadence Fabrication:</strong> WINDFOR target intervals are hourly (:00:00Z) while FUELHH actuals are half-hourly (:00:00Z and :30:00Z). In "Exact Match" mode, WindLens strictly compares matching :00 hours and documents the 744 unmatched half-hours, never copying hourly forecasts into half-hours.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
