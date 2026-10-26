import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BarChart3, Check, Clock3, Database, ShieldCheck, Wind } from 'lucide-react';
import { apiUrl } from '../api';

const format = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

export default function LandingPage() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    let current = true;
    fetch(apiUrl('/api/summary?cutoff=da_dminus1_12&alignment=exact'))
      .then((response) => {
        if (!response.ok) throw new Error('Summary unavailable');
        return response.json();
      })
      .then((result) => { if (current) setMetrics(result.metrics); })
      .catch(() => { if (current) setMetrics(null); });
    return () => { current = false; };
  }, []);

  return (
    <div className="product-home">
      <header className="product-nav">
        <Link to="/" className="product-brand"><span className="product-brand-mark"><Wind size={19} /></span><span><strong>WindLens</strong><small>UK POWER DESK</small></span></Link>
        <nav aria-label="Main navigation"><a href="#method">How it works</a><a href="#scope">Pilot scope</a><Link to="/app" className="product-nav-cta">Open the desk <ArrowRight size={15} /></Link></nav>
      </header>

      <main>
        <section className="product-hero">
          <div className="hero-copy-block">
            <div className="hero-overline"><span className="hero-overline-dot" /> WIND PROCUREMENT · JANUARY 2026</div>
            <h1>Know the wind.<br /><em>Buy for the gap.</em></h1>
            <p className="product-hero-description">WindLens replays the forecast available at a day-ahead decision point, then measures it against settled UK wind generation. See the size and direction of the miss before you use it in a purchasing view.</p>
            <div className="product-hero-actions"><Link to="/app" className="primary-action">Review forecast position <ArrowRight size={16} /></Link><a href="#method" className="text-action">See the evaluation method <ArrowUpRight size={15} /></a></div>
            <div className="hero-proof-line"><span><Check size={14} /> Publication-time cutoffs</span><span><Check size={14} /> Half-hourly actuals</span><span><Check size={14} /> Error and coverage</span></div>
          </div>

          <aside className="hero-desk-card" aria-label="Pilot snapshot">
            <div className="hero-card-top"><div><span className="card-overline">PILOT SNAPSHOT</span><h2>GB wind · Jan 2026</h2></div><span className="snapshot-lock"><ShieldCheck size={15} /> D−1 LOCK</span></div>
            <div className="snapshot-main-metric"><span>Mean absolute error</span><strong>{metrics ? format(metrics.mae_mw) : '—'}<small>MW</small></strong><span className="snapshot-meta">D−1 12:00 UTC · exact-hour alignment</span></div>
            <div className="snapshot-divider" />
            <div className="snapshot-stats">
              <div><span>Mean bias</span><strong>{metrics ? `${metrics.bias_mw > 0 ? '+' : ''}${format(metrics.bias_mw)} MW` : '—'}</strong><small>Forecast − actual</small></div>
              <div><span>Coverage</span><strong>{metrics ? `${metrics.coverage_pct}%` : '—'}</strong><small>{metrics ? `${format(metrics.matched_count)} matched hours` : 'Matched hours'}</small></div>
            </div>
            <div className="snapshot-footnote"><Clock3 size={14} /> Only vintages available at the selected cutoff are scored.</div>
          </aside>
        </section>

        <section className="role-strip" id="scope">
          <div className="role-strip-heading"><span className="section-overline">BUILT FOR THE BUYING DECISION</span><h2>One question, answered with the right records.</h2></div>
          <div className="role-points">
            <article><span className="role-point-icon"><Clock3 size={17} /></span><div><strong>What did we know?</strong><p>Replay only forecast publications available by the chosen decision cutoff.</p></div></article>
            <article><span className="role-point-icon"><BarChart3 size={17} /></span><div><strong>How far off was it?</strong><p>Measure error, signed bias, and matched coverage for the delivery window.</p></div></article>
            <article><span className="role-point-icon"><Database size={17} /></span><div><strong>Can we trust the comparison?</strong><p>Inspect source counts, boundary exclusions, and hourly alignment.</p></div></article>
          </div>
        </section>

        <section className="method-preview" id="method">
          <div className="method-preview-intro"><span className="section-overline">A REPLAY, NOT A LIVE FORECAST</span><h2>Same decision. Same data. Clearer exposure.</h2><p>This pilot evaluates January 2026 national wind records from Elexon BMRS. Forecasts are selected by publication time; actual generation is aligned at the chosen hourly method. Financial savings and imbalance costs are outside the pilot scope.</p></div>
          <div className="method-flow">
            <div><span>01</span><strong>Set the cutoff</strong><small>D−1 11:00, 12:00, 17:00 or a rolling lead time</small></div>
            <i />
            <div><span>02</span><strong>Pair the records</strong><small>Hourly forecast against exact-hour or hourly-mean actual</small></div>
            <i />
            <div><span>03</span><strong>Review the miss</strong><small>MW error, bias, coverage, and delivery-hour detail</small></div>
          </div>
        </section>
      </main>

      <footer className="product-footer"><Link to="/" className="product-brand"><span className="product-brand-mark"><Wind size={17} /></span><span><strong>WindLens</strong><small>UK POWER DESK</small></span></Link><span>Decision support from Elexon BMRS wind records <i>·</i> All times UTC</span><Link to="/app">Enter workspace <ArrowRight size={14} /></Link></footer>
    </div>
  );
}
