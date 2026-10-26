import React, { useState } from 'react';
import { Table, ArrowUpDown, Download, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';

export default function DeliveryIntervalsTable({ data, cutoff }) {
  const [sortField, setSortField] = useState('timestamp');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterType, setFilterType] = useState('all'); // all, over, under, extreme
  const [page, setPage] = useState(0);
  const pageSize = 12;

  if (!data || data.length === 0) {
    return null;
  }

  // Filter
  const filteredData = data.filter((d) => {
    if (filterType === 'over') return d.error_mw > 200;
    if (filterType === 'under') return d.error_mw < -200;
    if (filterType === 'extreme') return Math.abs(d.error_mw || 0) > 1000;
    return true;
  });

  // Sort
  const sortedData = [...filteredData].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (sortField === 'abs_error') {
      aVal = Math.abs(a.error_mw || 0);
      bVal = Math.abs(b.error_mw || 0);
    }
    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const currentItems = sortedData.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Delivery Timestamp (UTC)', 'Day-Ahead Forecast (MW)', 'Actual Outturn (MW)', 'Forecast Error (MW)', 'Cutoff Publish Time (UTC)'];
    const rows = sortedData.map(d => [
      d.timestamp,
      d.forecast_mw ?? '',
      d.actual_mw ?? '',
      d.error_mw ?? '',
      d.vintage_publish_time ?? ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `windlens_delivery_intervals_${cutoff}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="table-card-editorial">
      <div className="table-header-strip">
        <div className="table-title">
          <Table size={15} style={{ color: 'var(--ink-secondary)' }} />
          <span>Settlement Delivery Intervals Audit Log</span>
          <span className="brand-badge tabular-nums">
            {sortedData.length} Intervals
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '3px' }}>
            <button
              className={`btn-pill ${filterType === 'all' ? 'active' : ''}`}
              aria-pressed={filterType === 'all'}
              onClick={() => { setFilterType('all'); setPage(0); }}
            >
              All
            </button>
            <button
              className={`btn-pill ${filterType === 'over' ? 'active' : ''}`}
              aria-pressed={filterType === 'over'}
              onClick={() => { setFilterType('over'); setPage(0); }}
            >
              Over-Forecast (&gt;200 MW)
            </button>
            <button
              className={`btn-pill ${filterType === 'under' ? 'active' : ''}`}
              aria-pressed={filterType === 'under'}
              onClick={() => { setFilterType('under'); setPage(0); }}
            >
              Under-Forecast (&lt;-200 MW)
            </button>
            <button
              className={`btn-pill ${filterType === 'extreme' ? 'active' : ''}`}
              aria-pressed={filterType === 'extreme'}
              onClick={() => { setFilterType('extreme'); setPage(0); }}
            >
              Tail Risk (&gt;1,000 MW)
            </button>
          </div>

          <button className="btn-pill" onClick={handleExportCSV} title="Export intervals as CSV">
            <Download size={12} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="table-container-scroll">
        <table className="editorial-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('timestamp')} style={{ cursor: 'pointer' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Delivery Timestamp (UTC) <ArrowUpDown size={11} />
                </span>
              </th>
              <th onClick={() => handleSort('forecast_mw')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                  WINDFOR Forecast <ArrowUpDown size={11} />
                </span>
              </th>
              <th onClick={() => handleSort('actual_mw')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                  FUELHH Actual <ArrowUpDown size={11} />
                </span>
              </th>
              <th onClick={() => handleSort('abs_error')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                  Error Delta (F − A) <ArrowUpDown size={11} />
                </span>
              </th>
              <th>Cutoff Publication (UTC)</th>
              <th>Wind position signal</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((row) => {
              const isOver = row.error_mw > 0;
              const isExtreme = Math.abs(row.error_mw || 0) > 1000;
              const deltaColor = isOver ? 'var(--color-amber-risk)' : 'var(--color-forecast)';

              return (
                <tr key={row.timestamp} className={isExtreme ? 'highlight-peak' : ''}>
                  <td className="tabular-nums" style={{ fontWeight: 600 }}>
                    {row.timestamp}
                  </td>
                  <td className="tabular-nums" style={{ textAlign: 'right', color: 'var(--color-forecast)' }}>
                    {row.forecast_mw !== null && row.forecast_mw !== undefined
                      ? `${row.forecast_mw.toLocaleString()} MW`
                      : '---'}
                  </td>
                  <td className="tabular-nums" style={{ textAlign: 'right', color: 'var(--color-actual)' }}>
                    {row.actual_mw !== null && row.actual_mw !== undefined
                      ? `${row.actual_mw.toLocaleString()} MW`
                      : '---'}
                  </td>
                  <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 600, color: deltaColor }}>
                    {row.error_mw !== null && row.error_mw !== undefined ? (
                      `${row.error_mw > 0 ? '+' : ''}${row.error_mw.toLocaleString()} MW`
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="tabular-nums" style={{ color: 'var(--ink-secondary)', fontSize: '0.74rem' }}>
                    {row.vintage_publish_time || 'No eligible vintage'}
                  </td>
                  <td>
                    {row.error_mw === null || row.error_mw === undefined ? (
                      <span className="tag-badge">No matched pair</span>
                    ) : isExtreme ? (
                      <span className="tag-badge amber">
                        <AlertCircle size={10} /> Large forecast miss
                      </span>
                    ) : isOver ? (
                      <span className="tag-badge amber">
                        Wind below forecast · backup shortfall risk
                      </span>
                    ) : row.error_mw < 0 ? (
                      <span className="tag-badge teal">
                        Wind above forecast · potential excess procurement
                      </span>
                    ) : (
                      <span className="tag-badge emerald">
                      <CheckCircle size={10} /> No forecast error
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1.25rem', background: 'var(--bg-surface-elevated)', borderTop: '1px solid var(--border-hairline)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
        <span style={{ color: 'var(--ink-secondary)' }}>
          Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sortedData.length)} of {sortedData.length} intervals
        </span>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="btn-pill"
            disabled={page === 0}
            onClick={() => setPage(p => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', color: 'var(--ink-secondary)' }}>
            Page {page + 1} of {Math.max(1, totalPages)}
          </span>
          <button
            className="btn-pill"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
