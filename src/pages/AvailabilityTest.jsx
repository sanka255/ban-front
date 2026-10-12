import React, { useState, useEffect } from 'react';
import client from '../api/client';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function inputCls() {
  return 'w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-all';
}

const inputStyle = {
  backgroundColor: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  color: 'var(--text-primary)',
};

/**
 * AvailabilityTest — Real-time Hall Partition Availability Inspector
 */
export default function AvailabilityTest() {
  const [halls, setHalls] = useState([]);
  const [partitions, setPartitions] = useState([]);

  const [params, setParams] = useState({
    partitionId: '',
    fromDate: '',
    toDate: '',
    fromTime: '09:00',
    toTime: '12:00',
    excludeDateSlotId: '',
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [history, setHistory] = useState([]);

  // Load halls for the partition picker
  useEffect(() => {
    client.get('/halls').then(({ data }) => setHalls(data)).catch(() => {});
  }, []);

  async function onHallChange(hallId) {
    if (!hallId) { setPartitions([]); return; }
    const { data } = await client.get(`/halls/${hallId}/partitions`);
    setPartitions(data);
  }

  function set(key, val) {
    setParams((p) => ({ ...p, [key]: val }));
  }

  async function runCheck() {
    setErr('');
    setResult(null);
    setLoading(true);

    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== '') query.set(k, v); });

    try {
      const { data } = await client.get(`/availability?${query}`);
      setResult(data);
      setHistory((h) => [
        { params: { ...params }, result: data, ts: new Date().toLocaleTimeString() },
        ...h.slice(0, 9), // keep last 10
      ]);
    } catch (e) {
      setErr(e.response?.data?.error || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  const testCases = [
    {
      label: '1. Empty range → Available',
      desc: 'No slots exist yet — should return available.',
      params: { fromDate: '2026-10-01', toDate: '2026-10-01', fromTime: '09:00', toTime: '12:00', excludeDateSlotId: '' },
    },
    {
      label: '2. Overlapping → Conflict check',
      desc: 'Checks overlap against existing booking time.',
      params: { fromDate: '2026-10-01', toDate: '2026-10-01', fromTime: '10:00', toTime: '13:00', excludeDateSlotId: '' },
    },
    {
      label: '3. Different time window',
      desc: 'Same day, different time window (13:00–15:00).',
      params: { fromDate: '2026-10-01', toDate: '2026-10-01', fromTime: '13:00', toTime: '15:00', excludeDateSlotId: '' },
    },
    {
      label: '4. Different date',
      desc: 'Completely different date — no overlap possible.',
      params: { fromDate: '2026-10-05', toDate: '2026-10-05', fromTime: '09:00', toTime: '12:00', excludeDateSlotId: '' },
    },
    {
      label: '5. Future booking check',
      desc: 'Check future calendar date availability.',
      params: { fromDate: '2026-11-01', toDate: '2026-11-01', fromTime: '09:00', toTime: '12:00', excludeDateSlotId: '' },
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Availability Test</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Check and verify real-time hall partition availability.
        </p>
      </div>

      {/* Quick test presets */}
      <div className="glass-card rounded-2xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--card-bg)' }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: 'var(--amber-strong)' }}>
          Quick Test Presets (Select Partition First)
        </p>
        <div className="flex flex-wrap gap-2">
          {testCases.map((tc) => (
            <button
              key={tc.label}
              title={tc.desc}
              className="text-xs font-medium rounded-xl px-3 py-1.5 transition border hover:opacity-90"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                borderColor: 'rgba(245, 158, 11, 0.25)',
                color: 'var(--amber-strong)',
              }}
              onClick={() => setParams((p) => ({ ...p, ...tc.params }))}
            >
              {tc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="glass-card rounded-2xl border p-5 space-y-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--card-bg)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Hall picker */}
          <Field label="Hall (for partition picker)">
            <select className={inputCls()} style={inputStyle} onChange={(e) => onHallChange(e.target.value)}>
              <option value="">Select hall…</option>
              {halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </Field>

          <Field label="Partition ID *">
            {partitions.length > 0 ? (
              <select className={inputCls()} style={inputStyle} value={params.partitionId}
                onChange={(e) => set('partitionId', e.target.value)}>
                <option value="">Select partition…</option>
                {partitions.map((p) => (
                  <option key={p.id} value={p.id}>#{p.id} — {p.name}</option>
                ))}
              </select>
            ) : (
              <input className={inputCls()} style={inputStyle} type="number" value={params.partitionId}
                onChange={(e) => set('partitionId', e.target.value)}
                placeholder="Enter partition ID" />
            )}
          </Field>

          <Field label="From Date *">
            <input type="date" className={inputCls()} style={inputStyle} value={params.fromDate}
              onChange={(e) => set('fromDate', e.target.value)} />
          </Field>

          <Field label="To Date *">
            <input type="date" className={inputCls()} style={inputStyle} value={params.toDate}
              onChange={(e) => set('toDate', e.target.value)} />
          </Field>

          <Field label="From Time *">
            <input type="time" className={inputCls()} style={inputStyle} value={params.fromTime}
              onChange={(e) => set('fromTime', e.target.value)} />
          </Field>

          <Field label="To Time *">
            <input type="time" className={inputCls()} style={inputStyle} value={params.toTime}
              onChange={(e) => set('toTime', e.target.value)} />
          </Field>

          <Field label="Exclude Date Slot ID (for edit scenarios)">
            <input type="number" className={inputCls()} style={inputStyle} value={params.excludeDateSlotId}
              onChange={(e) => set('excludeDateSlotId', e.target.value)}
              placeholder="optional" />
          </Field>
        </div>

        {err && (
          <p className="text-sm rounded-xl px-3 py-2 border" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.25)', color: '#ef4444' }}>
            {err}
          </p>
        )}

        <button
          onClick={runCheck}
          disabled={loading || !params.partitionId || !params.fromDate || !params.toDate}
          className="w-full font-bold rounded-xl py-2.5 text-sm transition-all disabled:opacity-40 shadow-sm"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: '#020617' }}
        >
          {loading ? 'Checking Availability…' : 'Check Availability'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-2xl border p-5 transition-all ${result.available ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xl font-bold ${result.available ? 'text-emerald-500' : 'text-red-500'}`}>
              {result.available ? '✓ Available' : '✗ Booking Conflict'}
            </span>
            {!result.available && result.conflicts && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-semibold">
                {result.conflicts.length} conflict(s)
              </span>
            )}
          </div>
          <pre className="text-xs rounded-xl p-3 overflow-auto max-h-64 border font-mono" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="glass-card rounded-2xl border p-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--card-bg)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>Check History</p>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className={`flex items-center justify-between text-xs rounded-xl px-3 py-2 border ${h.result.available ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <span style={{ color: 'var(--text-muted)' }}>{h.ts}</span>
                <span style={{ color: 'var(--text-primary)' }}>Partition #{h.params.partitionId} | {h.params.fromDate} ({h.params.fromTime}–{h.params.toTime})</span>
                <span className={`font-semibold ${h.result.available ? 'text-emerald-500' : 'text-red-500'}`}>
                  {h.result.available ? 'Available' : `Conflict (${h.result.conflicts?.length ?? 0})`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
