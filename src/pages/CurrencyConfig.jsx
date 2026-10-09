import React, { useEffect, useState } from 'react';
import client from '../api/client';

const emptyCurrencyForm = { code: '', name: '', symbol: '', isActive: true };

export default function CurrencyConfig() {
  const [currencies, setCurrencies] = useState([]);
  const [currencyForm, setCurrencyForm] = useState(emptyCurrencyForm);
  const [editingId, setEditingId] = useState(null);
  const [rateForm, setRateForm] = useState({
    currencyId: '',
    rateToBase: '',
    effectiveDate: new Date().toISOString().slice(0, 10),
  });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const loadCurrencies = async () => {
    try {
      setLoading(true);
      const { data } = await client.get('/currencies');
      setCurrencies(data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load currencies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrencies();
  }, []);

  const resetCurrencyForm = () => {
    setCurrencyForm(emptyCurrencyForm);
    setEditingId(null);
  };

  const handleCurrencySave = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');

    try {
      const payload = {
        code: currencyForm.code,
        name: currencyForm.name,
        symbol: currencyForm.symbol,
        isActive: currencyForm.isActive,
      };

      if (editingId) {
        await client.put(`/currencies/${editingId}`, payload);
        setStatus('Currency updated.');
      } else {
        await client.post('/currencies', payload);
        setStatus('Currency created.');
      }

      resetCurrencyForm();
      await loadCurrencies();
    } catch (err) {
      setError(err.response?.data?.error || 'Currency save failed.');
    }
  };

  const handleDeleteCurrency = async (currencyId) => {
    if (!window.confirm('Disable this currency?')) return;

    try {
      await client.delete(`/currencies/${currencyId}`);
      setStatus('Currency disabled.');
      await loadCurrencies();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to disable currency.');
    }
  };

  const handleRateSave = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');

    try {
      await client.post('/exchange-rates', {
        currencyId: Number(rateForm.currencyId),
        rateToBase: Number(rateForm.rateToBase),
        effectiveDate: rateForm.effectiveDate,
      });

      setStatus('Exchange rate created.');
      setRateForm({
        currencyId: '',
        rateToBase: '',
        effectiveDate: new Date().toISOString().slice(0, 10),
      });
      await loadCurrencies();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create exchange rate.');
    }
  };

  const latestRateMap = Object.fromEntries(
    currencies.map((currency) => {
      const latest = (currency.rates || [])[0];
      return [currency.id, latest ? Number(latest.rateToBase) : null];
    })
  );

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="glass-card rounded-2xl p-5">
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Currency configuration</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Manage currencies and the exchange-rate table used for base-currency snapshots.</p>
      </div>

      {status && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{status}</div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Currencies</h2>
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
          ) : (
            <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
              <table className="w-full text-sm">
                <thead style={{ background: 'rgba(148,163,184,0.05)' }}>
                  <tr>
                    <th className="px-3 py-2 text-left">Code</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Symbol</th>
                    <th className="px-3 py-2 text-left">Rate</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currencies.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-3 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No currencies configured.</td>
                    </tr>
                  ) : (
                    currencies.map((currency) => (
                      <tr key={currency.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                        <td className="px-3 py-2 font-semibold" style={{ color: 'var(--text-primary)' }}>{currency.code}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{currency.name}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{currency.symbol}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>
                          {latestRateMap[currency.id] != null ? `1 = ${latestRateMap[currency.id]} base` : 'Not set'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(currency.id);
                                setCurrencyForm({
                                  code: currency.code,
                                  name: currency.name,
                                  symbol: currency.symbol,
                                  isActive: currency.isActive,
                                });
                              }}
                              className="rounded-lg border px-2 py-1 text-xs font-medium"
                              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCurrency(currency.id)}
                              className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-300"
                            >
                              Disable
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="glass-card rounded-2xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
              {editingId ? 'Update currency' : 'New currency'}
            </h2>
            <form onSubmit={handleCurrencySave} className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block" style={{ color: 'var(--text-secondary)' }}>Code</span>
                <input
                  value={currencyForm.code}
                  onChange={(event) => setCurrencyForm({ ...currencyForm, code: event.target.value })}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block" style={{ color: 'var(--text-secondary)' }}>Name</span>
                <input
                  value={currencyForm.name}
                  onChange={(event) => setCurrencyForm({ ...currencyForm, name: event.target.value })}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block" style={{ color: 'var(--text-secondary)' }}>Symbol</span>
                <input
                  value={currencyForm.symbol}
                  onChange={(event) => setCurrencyForm({ ...currencyForm, symbol: event.target.value })}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </label>

              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={currencyForm.isActive}
                  onChange={(event) => setCurrencyForm({ ...currencyForm, isActive: event.target.checked })}
                />
                Active
              </label>

              <div className="flex gap-2">
                <button type="submit" className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: '#111827' }}>
                  {editingId ? 'Update' : 'Create'}
                </button>
                {editingId && (
                  <button type="button" onClick={resetCurrencyForm} className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Add exchange rate</h2>
            <form onSubmit={handleRateSave} className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block" style={{ color: 'var(--text-secondary)' }}>Currency</span>
                <select
                  value={rateForm.currencyId}
                  onChange={(event) => setRateForm({ ...rateForm, currencyId: event.target.value })}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                  <option value="">Select currency</option>
                  {currencies.map((currency) => (
                    <option key={currency.id} value={currency.id}>{currency.code}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1 block" style={{ color: 'var(--text-secondary)' }}>Rate to base</span>
                <input
                  type="number"
                  step="0.000001"
                  value={rateForm.rateToBase}
                  onChange={(event) => setRateForm({ ...rateForm, rateToBase: event.target.value })}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block" style={{ color: 'var(--text-secondary)' }}>Effective date</span>
                <input
                  type="date"
                  value={rateForm.effectiveDate}
                  onChange={(event) => setRateForm({ ...rateForm, effectiveDate: event.target.value })}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </label>

              <button type="submit" className="w-full rounded-xl px-3 py-2 text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: '#111827' }}>
                Save rate
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
