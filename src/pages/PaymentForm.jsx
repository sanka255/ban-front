import React, { useEffect, useState } from 'react';
import client from '../api/client';

export default function PaymentForm({ reservationId, onSuccess }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [extraItems, setExtraItems] = useState([]);
  const [selectedExtraId, setSelectedExtraId] = useState('');
  const [extraQuantity, setExtraQuantity] = useState('1');
  const [extraPrice, setExtraPrice] = useState('');
  const [extraReason, setExtraReason] = useState('');
  const [extraComplementary, setExtraComplementary] = useState(false);
  const [addingExtra, setAddingExtra] = useState(false);

  useEffect(() => {
    const loadExtraItems = async () => {
      try {
        const { data } = await client.get('/extra-charge-items?active=true');
        const items = Array.isArray(data) ? data : [];
        setExtraItems(items);
        if (items.length > 0) {
          setSelectedExtraId(String(items[0].id));
          setExtraPrice(String(Number(items[0].defaultPrice || 0)));
        }
      } catch {
        setExtraItems([]);
      }
    };

    loadExtraItems();
  }, []);

  const selectedExtra = extraItems.find((item) => String(item.id) === String(selectedExtraId)) || null;

  useEffect(() => {
    if (!selectedExtra) return;
    setExtraPrice(String(Number(selectedExtra.defaultPrice || 0)));
    setExtraComplementary(Boolean(selectedExtra.allowComplementary && selectedExtra.allowComplementary));
  }, [selectedExtraId]);

  async function handleAddExtraCharge() {
    if (!reservationId || !selectedExtra) {
      setError('Choose an extra charge item first.');
      return;
    }

    const quantity = Number(extraQuantity || 1);
    const unitPrice = Number(extraPrice || 0);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setError('Price must be a valid non-negative value.');
      return;
    }

    if (extraComplementary && (!extraReason || !String(extraReason).trim())) {
      setError('Complementary extras require a reason.');
      return;
    }

    setAddingExtra(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        reservationId,
        catalogueItemId: Number(selectedExtra.id),
        chargeType: selectedExtra.chargeType,
        description: selectedExtra.name,
        unitPrice,
        quantity,
        reason: extraReason || undefined,
        explanation: extraReason || undefined,
        isComplementary: extraComplementary,
      };

      await client.post(`/reservations/${reservationId}/extra-charges`, payload, {
        headers: { 'idempotency-key': `extra-${reservationId}-${selectedExtra.id}-${Date.now()}` },
      });

      setMessage(`Extra charge added: ${selectedExtra.name}`);
      setExtraReason('');
      setExtraComplementary(Boolean(selectedExtra.allowComplementary));
      setExtraQuantity('1');
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add extra charge.');
    } finally {
      setAddingExtra(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed p-3" style={{ borderColor: 'var(--border-color)', background: 'rgba(148,163,184,0.03)' }}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Extra charge</span>
          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{extraItems.length} items</span>
        </div>

        {extraItems.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No catalog items available.</p>
        ) : (
          <div className="space-y-2">
            <select
              value={selectedExtraId}
              onChange={(event) => setSelectedExtraId(event.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              {extraItems.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.name} ({item.chargeType})
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={extraPrice}
                onChange={(event) => setExtraPrice(event.target.value)}
                placeholder="Price"
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
              <input
                type="number"
                min="1"
                step="1"
                value={extraQuantity}
                onChange={(event) => setExtraQuantity(event.target.value)}
                placeholder="Qty"
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
            </div>

            {selectedExtra?.allowComplementary && (
              <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={extraComplementary} onChange={(event) => setExtraComplementary(event.target.checked)} />
                Complementary
              </label>
            )}

            {(extraComplementary || selectedExtra?.allowPriceOverride) && (
              <input
                value={extraReason}
                onChange={(event) => setExtraReason(event.target.value)}
                placeholder={extraComplementary ? 'Complementary reason' : 'Override reason'}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
            )}

            <button
              type="button"
              onClick={handleAddExtraCharge}
              disabled={addingExtra}
              className="w-full rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-40"
              style={{ borderColor: 'var(--border-color)', background: 'rgba(16,185,129,0.1)', color: '#86efac' }}
            >
              {addingExtra ? 'Adding…' : 'Add selected extra'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
      )}

      {message && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{message}</p>
      )}
    </div>
  );
}
