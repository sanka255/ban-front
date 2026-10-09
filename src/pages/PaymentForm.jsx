import React, { useEffect, useState } from 'react';
import client from '../api/client';

export default function PaymentForm({ reservationId, onSuccess }) {
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrencyId, setSelectedCurrencyId] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const { data } = await client.get('/currencies');
        const active = (data || []).filter((currency) => currency.isActive !== false);
        setCurrencies(active);
        const defaultCurrency = active.find((currency) => currency.code === 'LKR') || active[0];
        setSelectedCurrencyId(defaultCurrency ? String(defaultCurrency.id) : '');
      } catch {
        setCurrencies([]);
      }
    };

    loadCurrencies();
  }, []);

  const selectedCurrency = currencies.find((currency) => String(currency.id) === String(selectedCurrencyId)) || null;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    const numericAmount = Number(amount);
    if (!reservationId || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter a valid payment amount.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        reservationId,
        amount: numericAmount,
        currencyCode: selectedCurrency?.code || 'LKR',
        ...(selectedCurrency ? { currencyId: selectedCurrency.id } : {}),
      };

      const { data } = await client.post(`/reservations/${reservationId}/payments/initiate`, payload);
      setMessage(`Payment initiated: ${data.gatewayProvider.toUpperCase()} • ${data.status}`);
      setAmount('');
      onSuccess?.(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initiate payment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block col-span-2">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Amount</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none ring-0"
            style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          />
        </label>

        <label className="block col-span-2">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Currency</span>
          <select
            value={selectedCurrencyId}
            onChange={(event) => setSelectedCurrencyId(event.target.value)}
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            {currencies.length === 0 ? (
              <option value="">No active currencies</option>
            ) : (
              currencies.map((currency) => (
                <option key={currency.id} value={String(currency.id)}>
                  {currency.code} — {currency.name}
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
      )}

      {message && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{message}</p>
      )}

      <button
        type="submit"
        disabled={submitting || currencies.length === 0}
        className="w-full rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: '#111827' }}
      >
        {submitting ? 'Initiating payment…' : 'Initiate Payment'}
      </button>
    </form>
  );
}
