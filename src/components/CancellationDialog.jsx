import React, { useState, useEffect } from 'react';
import client from '../api/client';

/**
 * CancellationDialog
 *
 * Shows the computed refund tier / amounts BEFORE confirming cancellation
 * so staff can see the full financial impact first.
 *
 * Props:
 *   slotId          {number}
 *   reservationCode {string}
 *   charge          {number|string}
 *   fromDate        {string}  "YYYY-MM-DD"
 *   onConfirmed     {() => void}
 *   onClose         {() => void}
 */
export default function CancellationDialog({ slotId, reservationCode, charge, fromDate, onConfirmed, onClose }) {
  const [tiers, setTiers] = useState([]);
  const [preview, setPreview] = useState(null);  // computed before confirming
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  // Compute preview client-side using loaded tiers
  useEffect(() => {
    async function load() {
      try {
        const { data } = await client.get('/cancellation-tiers');
        setTiers(data);

        // Compute daysBeforeEvent
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const event = new Date(`${fromDate}T00:00:00.000Z`);
        const daysBeforeEvent = Math.floor((event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        const tier = data.find(
          (t) => Number(t.daysMin) <= daysBeforeEvent && Number(t.daysMax) >= daysBeforeEvent
        );

        const fullChargeNum = Number(charge);
        const refundPct = tier ? Number(tier.refundPct) : 0;
        const refundableAmount = (fullChargeNum * refundPct) / 100;
        const cancellationFee = fullChargeNum - refundableAmount;

        setPreview({
          daysBeforeEvent,
          tierMatched: !!tier,
          tier: tier || null,
          refundPct,
          fullCharge: fullChargeNum,
          refundableAmount,
          cancellationFee,
        });
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, [slotId, charge, fromDate]);

  async function handleConfirm() {
    setError('');
    setConfirming(true);
    try {
      await client.post(`/date-slots/${slotId}/cancel`, { reason: reason.trim() || undefined });
      onConfirmed?.();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.warning || 'Cancellation failed');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Cancel Date Slot</h3>
            <p className="text-sm text-gray-500">{reservationCode}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* Refund preview */}
        {preview ? (
          <div className="bg-surface-muted rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Days before event</span>
              <span className="font-semibold">{preview.daysBeforeEvent}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Matching tier</span>
              {preview.tierMatched
                ? <span className="font-medium text-green-700">{preview.tier.daysMin}–{preview.tier.daysMax} days → {preview.refundPct}% refund</span>
                : <span className="font-medium text-amber-600">⚠ No tier matched — 0% refund</span>
              }
            </div>

            <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
              <div className="flex justify-between text-base font-bold">
                <span>Full Charge</span>
                <span>{preview.fullCharge.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Refundable</span>
                <span>+{preview.refundableAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-red-700">
                <span>Cancellation Fee</span>
                <span>−{preview.cancellationFee.toLocaleString()}</span>
              </div>
            </div>

            {!preview.tierMatched && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">
                No cancellation tier is configured for {preview.daysBeforeEvent} days before event. Staff should review manually.
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400 text-sm animate-pulse">Computing refund…</div>
        )}

        {/* Reason */}
        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Reason (optional)</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Cancellation reason for records…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
          />
        </label>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Go Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming || !preview}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold transition disabled:opacity-40"
          >
            {confirming ? 'Cancelling…' : 'Confirm Cancellation'}
          </button>
        </div>
      </div>
    </div>
  );
}
