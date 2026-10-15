import React, { useEffect, useMemo, useState } from 'react';
import client from '../api/client';

const CHARGE_TYPES = [
  { value: 'hall', label: 'Hall' },
  { value: 'food', label: 'Food' },
  { value: 'beverage', label: 'Beverage' },
  { value: 'item', label: 'Item' },
  { value: 'miscellaneous', label: 'Misc' },
];

const fmt = (value) => Number(value ?? 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ExtraChargesPanel({ reservationId, onRefresh }) {
  const [extras, setExtras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    chargeType: 'hall',
    description: '',
    unitPrice: '0',
    quantity: '1',
    reason: '',
    explanation: '',
    isComplementary: false,
  });

  const totals = useMemo(() => extras.reduce((acc, row) => {
    if (row.status === 'voided') return acc;
    acc.base += Number(row.charge ?? 0);
    acc.tax += Number(row.taxAmount ?? 0);
    acc.total += Number(row.chargeWithTax ?? 0);
    return acc;
  }, { base: 0, tax: 0, total: 0 }), [extras]);

  async function load() {
    if (!reservationId) return;
    try {
      setLoading(true);
      const { data } = await client.get(`/reservations/${reservationId}/extra-charges`);
      const rows = Array.isArray(data) ? data : data.extras || [];
      setExtras(rows);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load extra charges');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [reservationId]);

  async function submit(e) {
    e.preventDefault();
    setError('');

    try {
      const payload = {
        chargeType: form.chargeType,
        description: form.description,
        unitPrice: Number(form.unitPrice || 0),
        quantity: Number(form.quantity || 1),
        reason: form.reason || undefined,
        explanation: form.explanation || undefined,
        isComplementary: Boolean(form.isComplementary),
      };

      if (payload.isComplementary && !payload.reason) {
        throw new Error('A reason is required when marking an extra as complementary.');
      }

      await client.post(`/reservations/${reservationId}/extra-charges`, payload);
      setForm({
        chargeType: 'hall',
        description: '',
        unitPrice: '0',
        quantity: '1',
        reason: '',
        explanation: '',
        isComplementary: false,
      });
      await load();
      onRefresh?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unable to add extra charge');
    }
  }

  async function voidCharge(id, reason) {
    const text = reason || window.prompt('Void reason is required');
    if (!text) return;
    try {
      await client.post(`/extra-charges/${id}/void`, { reason: text });
      await load();
      onRefresh?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to void extra charge');
    }
  }

  const lineTotal = Number(form.unitPrice || 0) * Number(form.quantity || 1);

  return (
    <div className="glass-card rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-700 pb-3">
        <h3 className="text-lg font-semibold text-white">Extra Charges</h3>
        <span className="text-xs text-slate-300">{extras.filter((item) => item.status !== 'voided').length} active</span>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {CHARGE_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, chargeType: type.value }))}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition ${form.chargeType === type.value ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-500'}`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block col-span-2">
            <span className="block text-xs text-slate-300 mb-1">Description</span>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              placeholder="Extra hour / Corkage / Cleaning"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-slate-300 mb-1">Unit price</span>
            <input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
          </label>
          <label className="block">
            <span className="block text-xs text-slate-300 mb-1">Quantity</span>
            <input type="number" min="0.01" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
          </label>
          <label className="block col-span-2">
            <span className="block text-xs text-slate-300 mb-1">Reason</span>
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="Required for complementary or overrides" />
          </label>
          <label className="block col-span-2">
            <span className="block text-xs text-slate-300 mb-1">Explanation</span>
            <textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} rows="2" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="Optional detail for staff" />
          </label>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
          <div>
            <div className="text-slate-400">Live total</div>
            <div className="font-semibold text-white">{fmt(lineTotal)} + tax</div>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={form.isComplementary} onChange={(e) => setForm({ ...form, isComplementary: e.target.checked })} />
            Complementary
          </label>
        </div>

        {error && <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>}

        <button type="submit" className="w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
          Add Extra Charge
        </button>
      </form>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>Totals</span>
          <span>{fmt(totals.total)} total</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs text-slate-300">
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-2"><div>Without tax</div><div className="mt-1 text-white font-semibold">{fmt(totals.base)}</div></div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-2"><div>Tax</div><div className="mt-1 text-amber-300 font-semibold">{fmt(totals.tax)}</div></div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-2"><div>With tax</div><div className="mt-1 text-emerald-300 font-semibold">{fmt(totals.total)}</div></div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400">Loading extras…</div>
      ) : extras.length === 0 ? (
        <div className="text-sm text-slate-400">No extra charges yet.</div>
      ) : (
        <div className="space-y-3">
          {extras.map((item) => (
            <div key={item.id} className={`rounded-xl border p-3 ${item.status === 'voided' ? 'border-red-500/40 bg-red-500/5 line-through opacity-70' : 'border-slate-700 bg-slate-900/80'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <span>{item.description}</span>
                    {item.isComplementary && <span className="text-[10px] uppercase tracking-wide text-purple-300">Complementary</span>}
                    {item.status === 'voided' && <span className="text-[10px] uppercase tracking-wide text-red-300">Voided</span>}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">{item.chargeType} · {item.dateSlot?.fromDate || 'Reservation'} · Qty {fmt(item.quantity)}</div>
                  {item.voidReason && <div className="mt-1 text-[11px] text-red-300">Void reason: {item.voidReason}</div>}
                </div>
                <div className="text-right text-xs text-slate-300">
                  <div>{fmt(item.charge)}</div>
                  <div className="text-amber-300">Tax {fmt(item.taxAmount)}</div>
                  <div className="text-emerald-300">{fmt(item.chargeWithTax)}</div>
                </div>
              </div>
              {!item.billLineId && item.status !== 'voided' && (
                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={() => voidCharge(item.id, item.reason)} className="text-xs text-red-300 hover:text-red-200">Void</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
