import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import CancellationDialog from '../components/CancellationDialog';

const STATUS_COLORS = {
  tentative:   'bg-amber-100 text-amber-800',
  guaranteed:  'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed:   'bg-gray-100 text-gray-600',
  cancelled:   'bg-red-50 text-red-400',
  postponed:   'bg-purple-100 text-purple-800',
};

export default function Reservations({ onNew }) {
  const [data, setData] = useState({ reservations: [], total: 0 });
  const [filters, setFilters] = useState({ status: '', fromDate: '', toDate: '', search: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cancelSlot, setCancelSlot] = useState(null); // { slotId, reservationCode, charge, fromDate }
  const [actionMsg, setActionMsg] = useState('');

  async function load() {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page, limit: 15, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
      const { data: res } = await client.get(`/reservations?${q}`);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, filters]);

  const totalPages = Math.ceil(data.total / 15);

  return (
    <div className="reservation-shell">
      {/* Header */}
      <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Reservations</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{data.total} total</p>
        </div>
        {onNew && (
          <button onClick={onNew} className="text-sm font-semibold px-4 py-2 rounded-xl text-slate-950 shadow-[0_0_24px_rgba(245,158,11,0.18)]" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}>
            + New Reservation
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-4 flex gap-3 flex-wrap">
        <input
          className="rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none"
          placeholder="Search code / guest…"
          value={filters.search}
          onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
          style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
        />
        <select
          className="rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          value={filters.status}
          onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
          style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
        >
          <option value="">All statuses</option>
          {['tentative', 'guaranteed', 'in_progress', 'completed', 'cancelled', 'postponed'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input type="date" value={filters.fromDate} onChange={(e) => { setFilters({ ...filters, fromDate: e.target.value }); setPage(1); }}
          className="rounded-lg px-3 py-1.5 text-sm focus:outline-none" style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }} />
        <span className="self-center text-xs" style={{ color: 'var(--text-muted)' }}>to</span>
        <input type="date" value={filters.toDate} onChange={(e) => { setFilters({ ...filters, toDate: e.target.value }); setPage(1); }}
          className="rounded-lg px-3 py-1.5 text-sm focus:outline-none" style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }} />
        <button onClick={() => { setFilters({ status: '', fromDate: '', toDate: '', search: '' }); setPage(1); }}
          className="text-xs px-2" style={{ color: 'var(--text-secondary)' }}>Clear</button>
      </div>

      {actionMsg && (
        <div className="text-sm rounded-lg px-4 py-2 flex justify-between border" style={{ color: '#bbf7d0', backgroundColor: 'rgba(21,128,61,0.14)', borderColor: 'rgba(34,197,94,0.28)' }}>
          {actionMsg}
          <button onClick={() => setActionMsg('')} className="ml-4" style={{ color: '#bbf7d0' }}>✕</button>
        </div>
      )}

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <table className="reservation-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Guest</th>
              <th>PAX</th>
              <th>Status</th>
              <th>Next Slot</th>
              <th>Complementary</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="py-10 text-center animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading…</td></tr>
            )}
            {!loading && data.reservations.length === 0 && (
              <tr><td colSpan={7} className="py-10 text-center" style={{ color: 'var(--text-muted)' }}>No reservations found</td></tr>
            )}
            {data.reservations.map((r) => {
              const nextSlot = r.dateSlots?.[0];
              return (
                <tr key={r.id}>
                  <td className="font-mono font-medium">
                    <Link to={`/reservations/${r.id}`} className="reservation-link-code">{r.reservationCode}</Link>
                  </td>
                  <td style={{ color: 'var(--text-primary)' }}>{r.guest?.firstName} {r.guest?.lastName}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{r.numberOfGuests}</td>
                  <td>
                    <span className={`reservation-badge ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {nextSlot ? `${nextSlot.fromDate?.toString().slice(0,10)} ${nextSlot.fromTime?.toString().slice(11,16)}` : '—'}
                  </td>
                  <td>
                    {r.isComplementary && <span className="reservation-flag">Comp</span>}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/reservations/${r.id}`} className="reservation-action-link">View</Link>
                      <Link to={`/reservations/${r.id}/folio`} className="reservation-action-link">Folio</Link>
                      {r.status !== 'cancelled' && (
                        <button
                          onClick={async () => {
                            if (!confirm('Cancel entire reservation?')) return;
                            try {
                              await client.post(`/reservations/${r.id}/cancel`, {});
                              setActionMsg(`Reservation ${r.reservationCode} cancelled.`);
                              load();
                            } catch (err) {
                              alert(err.response?.data?.error || 'Cancel failed');
                            }
                          }}
                          className="reservation-action-btn cancel"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-hover)' }}>← Prev</button>
          <span className="text-sm self-center" style={{ color: 'var(--text-secondary)' }}>Page {page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-hover)' }}>Next →</button>
        </div>
      )}

      {/* Cancel dialog */}
      {cancelSlot && (
        <CancellationDialog
          {...cancelSlot}
          onConfirmed={() => { setCancelSlot(null); setActionMsg('Slot cancelled.'); load(); }}
          onClose={() => setCancelSlot(null)}
        />
      )}
    </div>
  );
}
