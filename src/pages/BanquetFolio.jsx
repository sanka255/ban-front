import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client';
import PaymentForm from './PaymentForm';

// ─── Status badge ─────────────────────────────────────────────────────────────
const LINE_TYPE_COLOR = {
  hall_charge: 'bg-blue-100 text-blue-800',
  item:        'bg-green-100 text-green-800',
  menu:        'bg-purple-100 text-purple-800',
  package:     'bg-orange-100 text-orange-800',
  extra:       'bg-gray-100 text-gray-600',
};

function fmt(n) { return Number(n ?? 0).toLocaleString('en-LK', { minimumFractionDigits: 2 }); }

// ─── PMS Search Modal ─────────────────────────────────────────────────────────
function PmsSearchModal({ onSelect, onClose }) {
  const [pmsId, setPmsId] = useState('');
  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Post to Hotel Room</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <p className="text-sm text-gray-500">Enter the guest's Synora PMS reservation ID to post banquet charges to their hotel folio.</p>
        <input
          type="number" min="1" value={pmsId} onChange={(e) => setPmsId(e.target.value)}
          placeholder="PMS Reservation ID…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => { if (pmsId) onSelect(Number(pmsId)); }}
            disabled={!pmsId}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-40"
          >
            Post Charges
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Deposit Form ─────────────────────────────────────────────────────────────
function DepositForm({ reservationId, onCreated }) {
  const [form, setForm] = useState({ amount: '', paymentMethod: 'cash', receiptNo: '', remark: '' });
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await client.post('/deposits', { ...form, reservationId, amount: Number(form.amount) });
      setForm({ amount: '', paymentMethod: 'cash', receiptNo: '', remark: '' });
      onCreated?.();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-2 mt-3">
      <input required type="number" step="0.01" min="0" placeholder="Amount *"
        value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm col-span-2" />
      <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
        {['cash', 'card', 'bank_transfer', 'cheque'].map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <input placeholder="Receipt No" value={form.receiptNo} onChange={(e) => setForm({ ...form, receiptNo: e.target.value })}
        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
      <input placeholder="Remark" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })}
        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm col-span-2" />
      <button type="submit" disabled={saving}
        className="col-span-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-1.5 text-sm font-semibold disabled:opacity-40">
        {saving ? 'Saving…' : 'Record Deposit'}
      </button>
    </form>
  );
}

