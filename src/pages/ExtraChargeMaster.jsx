import React, { useEffect, useState } from 'react';
import client from '../api/client';

const emptyForm = {
  code: '',
  name: '',
  chargeType: 'miscellaneous',
  unitLabel: 'each',
  defaultPrice: '0',
  accountId: '',
  allowPriceOverride: false,
  allowComplementary: false,
  isQuickPick: false,
  sortOrder: '0',
  isActive: true,
};

const chargeTypes = [
  'hall',
  'food',
  'beverage',
  'item',
  'miscellaneous',
];

function fmt(value) {
  return Number(value ?? 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ExtraChargeMaster() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const loadItems = async () => {
    try {
      setLoading(true);
      const { data } = await client.get('/extra-charge-items?includeInactive=true');
      setItems(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load extra charges.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setStatus('');

    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        chargeType: form.chargeType,
        unitLabel: form.unitLabel.trim() || 'each',
        defaultPrice: Number(form.defaultPrice || 0),
        accountId: form.accountId ? Number(form.accountId) : null,
        allowPriceOverride: Boolean(form.allowPriceOverride),
        allowComplementary: Boolean(form.allowComplementary),
        isQuickPick: Boolean(form.isQuickPick),
        sortOrder: Number(form.sortOrder || 0),
        isActive: Boolean(form.isActive),
      };

      if (!payload.code || !payload.name) {
        throw new Error('Code and name are required.');
      }

      if (editingId) {
        await client.put(`/extra-charge-items/${editingId}`, payload);
        setStatus('Extra charge updated.');
      } else {
        await client.post('/extra-charge-items', payload);
        setStatus('Extra charge created.');
      }

      resetForm();
      await loadItems();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unable to save extra charge.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item) => {
    try {
      await client.patch(`/extra-charge-items/${item.id}/active`, { isActive: !item.isActive });
      await loadItems();
      setStatus(`Extra charge ${item.isActive ? 'disabled' : 'enabled'}.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to update status.');
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      code: item.code || '',
      name: item.name || '',
      chargeType: item.chargeType || 'miscellaneous',
      unitLabel: item.unitLabel || 'each',
      defaultPrice: String(item.defaultPrice ?? 0),
      accountId: item.accountId ? String(item.accountId) : '',
      allowPriceOverride: Boolean(item.allowPriceOverride),
      allowComplementary: Boolean(item.allowComplementary),
      isQuickPick: Boolean(item.isQuickPick),
      sortOrder: String(item.sortOrder ?? 0),
      isActive: item.isActive !== false,
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="glass-card rounded-2xl p-5">
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Extra Charge Master</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Create and manage reusable banquet extra-charge items for quick selection at payment.</p>
      </div>

      {status && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{status}</div>}
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>{editingId ? 'Update item' : 'New item'}</h2>

          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm md:col-span-1">
                <span className="mb-1 block" style={{ color: 'var(--text-secondary)' }}>Code</span>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </label>

              <label className="block text-sm md:col-span-1">
                <span className="mb-1 block" style={{ color: 'var(--text-secondary)' }}>Name</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </label>

              <label className="block text-sm md:col-span-1">
                <span className="mb-1 block" style={{ color: 'var(--text-secondary)' }}>Type</span>
                <select value={form.chargeType} onChange={(e) => setForm({ ...form, chargeType: e.target.value })} className="w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  {chargeTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>

              <label className="block text-sm md:col-span-1">
                <span className="mb-1 block" style={{ color: 'var(--text-secondary)' }}>Unit label</span>
                <input value={form.unitLabel} onChange={(e) => setForm({ ...form, unitLabel: e.target.value })} className="w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </label>

              <label className="block text-sm md:col-span-1">
                <span className="mb-1 block" style={{ color: 'var(--text-secondary)' }}>Default price</span>
                <input type="number" step="0.01" min="0" value={form.defaultPrice} onChange={(e) => setForm({ ...form, defaultPrice: e.target.value })} className="w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </label>

              <label className="block text-sm md:col-span-1">
                <span className="mb-1 block" style={{ color: 'var(--text-secondary)' }}>Account ID</span>
                <input type="number" min="0" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} className="w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </label>

              <label className="block text-sm md:col-span-1">
                <span className="mb-1 block" style={{ color: 'var(--text-secondary)' }}>Sort order</span>
                <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className="w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </label>

              <label className="block text-sm md:col-span-1">
                <span className="mb-1 block" style={{ color: 'var(--text-secondary)' }}>Status</span>
                <select value={String(form.isActive)} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })} className="w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={form.allowPriceOverride} onChange={(e) => setForm({ ...form, allowPriceOverride: e.target.checked })} />
                Price override
              </label>

              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={form.allowComplementary} onChange={(e) => setForm({ ...form, allowComplementary: e.target.checked })} />
                Complementary
              </label>

              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={form.isQuickPick} onChange={(e) => setForm({ ...form, isQuickPick: e.target.checked })} />
                Quick pick
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60">
                {saving ? 'Saving…' : editingId ? 'Update item' : 'Create item'}
              </button>
              <button type="button" onClick={resetForm} className="rounded-xl border px-4 py-2 text-sm font-medium" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                Clear
              </button>
            </div>
          </form>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Catalog</h2>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{items.length} items</span>
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No extra charge items yet.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--border-color)', background: 'rgba(148,163,184,0.02)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                        {!item.isActive && <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-red-300">Inactive</span>}
                        {item.isQuickPick && <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300">Quick</span>}
                      </div>
                      <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{item.code} • {item.chargeType} • {item.unitLabel}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div style={{ color: 'var(--text-primary)' }}>{fmt(item.defaultPrice)}</div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>LKR</div>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end gap-2">
                    <button type="button" onClick={() => startEdit(item)} className="rounded-lg border px-2 py-1 text-xs font-medium" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>Edit</button>
                    <button type="button" onClick={() => toggleActive(item)} className="rounded-lg border px-2 py-1 text-xs font-medium" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>{item.isActive ? 'Disable' : 'Enable'}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
