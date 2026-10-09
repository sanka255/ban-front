import React, { useState, useEffect } from 'react';
import client from '../api/client';

const PARTITION_STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  maintenance: 'Maintenance',
};

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

function inputCls() {
  return 'w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300';
}

/**
 * AvailabilityTest — Sprint 1 exit criteria verification page.
 *
 * Lets you call GET /api/banquet/availability with any parameters
 * and see the raw JSON response. Use this together with Prisma Studio
 * or direct DB inserts to run through all 7 test cases.
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
      label: '2. Empty range → available: true',
      desc: 'No slots exist yet — should return available.',
      params: { fromDate: '2026-10-01', toDate: '2026-10-01', fromTime: '09:00', toTime: '12:00', excludeDateSlotId: '' },
    },
    {
      label: '4. Overlapping → available: false',
      desc: 'Assumes an active slot exists for 09:00–12:00. Change dates to match your inserted slot.',
      params: { fromDate: '2026-10-01', toDate: '2026-10-01', fromTime: '10:00', toTime: '13:00', excludeDateSlotId: '' },
    },
    {
      label: '5. Non-overlapping time → available: true',
      desc: 'Same day, different time window (13:00–15:00).',
      params: { fromDate: '2026-10-01', toDate: '2026-10-01', fromTime: '13:00', toTime: '15:00', excludeDateSlotId: '' },
    },
    {
      label: '5b. Different day → available: true',
      desc: 'Completely different date — no overlap possible.',
      params: { fromDate: '2026-10-05', toDate: '2026-10-05', fromTime: '09:00', toTime: '12:00', excludeDateSlotId: '' },
    },
    {
      label: '7. Legacy bug regression',
      desc: 'Unrelated date that old OR-query would wrongly match. Expect available: true.',
      params: { fromDate: '2026-11-01', toDate: '2026-11-01', fromTime: '09:00', toTime: '12:00', excludeDateSlotId: '' },
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Availability Test</h1>
        <p className="text-sm text-gray-500">
          Sprint 1 exit criteria — call the availability endpoint and inspect the response.
          Use <a href="https://www.prisma.io/studio" target="_blank" rel="noreferrer" className="text-primary-600 underline">Prisma Studio</a> or
          direct SQL to insert/cancel test date slots.
        </p>
      </div>

      {/* Quick test presets */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Quick Test Presets (set partition first)</p>
        <div className="flex flex-wrap gap-2">
          {testCases.map((tc) => (
            <button
              key={tc.label}
              title={tc.desc}
              className="text-xs bg-white border border-amber-300 text-amber-800 rounded-lg px-2.5 py-1 hover:bg-amber-100 transition"
              onClick={() => setParams((p) => ({ ...p, ...tc.params }))}
            >
              {tc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Hall picker (just for convenience — sets available partitions) */}
          <Field label="Hall (for partition picker)">
            <select className={inputCls()} onChange={(e) => onHallChange(e.target.value)}>
              <option value="">Select hall…</option>
              {halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </Field>

          <Field label="Partition ID *">
            {partitions.length > 0 ? (
              <select className={inputCls()} value={params.partitionId}
                onChange={(e) => set('partitionId', e.target.value)}>
                <option value="">Select partition…</option>
                {partitions.map((p) => (
                  <option key={p.id} value={p.id}>#{p.id} — {p.name}</option>
                ))}
              </select>
            ) : (
              <input className={inputCls()} type="number" value={params.partitionId}
                onChange={(e) => set('partitionId', e.target.value)}
                placeholder="Enter partition ID" />
            )}
          </Field>

          <Field label="From Date *">
            <input type="date" className={inputCls()} value={params.fromDate}
              onChange={(e) => set('fromDate', e.target.value)} />
          </Field>

          <Field label="To Date *">
            <input type="date" className={inputCls()} value={params.toDate}
              onChange={(e) => set('toDate', e.target.value)} />
          </Field>

          <Field label="From Time *">
            <input type="time" className={inputCls()} value={params.fromTime}
              onChange={(e) => set('fromTime', e.target.value)} />
          </Field>

          <Field label="To Time *">
            <input type="time" className={inputCls()} value={params.toTime}
              onChange={(e) => set('toTime', e.target.value)} />
          </Field>

          <Field label="Exclude Date Slot ID (for edit scenarios)">
            <input type="number" className={inputCls()} value={params.excludeDateSlotId}
              onChange={(e) => set('excludeDateSlotId', e.target.value)}
              placeholder="optional" />
          </Field>
        </div>

        {err && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>
        )}

        <button
          onClick={runCheck}
          disabled={loading || !params.partitionId || !params.fromDate || !params.toDate}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl py-2 text-sm transition disabled:opacity-40"
        >
          {loading ? 'Checking…' : 'Check Availability'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-xl border p-5 ${result.available ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-2xl font-bold ${result.available ? 'text-green-700' : 'text-red-700'}`}>
              {result.available ? '✅ Available' : '❌ Conflict'}
            </span>
            {!result.available && (
              <span className="text-sm text-red-600">{result.conflicts.length} conflict(s)</span>
            )}
          </div>
          <pre className="text-xs bg-white/70 rounded-lg p-3 overflow-auto max-h-64 border border-current/10">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Check History</p>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className={`flex items-center justify-between text-xs rounded-lg px-3 py-2 ${h.result.available ? 'bg-green-50' : 'bg-red-50'}`}>
                <span className="text-gray-500">{h.ts}</span>
                <span>Partition {h.params.partitionId} | {h.params.fromDate} {h.params.fromTime}–{h.params.toTime}</span>
                <span className={`font-semibold ${h.result.available ? 'text-green-700' : 'text-red-700'}`}>
                  {h.result.available ? 'Available' : `Conflict (${h.result.conflicts.length})`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
