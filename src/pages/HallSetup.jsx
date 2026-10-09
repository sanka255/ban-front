import React, { useEffect, useState, useCallback } from 'react';
import client from '../api/client';

// ─── Reusable helpers ────────────────────────────────────────────────────────

function Btn({ variant = 'primary', size = 'sm', children, ...props }) {
  const base = 'inline-flex items-center font-medium rounded-lg transition disabled:opacity-50';
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' };
  const variants = {
    primary:  'bg-primary-600 hover:bg-primary-700 text-white',
    danger:   'bg-red-500 hover:bg-red-600 text-white',
    ghost:    'text-gray-600 hover:bg-gray-100',
    outline:  'border border-surface-border hover:bg-gray-50 text-gray-700',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]}`} {...props}>
      {children}
    </button>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>}
      <input
        className="w-full border border-surface-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
        {...props}
      />
    </label>
  );
}

function Select({ label, children, ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>}
      <select
        className="w-full border border-surface-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

function ErrMsg({ msg }) {
  if (!msg) return null;
  return (
    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
      {msg}
    </p>
  );
}

function Badge({ status }) {
  const cls = {
    active:      'bg-green-100 text-green-700',
    inactive:    'bg-gray-100 text-gray-500',
    maintenance: 'bg-amber-100 text-amber-700',
  }[status] || 'bg-gray-100 text-gray-500';
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{status}</span>
  );
}

// ─── Pax Ranges tab ──────────────────────────────────────────────────────────

function PaxRangesTab({ paxRanges, onRefresh }) {
  const [form, setForm] = useState({ minGuests: '', maxGuests: '' });
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');

  async function handleSave() {
    setErr('');
    try {
      if (editing) {
        await client.put(`/pax-ranges/${editing.id}`, { minGuests: Number(form.minGuests), maxGuests: Number(form.maxGuests) });
      } else {
        await client.post('/pax-ranges', { minGuests: Number(form.minGuests), maxGuests: Number(form.maxGuests) });
      }
      setForm({ minGuests: '', maxGuests: '' });
      setEditing(null);
      onRefresh();
    } catch (e) {
      setErr(e.response?.data?.error || 'Save failed');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this pax range? This will also remove linked rates.')) return;
    try {
      await client.delete(`/pax-ranges/${id}`);
      onRefresh();
    } catch (e) {
      setErr(e.response?.data?.error || 'Delete failed');
    }
  }

  function startEdit(r) {
    setEditing(r);
    setForm({ minGuests: String(r.minGuests), maxGuests: String(r.maxGuests) });
  }

  function cancelEdit() {
    setEditing(null);
    setForm({ minGuests: '', maxGuests: '' });
    setErr('');
  }

  return (
    <div className="space-y-4">
      {/* Form */}
      <div className="bg-white rounded-xl border border-surface-border p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {editing ? `Editing Pax Range #${editing.id}` : 'New Pax Range'}
        </h3>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="w-32">
            <Input label="Min Guests" type="number" min="1" value={form.minGuests}
              onChange={(e) => setForm({ ...form, minGuests: e.target.value })} />
          </div>
          <div className="w-32">
            <Input label="Max Guests" type="number" min="1" value={form.maxGuests}
              onChange={(e) => setForm({ ...form, maxGuests: e.target.value })} />
          </div>
          <Btn onClick={handleSave} size="md" disabled={!form.minGuests || !form.maxGuests}>
            {editing ? 'Update' : 'Add'}
          </Btn>
          {editing && <Btn variant="ghost" size="md" onClick={cancelEdit}>Cancel</Btn>}
        </div>
        <ErrMsg msg={err} />
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Min</th>
              <th className="px-4 py-2 text-left">Max</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {paxRanges.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-xs">No pax ranges yet</td></tr>
            )}
            {paxRanges.map((r) => (
              <tr key={r.id} className="hover:bg-surface-muted/50">
                <td className="px-4 py-2 text-gray-400">{r.id}</td>
                <td className="px-4 py-2 font-medium">{r.minGuests}</td>
                <td className="px-4 py-2 font-medium">{r.maxGuests}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <Btn variant="outline" onClick={() => startEdit(r)}>Edit</Btn>
                  <Btn variant="danger" onClick={() => handleDelete(r.id)}>Delete</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Hall Rates panel (inside a partition accordion) ─────────────────────────

function RatesPanel({ partition, paxRanges }) {
  const [rates, setRates] = useState([]);
  const [form, setForm] = useState({ paxRangeId: '', charge: '' });
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const { data } = await client.get(`/hall-rates?partitionId=${partition.id}`);
    setRates(data);
  }, [partition.id]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    setErr('');
    try {
      await client.post('/hall-rates', {
        partitionId: partition.id,
        paxRangeId: Number(form.paxRangeId),
        charge: Number(form.charge),
      });
      setForm({ paxRangeId: '', charge: '' });
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to add rate');
    }
  }

  async function handleDelete(id) {
    try {
      await client.delete(`/hall-rates/${id}`);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Delete failed');
    }
  }

  const usedPaxRangeIds = new Set(rates.map((r) => r.paxRangeId));
  const availablePaxRanges = paxRanges.filter((p) => !usedPaxRangeIds.has(p.id));

  return (
    <div className="mt-3 pl-3 border-l-2 border-primary-100">
      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Rates</p>

      <div className="flex gap-2 items-end flex-wrap mb-2">
        <div className="w-48">
          <Select label="Pax Range" value={form.paxRangeId}
            onChange={(e) => setForm({ ...form, paxRangeId: e.target.value })}>
            <option value="">Select pax range…</option>
            {availablePaxRanges.map((p) => (
              <option key={p.id} value={p.id}>{p.minGuests}–{p.maxGuests} guests</option>
            ))}
          </Select>
        </div>
        <div className="w-32">
          <Input label="Charge" type="number" min="0" step="0.01" value={form.charge}
            onChange={(e) => setForm({ ...form, charge: e.target.value })}
            placeholder="0.00" />
        </div>
        <Btn onClick={handleAdd} disabled={!form.paxRangeId || !form.charge}>Add Rate</Btn>
      </div>

      <ErrMsg msg={err} />

      {rates.length > 0 && (
        <table className="w-full text-xs mt-1">
          <thead className="text-gray-400">
            <tr>
              <th className="text-left pb-1">Pax Range</th>
              <th className="text-left pb-1">Charge</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {rates.map((r) => (
              <tr key={r.id}>
                <td className="py-1">{r.paxRange.minGuests}–{r.paxRange.maxGuests} guests</td>
                <td className="py-1 font-medium">{Number(r.charge).toLocaleString()}</td>
                <td className="py-1 text-right">
                  <Btn variant="danger" onClick={() => handleDelete(r.id)}>✕</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {rates.length === 0 && (
        <p className="text-xs text-gray-400">No rates configured</p>
      )}
    </div>
  );
}

// ─── Partitions panel (inside a hall accordion) ───────────────────────────────

function PartitionsPanel({ hall, paxRanges }) {
  const [partitions, setPartitions] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({ name: '', status: 'active', accountNo: '' });
  const [editingId, setEditingId] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const { data } = await client.get(`/halls/${hall.id}/partitions`);
    setPartitions(data);
  }, [hall.id]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setErr('');
    try {
      if (editingId) {
        await client.put(`/halls/${hall.id}/partitions/${editingId}`, form);
        setEditingId(null);
      } else {
        await client.post(`/halls/${hall.id}/partitions`, form);
      }
      setForm({ name: '', status: 'active', accountNo: '' });
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Save failed');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this partition?')) return;
    try {
      await client.delete(`/halls/${hall.id}/partitions/${id}`);
      if (expandedId === id) setExpandedId(null);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Delete failed');
    }
  }

  function startEdit(p) {
    setEditingId(p.id);
    setForm({ name: p.name, status: p.status, accountNo: p.accountNo || '' });
    setErr('');
  }

  return (
    <div className="mt-3 pl-3 border-l-2 border-primary-100 space-y-3">
      {/* Add / Edit form */}
      <div className="bg-surface-muted rounded-lg p-3">
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
          {editingId ? 'Edit Partition' : 'Add Partition'}
        </p>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="w-40">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="w-36">
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </Select>
          </div>
          <div className="w-36">
            <Input label="Account No" value={form.accountNo} onChange={(e) => setForm({ ...form, accountNo: e.target.value })} placeholder="optional" />
          </div>
          <Btn onClick={handleSave} disabled={!form.name}>
            {editingId ? 'Update' : 'Add'}
          </Btn>
          {editingId && (
            <Btn variant="ghost" onClick={() => { setEditingId(null); setForm({ name: '', status: 'active', accountNo: '' }); setErr(''); }}>
              Cancel
            </Btn>
          )}
        </div>
        <ErrMsg msg={err} />
      </div>

      {/* Partition list */}
      {partitions.length === 0 && (
        <p className="text-xs text-gray-400">No partitions yet</p>
      )}
      {partitions.map((p) => (
        <div key={p.id} className="bg-white rounded-lg border border-surface-border overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-surface-muted/60"
            onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{p.name}</span>
              <Badge status={p.status} />
              {p.accountNo && <span className="text-xs text-gray-400">Acc: {p.accountNo}</span>}
            </div>
            <div className="flex items-center gap-2">
              <Btn variant="outline" onClick={(e) => { e.stopPropagation(); startEdit(p); }}>Edit</Btn>
              <Btn variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}>Delete</Btn>
              <span className="text-gray-400 text-xs">{expandedId === p.id ? '▲' : '▼'}</span>
            </div>
          </div>

          {expandedId === p.id && (
            <div className="px-4 pb-4 pt-1 border-t border-surface-border bg-surface-muted/30">
              <RatesPanel partition={p} paxRanges={paxRanges} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Halls tab ───────────────────────────────────────────────────────────────

function HallsTab({ paxRanges }) {
  const [halls, setHalls] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({ name: '', maxGuests: '', isPartitioned: false });
  const [editingId, setEditingId] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await client.get('/halls');
      setHalls(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setErr('');
    try {
      const body = {
        name: form.name,
        maxGuests: form.maxGuests ? Number(form.maxGuests) : null,
        isPartitioned: form.isPartitioned,
      };
      if (editingId) {
        await client.put(`/halls/${editingId}`, body);
        setEditingId(null);
      } else {
        await client.post('/halls', body);
      }
      setForm({ name: '', maxGuests: '', isPartitioned: false });
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Save failed');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this hall and all its partitions?')) return;
    try {
      await client.delete(`/halls/${id}`);
      if (expandedId === id) setExpandedId(null);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Delete failed');
    }
  }

  function startEdit(h) {
    setEditingId(h.id);
    setForm({ name: h.name, maxGuests: h.maxGuests ?? '', isPartitioned: h.isPartitioned });
    setErr('');
  }

  if (loading) return <p className="text-sm text-gray-400">Loading halls…</p>;

  return (
    <div className="space-y-4">
      {/* Hall form */}
      <div className="bg-white rounded-xl border border-surface-border p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {editingId ? `Editing Hall #${editingId}` : 'New Hall'}
        </h3>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="w-48">
            <Input label="Hall Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="w-32">
            <Input label="Max Guests" type="number" min="1" value={form.maxGuests}
              onChange={(e) => setForm({ ...form, maxGuests: e.target.value })}
              placeholder="optional" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 mb-0 cursor-pointer">
            <input type="checkbox" checked={form.isPartitioned}
              onChange={(e) => setForm({ ...form, isPartitioned: e.target.checked })}
              className="rounded" />
            Partitioned
          </label>
          <Btn size="md" onClick={handleSave} disabled={!form.name}>
            {editingId ? 'Update Hall' : 'Create Hall'}
          </Btn>
          {editingId && (
            <Btn variant="ghost" size="md" onClick={() => { setEditingId(null); setForm({ name: '', maxGuests: '', isPartitioned: false }); setErr(''); }}>
              Cancel
            </Btn>
          )}
        </div>
        <ErrMsg msg={err} />
      </div>

      {/* Hall list */}
      {halls.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          No halls yet. Create your first hall above.
        </div>
      )}

      {halls.map((h) => (
        <div key={h.id} className="bg-white rounded-xl border border-surface-border overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-surface-muted/50"
            onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}
          >
            <div>
              <span className="font-semibold text-gray-800">{h.name}</span>
              {h.maxGuests && <span className="ml-2 text-xs text-gray-400">Max {h.maxGuests} guests</span>}
              {h.isPartitioned && <span className="ml-2 text-xs bg-primary-50 text-primary-600 px-1.5 py-0.5 rounded">Partitioned</span>}
              <span className="ml-2 text-xs text-gray-400">{h.partitions?.length ?? 0} partition(s)</span>
            </div>
            <div className="flex items-center gap-2">
              <Btn variant="outline" onClick={(e) => { e.stopPropagation(); startEdit(h); }}>Edit</Btn>
              <Btn variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(h.id); }}>Delete</Btn>
              <span className="text-gray-400 text-xs">{expandedId === h.id ? '▲' : '▼'}</span>
            </div>
          </div>

          {expandedId === h.id && (
            <div className="px-5 pb-5 pt-1 border-t border-surface-border bg-surface-muted/20">
              <PartitionsPanel hall={h} paxRanges={paxRanges} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Function Accounts tab ────────────────────────────────────────────────────

function FunctionAccountsTab() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ name: '', departmentId: '' });
  const [editingId, setEditingId] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    const { data } = await client.get('/function-accounts');
    setAccounts(data);
  };

  useEffect(() => { load(); }, []);

  async function handleSave() {
    setErr('');
    try {
      const body = { name: form.name, departmentId: form.departmentId ? Number(form.departmentId) : null };
      if (editingId) {
        await client.put(`/function-accounts/${editingId}`, body);
        setEditingId(null);
      } else {
        await client.post('/function-accounts', body);
      }
      setForm({ name: '', departmentId: '' });
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Save failed');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this function account?')) return;
    try {
      await client.delete(`/function-accounts/${id}`);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Delete failed');
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-surface-border p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {editingId ? `Editing Account #${editingId}` : 'New Function Account'}
        </h3>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="w-48">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="w-36">
            <Input label="Department ID" type="number" value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              placeholder="optional" />
          </div>
          <Btn size="md" onClick={handleSave} disabled={!form.name}>
            {editingId ? 'Update' : 'Add'}
          </Btn>
          {editingId && (
            <Btn variant="ghost" size="md" onClick={() => { setEditingId(null); setForm({ name: '', departmentId: '' }); setErr(''); }}>
              Cancel
            </Btn>
          )}
        </div>
        <ErrMsg msg={err} />
      </div>

      <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Dept ID</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {accounts.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-xs">No function accounts yet</td></tr>
            )}
            {accounts.map((a) => (
              <tr key={a.id} className="hover:bg-surface-muted/50">
                <td className="px-4 py-2 text-gray-400">{a.id}</td>
                <td className="px-4 py-2 font-medium">{a.name}</td>
                <td className="px-4 py-2 text-gray-400">{a.departmentId ?? '—'}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <Btn variant="outline" onClick={() => { setEditingId(a.id); setForm({ name: a.name, departmentId: a.departmentId ?? '' }); }}>Edit</Btn>
                  <Btn variant="danger" onClick={() => handleDelete(a.id)}>Delete</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── HallSetup page ───────────────────────────────────────────────────────────

const TABS = ['Halls & Partitions', 'Pax Ranges', 'Function Accounts'];

export default function HallSetup() {
  const [activeTab, setActiveTab] = useState(0);
  const [paxRanges, setPaxRanges] = useState([]);

  const loadPaxRanges = useCallback(async () => {
    const { data } = await client.get('/pax-ranges');
    setPaxRanges(data);
  }, []);

  useEffect(() => { loadPaxRanges(); }, [loadPaxRanges]);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Hall Setup</h1>
        <p className="text-sm text-gray-500">Configure banquet halls, partitions, pax ranges, and rates.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-surface-border">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              activeTab === i
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 0 && <HallsTab paxRanges={paxRanges} />}
      {activeTab === 1 && <PaxRangesTab paxRanges={paxRanges} onRefresh={loadPaxRanges} />}
      {activeTab === 2 && <FunctionAccountsTab />}
    </div>
  );
}
