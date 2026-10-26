import React, { useState } from 'react';
import { Database, ShieldCheck, ChevronDown, ChevronUp, FileCode, CheckCircle, Info, Lock, ArrowRight, BookOpen } from 'lucide-react';

export default function DataQualityAudit({ quality, alignment, isDedicatedView = false }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!quality) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 5-Stage Data Pipeline Architecture Schematic */}
      <div className="pipeline-strip">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <Database size={15} style={{ color: 'var(--color-actual)' }} />
            <span>Data Lineage & Pipeline Architecture</span>
          </div>
          <span className="tag-badge emerald">
            <CheckCircle size={10} /> Reproducible from the committed input files
          </span>
        </div>

        <div className="pipeline-steps">
          <div className="pipeline-step-item">
            <span className="step-num-badge">STAGE 01 · RULE-P305-A</span>
            <span className="step-title">BMRS API Ingestion</span>
            <span className="step-meta">Raw WINDFOR & FUELHH JSON streams. {(quality.windfor.total_records + quality.fuelhh.total_records).toLocaleString()} records inspected.</span>
          </div>

          <div className="pipeline-step-item">
            <span className="step-num-badge">STAGE 02 · ISO-8601-UTC</span>
            <span className="step-title">Temporal Normalization</span>
            <span className="step-meta">Unambiguous UTC timestamps. DST boundary safeguards enforced.</span>
          </div>

          <div className="pipeline-step-item">
            <span className="step-num-badge">STAGE 03 · GATE-LOCK</span>
            <span className="step-title">Cutoff Filter Engine</span>
            <span className="step-meta">Configured decision cutoff applied; post-cutoff vintages are excluded.</span>
          </div>

          <div className="pipeline-step-item">
            <span className="step-num-badge">STAGE 04 · SP-ALIGN</span>
            <span className="step-title">Delivery Cadence Alignment</span>
            <span className="step-meta">Half-hourly pairing (SP 1–48) or discrete hourly mean matching.</span>
          </div>

          <div className="pipeline-step-item">
            <span className="step-num-badge">STAGE 05 · METRIC-VAL</span>
            <span className="step-title">Performance Metrics Calculation</span>
            <span className="step-meta">MAE, RMSE, Systematic Bias, and Directional Distribution.</span>
          </div>
        </div>
      </div>

      {/* Primary 2-Column Audit Breakdown */}
      <div className="methodology-grid">
        {/* FUELHH Actuals Column */}
        <div className="spec-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '0.5rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>FUELHH Actual Generation Stream</span>
            <span className="tag-badge emerald">Elexon Metered</span>
          </div>
          <table className="editorial-table">
            <tbody>
              <tr>
                <td style={{ color: 'var(--ink-secondary)' }}>Total Ingested Records</td>
                <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 600 }}>{quality.fuelhh.total_records?.toLocaleString()}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--ink-secondary)' }}>January 2026 In-Scope Intervals</td>
                <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 600 }}>{quality.fuelhh.january_records?.toLocaleString()} (31 days × 48 SP)</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--ink-secondary)' }}>February Boundary Exclusions</td>
                <td className="tabular-nums" style={{ textAlign: 'right', color: 'var(--color-amber-risk)' }}>
                  {quality.fuelhh.february_excluded_records} records excluded
                </td>
              </tr>
              <tr>
                <td style={{ color: 'var(--ink-secondary)' }}>Native Cadence</td>
                <td className="tabular-nums" style={{ textAlign: 'right' }}>{quality.fuelhh.cadence_minutes} minutes (Half-hourly SP 1–48)</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--ink-secondary)' }}>Null / Corrupt Metered Values</td>
                <td className="tabular-nums" style={{ textAlign: 'right', color: quality.fuelhh.null_counts.generation === 0 ? 'var(--color-actual)' : 'var(--color-amber-risk)', fontWeight: 600 }}>{quality.fuelhh.null_counts.generation} nulls detected</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--ink-secondary)' }}>Outturn Generation Range</td>
                <td className="tabular-nums" style={{ textAlign: 'right' }}>{quality.fuelhh.min_generation_mw} – {quality.fuelhh.max_generation_mw} MW</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--ink-secondary)' }}>Mean Evaluated Generation</td>
                <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 600 }}>{quality.fuelhh.mean_generation_mw} MW</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* WINDFOR Forecasts Column */}
        <div className="spec-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '0.5rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>WINDFOR Day-Ahead Forecast Stream</span>
            <span className="tag-badge teal">National Grid ESO</span>
          </div>
          <table className="editorial-table">
            <tbody>
              <tr>
                <td style={{ color: 'var(--ink-secondary)' }}>Total Ingested Raw Records</td>
                <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 600 }}>{quality.windfor.total_records?.toLocaleString()}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--ink-secondary)' }}>Unique Forecast Vintages</td>
                <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 600 }}>{quality.windfor.unique_vintages_count} publication runs</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--ink-secondary)' }}>Unique Target Hours</td>
                <td className="tabular-nums" style={{ textAlign: 'right' }}>{quality.windfor.unique_target_hours} hours (:00:00Z format)</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--ink-secondary)' }}>Native Forecast Cadence</td>
                <td className="tabular-nums" style={{ textAlign: 'right' }}>{quality.windfor.cadence_minutes} minutes (Hourly resolution)</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--ink-secondary)' }}>Lookback Window Earliest Vintage</td>
                <td className="tabular-nums" style={{ textAlign: 'right', fontSize: '0.74rem' }}>{quality.windfor.min_publish_time}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--ink-secondary)' }}>Lookback Window Latest Vintage</td>
                <td className="tabular-nums" style={{ textAlign: 'right', fontSize: '0.74rem' }}>{quality.windfor.max_publish_time}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--ink-secondary)' }}>Pre-Delivery Republished Rows</td>
                <td className="tabular-nums" style={{ textAlign: 'right' }}>{quality.windfor.negative_lead_time_records?.toLocaleString()} rows (lead &lt; 0)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Methodology & Mathematical Formulations */}
      <div className="methodology-grid">
        <div className="spec-card">
          <div className="spec-card-title">
            Mathematical Formulations & Error Definitions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '3px' }}>1. Mean Absolute Error (MAE)</div>
              <div className="formula-block">
                MAE = (1/N) · ∑ |Forecast(t) − Actual(t)|
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                Measures linear average magnitude of trading volume error without quadratic squaring distortion.
              </p>
            </div>

            <div>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '3px' }}>2. Weighted Absolute Percentage Error (WAPE)</div>
              <div className="formula-block">
                WAPE = Σ|Forecast − Actual| / ΣActual × 100%
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                Weights absolute error by total actual generation for the evaluated intervals.
              </p>
            </div>

            <div>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '3px' }}>3. Directional Forecast Bias</div>
              <div className="formula-block">
                Bias = (1/N) · ∑ (Forecast(t) − Actual(t))
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                Positive means forecast wind exceeded outturn; if used unadjusted, this can leave a generation shortfall. Negative means outturn exceeded forecast.
              </p>
            </div>
          </div>
        </div>

        <div className="spec-card">
          <div className="spec-card-title">
            Anti-Lookahead Governance & Settlement Alignment
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Lock size={12} style={{ color: 'var(--color-actual)' }} />
                <span>Strict Anti-Lookahead Isolation Rule</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)' }}>
                For any target delivery hour on Day D, only forecast vintages published strictly on or prior to Day D-1 12:00 UTC (or configured gate closure) are permitted. Vintages published after cutoff are quarantined to guarantee realistic backtesting.
              </p>
            </div>

            <div>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ShieldCheck size={12} style={{ color: 'var(--color-actual)' }} />
                <span>January 1st Look-Ahead Protection</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)' }}>
                Because the Elexon source feed commences publication on Jan 1st 02:30 UTC, no valid D-1 vintage exists for Jan 1st delivery. WindLens honestly marks Jan 1st as unforecasted rather than inventing data or introducing future knowledge.
              </p>
            </div>

            <div>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle size={12} style={{ color: 'var(--color-actual)' }} />
                <span>Zero Synthetic Smoothing Policy</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)' }}>
                WINDFOR forecasts are hourly; FUELHH actuals are half-hourly. In exact match mode, WindLens preserves 1-to-1 fidelity with matching timestamps, documenting unmapped half-hours transparently.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