// ─── BanquetFolio ─────────────────────────────────────────────────────────────
export default function BanquetFolio({ reservationId: propId }) {
  const { id: paramId } = useParams();
  const reservationId = propId ?? Number(paramId);
  const [folio, setFolio]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [generating, setGenerating]   = useState(null); // slotId being generated
  const [showPmsModal, setShowPmsModal] = useState(false);
  const [postResult, setPostResult]   = useState(null);
  const [msg, setMsg]                 = useState('');
  const [showDepositForm, setShowDepositForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await client.get(`/reservations/${reservationId}/folio`);
      setFolio(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [reservationId]);

  async function generateBill(slotId, regen = false) {
    setGenerating(slotId);
    try {
      const endpoint = regen ? `/date-slots/${slotId}/regenerate-bill` : `/date-slots/${slotId}/generate-bill`;
      await client.post(endpoint);
      setMsg('Bill generated ✓'); setTimeout(() => setMsg(''), 3000);
      load();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed';
      if (err.response?.status === 409 && !regen) {
        if (confirm(`${msg}\n\nRegenerate (will supersede existing lines)?`)) {
          generateBill(slotId, true);
        }
      } else {
        alert(msg);
      }
    } finally { setGenerating(null); }
  }

  async function handlePostToRoom(pmsReservationId) {
    setShowPmsModal(false);
    try {
      const { data } = await client.post(`/reservations/${reservationId}/post-to-room`, { pmsReservationId });
      setPostResult(data);
      load();
    } catch (err) { alert(err.response?.data?.error || 'Post to room failed'); }
  }

  async function settleDeposit(depositId) {
    if (!confirm('Mark this deposit as settled?')) return;
    try {
      await client.put(`/deposits/${depositId}/settle`);
      load();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  }

  if (loading) return <div className="text-center py-12 text-gray-400 animate-pulse">Loading folio…</div>;
  if (!folio) return <div className="text-center py-12 text-gray-400">Folio not found</div>;

  const reservation = folio?.reservation ?? {};
  const dateSlots = folio?.dateSlots ?? [];
  const summary = folio?.summary ?? {};
  const deposits = folio?.deposits ?? [];

  const allLines = dateSlots.flatMap(ds => Array.isArray(ds?.billLines) ? ds.billLines : []);
  const hasUnpostedLines = allLines.some(l => !l.fromPms);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Folio — {reservation.reservationCode}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{reservation.guest?.firstName} {reservation.guest?.lastName} · {reservation.numberOfGuests} guests</p>
            {reservation.isComplementary && (
              <span className="mt-3 inline-flex rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-purple-300">Complementary</span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {msg && <span className="text-xs self-center font-medium" style={{ color: '#86efac' }}>{msg}</span>}
            {hasUnpostedLines && (
              <button onClick={() => setShowPmsModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold px-4 py-2 rounded-xl shadow-[0_0_22px_rgba(245,158,11,0.22)] transition-all">
                📤 Post to Room
              </button>
            )}
            <button onClick={() => setShowDepositForm(s => !s)}
              className="border text-sm px-4 py-2 rounded-xl transition-all hover:border-amber-500/40 hover:bg-amber-500/5"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-hover)' }}>
              + Deposit
            </button>
          </div>
        </div>
      </div>

      {/* Post result banner */}
      {postResult && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 flex justify-between">
          <span>✓ Posted {postResult.posted} charge(s) to PMS reservation {postResult.pmsReservationId} ({postResult.skipped} already posted)</span>
          <button onClick={() => setPostResult(null)} className="text-emerald-300 hover:text-emerald-200">✕</button>
        </div>
      )}

      {/* Date slots + bill lines */}
      {dateSlots.map(ds => {
        const hasBill = (ds.billLines ?? []).length > 0;
        return (
          <div key={ds.id} className="glass-card rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)', background: 'rgba(148,163,184,0.04)' }}>
              <div>
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{ds.hall} — {ds.partition}</span>
                <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>{ds.fromDate} · {ds.fromTime}–{ds.toTime}</span>
              </div>
              <button
                onClick={() => generateBill(ds.id)}
                disabled={generating === ds.id}
                className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-40 transition-all"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: '#111827' }}
              >
                {generating === ds.id ? '…' : hasBill ? '🔄 Re-generate' : '⚡ Generate Bill'}
              </button>
            </div>

            {hasBill ? (
              <table className="w-full text-xs">
                <thead style={{ backgroundColor: 'rgba(148,163,184,0.05)', color: 'var(--text-secondary)' }} className="uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Description</th>
                    <th className="px-4 py-2 text-right">Charge</th>
                    <th className="px-4 py-2 text-right">Tax</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-center">PMS</th>
                  </tr>
                </thead>
                <tbody style={{ borderColor: 'var(--border-subtle)' }} className="divide-y">
                  {(ds.billLines ?? []).map(line => (
                    <tr key={line.id} style={{ backgroundColor: 'transparent' }}>
                      <td className="px-4 py-2">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${LINE_TYPE_COLOR[line.lineType] ?? 'bg-gray-100 text-gray-600'}`}>
                          {line.lineType}
                        </span>
                      </td>
                      <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>{line.description}</td>
                      <td className="px-4 py-2 text-right" style={{ color: 'var(--text-primary)' }}>{fmt(line.charge)}</td>
                      <td className="px-4 py-2 text-right text-amber-400">{fmt(line.taxAmount)}</td>
                      <td className="px-4 py-2 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(line.chargeWithTax)}</td>
                      <td className="px-4 py-2 text-center">
                        {line.fromPms
                          ? <span className="text-green-600 text-xs font-semibold">✓ Posted</span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>No bill generated for this slot yet.</p>
            )}
          </div>
        );
      })}

      {/* Summary + Payment + Deposits */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Financial summary */}
        <div className="glass-card rounded-2xl p-4 space-y-2 text-sm">
          <h3 className="font-semibold border-b pb-2" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-subtle)' }}>Summary</h3>
          <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Base Charges</span><span style={{ color: 'var(--text-primary)' }}>{fmt(summary?.totalBaseCharge)}</span></div>
          <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Tax</span><span className="text-amber-400">{fmt(summary?.totalTax)}</span></div>
          <div className="flex justify-between font-bold border-t pt-2" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}><span>Total</span><span>{fmt(summary?.totalWithTax)}</span></div>
          <div className="flex justify-between text-emerald-400"><span>Deposits Settled</span><span>−{fmt(summary?.settledDeposits)}</span></div>
          <div className={`flex justify-between font-bold text-base pt-1 ${(summary?.outstandingBalance ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            <span>Outstanding</span><span>{fmt(summary?.outstandingBalance)}</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <h3 className="font-semibold border-b pb-2 mb-3" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-subtle)' }}>Payment</h3>
          <PaymentForm reservationId={reservationId} onSuccess={() => load()} />
        </div>

        {/* Deposits */}
        <div className="glass-card rounded-2xl p-4">
          <h3 className="font-semibold border-b pb-2 mb-2" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-subtle)' }}>Deposits</h3>
          {(deposits ?? []).length === 0 && !showDepositForm && (
            <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No deposits recorded</p>
          )}
          <div className="space-y-1.5">
            {(deposits ?? []).map(d => (
              <div key={d.id} className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{fmt(d.amount)}</span>
                  <span className="ml-1.5" style={{ color: 'var(--text-muted)' }}>{d.paymentMethod}</span>
                  {d.receiptNo && <span className="ml-1" style={{ color: 'var(--text-muted)' }}>#{d.receiptNo}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {d.settled
                    ? <span className="text-emerald-400 font-semibold">Settled</span>
                    : <button onClick={() => settleDeposit(d.id)} className="font-medium text-amber-400 hover:text-amber-300">Settle</button>
                  }
                </div>
              </div>
            ))}
          </div>
          {showDepositForm && (
            <DepositForm reservationId={reservationId} onCreated={() => { load(); setShowDepositForm(false); }} />
          )}
        </div>
      </div>

      {showPmsModal && (
        <PmsSearchModal onSelect={handlePostToRoom} onClose={() => setShowPmsModal(false)} />
      )}
    </div>
  );
}
