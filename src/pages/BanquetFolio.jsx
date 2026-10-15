import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
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
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    client.get('/pms-reservations')
      .then(({ data }) => {
        if (!active) return;
        setOptions(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setOptions([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const selectedId = pmsId || '';

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Post to Hotel Room</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <p className="text-sm text-gray-500">Choose the current in-house guest to receive the banquet charges.</p>

        {loading ? (
          <div className="text-sm text-gray-500">Loading current in-house guests…</div>
        ) : options.length > 0 ? (
          <select
            value={selectedId}
            onChange={(e) => setPmsId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            <option value="">Select a room</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.displayText || option.label || `PMS ${option.id}`}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="number" min="1" value={pmsId} onChange={(e) => setPmsId(e.target.value)}
            placeholder="PMS Reservation ID…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => { const id = Number(pmsId); if (id) onSelect(id); }}
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

  function openBillPdf() {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const guestName = `${reservation.guest?.firstName || ''} ${reservation.guest?.lastName || ''}`.trim() || 'Guest';
    const lines = allLines.length > 0 ? allLines : [];
    const baseTotal = Number(summary?.totalBaseCharge ?? 0);
    const taxTotal = Number(summary?.totalTax ?? 0);
    const grandTotal = Number(summary?.totalWithTax ?? 0);
    const depositsTotal = Number(summary?.totalDeposits ?? 0);
    const pendingPaymentTotal = Number(summary?.pendingPaymentTotal ?? 0);
    const totalReceived = Number(summary?.totalReceived ?? 0);
    const balanceDue = Math.max(0, grandTotal - totalReceived);
    const typeBreakdown = Array.isArray(summary?.chargeBreakdown) ? summary.chargeBreakdown : [];

    const rowsHtml = lines.length
      ? lines.map((line) => {
          const charge = Number(line.charge ?? 0);
          const tax = Number(line.taxAmount ?? 0);
          const total = Number(line.chargeWithTax ?? charge + tax);
          return `
            <tr style="border-bottom:0.5px solid var(--border);">
              <td style="padding: 6px 4px 6px 0; vertical-align: top;">${line.description || 'Charge'}<br><span style="color: var(--text-muted); font-size: 11px;">${(line.lineType || 'item').toUpperCase()}</span></td>
              <td style="padding: 6px 0; text-align: right; vertical-align: top;">${fmt(charge)}</td>
              <td style="padding: 6px 0; text-align: right; vertical-align: top;">${fmt(tax)}</td>
              <td style="padding: 6px 0; text-align: right; vertical-align: top;">${fmt(total)}</td>
            </tr>`;
        }).join('')
      : `
        <tr>
          <td colspan="4" style="padding: 12px 0; text-align: center; color: var(--text-muted);">No bill lines generated yet.</td>
        </tr>`;

    const invoiceHtml = `
      <div style="background: var(--surface-1); border-radius: 12px; padding: 1rem; font-family: Arial, sans-serif; color: #111827;">
        <div style="background: white; border: 0.5px solid #dfe3ea; border-radius: 12px; padding: 1rem; font-size: 13px;">
          <div style="text-align: center; margin-bottom: 12px;">
            <p style="font-weight: 600; font-size: 15px; margin:0;">Synora — Banquet invoice</p>
            <p style="color: #6b7280; font-size: 12px; margin: 2px 0 0;">Sample bill. Amounts in LKR</p>
          </div>

          <div style="border-top: 0.5px solid #dfe3ea; border-bottom: 0.5px solid #dfe3ea; padding: 10px 0; margin-bottom: 12px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 12px;">
            <div><span style="color: #6b7280;">Bill no</span><br>${reservation.reservationCode || 'BQ-0000'}</div>
            <div><span style="color: #6b7280;">Reservation</span><br>${reservation.reservationCode || 'N/A'}</div>
            <div><span style="color: #6b7280;">Guest</span><br>${guestName}</div>
            <div><span style="color: #6b7280;">Function</span><br>${reservation.status || 'Banquet'}</div>
            <div><span style="color: #6b7280;">Event</span><br>${dateSlots?.[0]?.fromDate || '—'}</div>
            <div><span style="color: #6b7280;">Guests</span><br>${reservation.numberOfGuests ?? 0}</div>
          </div>

          <table style="width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 12px;">
            <colgroup>
              <col style="width: 37%;"><col style="width: 21%;"><col style="width: 19%;"><col style="width: 23%;">
            </colgroup>
            <tbody>
              <tr style="color: #6b7280; border-bottom: 0.5px solid #dfe3ea;">
                <td style="padding: 4px 0;">Item</td>
                <td style="padding: 4px 0; text-align: right;">Charge</td>
                <td style="padding: 4px 0; text-align: right;">Tax</td>
                <td style="padding: 4px 0; text-align: right;">Total</td>
              </tr>
              ${rowsHtml}
            </tbody>
          </table>

          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; border-top: 0.5px solid #dfe3ea;">
            <tbody>
              ${typeBreakdown.filter((item) => Number(item?.total || 0) > 0).map((item) => `
                <tr>
                  <td style="padding: 5px 0 2px; color: #6b7280;">${item.label || 'Charge'}</td>
                  <td style="padding: 5px 0 2px; text-align: right;">${fmt(item.total)}</td>
                </tr>
              `).join('')}
              <tr><td style="padding: 2px 0; color: #6b7280;">Tax</td><td style="padding: 2px 0; text-align: right;">${fmt(taxTotal)}</td></tr>
              <tr><td style="padding: 6px 0 2px; font-weight: 600;">Grand total</td><td style="padding: 6px 0 2px; text-align: right; font-weight: 600;">${fmt(grandTotal)}</td></tr>
            </tbody>
          </table>

          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; border-top: 0.5px solid #dfe3ea;">
            <tbody>
              <tr><td style="padding: 5px 0 2px; color: #6b7280;">Deposits</td><td style="padding: 5px 0 2px; text-align: right;">${fmt(depositsTotal)}</td></tr>
              <tr><td style="padding: 5px 0 2px; color: #6b7280;">Received</td><td style="padding: 5px 0 2px; text-align: right;">${fmt(totalReceived)}</td></tr>
              ${pendingPaymentTotal > 0 ? `<tr><td style="padding: 5px 0 2px; color: #d97706;">Pending payment</td><td style="padding: 5px 0 2px; text-align: right; color: #d97706;">${fmt(pendingPaymentTotal)}</td></tr>` : ''}
              <tr><td style="padding: 6px 0 0; font-weight: 600;">Balance due</td><td style="padding: 6px 0 0; text-align: right; font-weight: 600;">${fmt(balanceDue)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    doc.html(invoiceHtml, {
      callback: (pdf) => pdf.output('dataurlnewwindow'),
      margin: [20, 15, 20, 15],
      x: 0,
      y: 0,
      width: 555,
      windowWidth: 900,
    });
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

  async function deleteDeposit(depositId) {
    if (!confirm('Are you sure you want to delete this deposit? If no deposits remain, the reservation will revert to tentative.')) return;
    try {
      await client.delete(`/deposits/${depositId}`);
      load();
    } catch (err) { alert(err.response?.data?.error || 'Failed to delete deposit'); }
  }

  if (loading) return <div className="text-center py-12 text-gray-400 animate-pulse">Loading folio…</div>;
  if (!folio) return <div className="text-center py-12 text-gray-400">Folio not found</div>;

  const reservation = folio?.reservation ?? {};
  const dateSlots = folio?.dateSlots ?? folio?.reservation?.dateSlots ?? [];
  const summary = folio?.summary ?? {
    totalBaseCharge: folio?.totals?.baseCharges ?? 0,
    totalTax: folio?.totals?.taxAmount ?? 0,
    totalWithTax: folio?.totals?.totalWithTax ?? 0,
    extraChargeTotal: 0,
    pendingExtraChargeCount: 0,
    chargeBreakdown: folio?.totals?.chargeBreakdown ?? [],
    totalDeposits: folio?.totals?.depositsTotal ?? 0,
    settledDeposits: folio?.totals?.settledDeposits ?? 0,
    capturedPayments: folio?.totals?.capturedPayments ?? 0,
    pendingPaymentTotal: 0,
    pendingPaymentCount: 0,
    totalReceived: folio?.totals?.totalReceived ?? 0,
    outstandingBalance: folio?.totals?.outstandingBalance ?? 0,
  };
  const chargeBreakdown = Array.isArray(summary?.chargeBreakdown) ? summary.chargeBreakdown : [];
  const billBreakdown = chargeBreakdown.length
    ? chargeBreakdown
    : [{ type: 'base', label: 'Hall / Base Charges', total: Number(summary?.totalBaseCharge ?? 0) }];
  const deposits = folio?.deposits ?? [];

  const allLines = dateSlots.flatMap(ds => Array.isArray(ds?.billLines) ? ds.billLines : []);
  const hasUnpostedLines = allLines.some(l => !l.fromPms);
  const canPostToPms = hasUnpostedLines;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Folio — {reservation.reservationCode}</h1>
              {reservation.status && (
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  reservation.status === 'guaranteed'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : reservation.status === 'tentative'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                }`}>
                  {reservation.status}
                </span>
              )}
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{reservation.guest?.firstName} {reservation.guest?.lastName} · {reservation.numberOfGuests} guests</p>
            {reservation.isComplementary && (
              <span className="mt-3 inline-flex rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-purple-300">Complementary</span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {msg && <span className="text-xs self-center font-medium" style={{ color: '#86efac' }}>{msg}</span>}
            {canPostToPms && (
              <button onClick={() => setShowPmsModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold px-4 py-2 rounded-xl shadow-[0_0_22px_rgba(245,158,11,0.22)] transition-all">
                📤 Post to Room
              </button>
            )}
            <button onClick={openBillPdf}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-[0_0_22px_rgba(16,185,129,0.18)] transition-all">
              Open PDF
            </button>
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
        const hasBill = (ds.billLines ?? []).length > 0 || Number(ds.charge ?? 0) > 0 || (ds.requestedItems ?? []).length > 0 || (ds.requestedMenuItems ?? []).length > 0;
        return (
          <div key={ds.id} className="glass-card rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)', background: 'rgba(148,163,184,0.04)' }}>
              <div>
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {ds.partition?.hall?.name || ds.hall?.name || 'Hall'} — {ds.partition?.name || ds.partition || 'Partition'}
                </span>
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
        <div className="glass-card rounded-2xl p-4 space-y-3 text-sm">
          <h3 className="font-semibold border-b pb-2" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-subtle)' }}>Summary</h3>

          <div className="rounded-xl border border-slate-700/60 bg-slate-900/20 p-3 space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Total Bill Breakdown</div>
            {billBreakdown.map((item) => (
              Number(item?.total || 0) > 0 ? (
                <div key={`${item.type}-${item.label}`} className="flex justify-between text-xs">
                  <span style={{ color: 'var(--text-secondary)' }}>{item.label || 'Charge'}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{fmt(item.total)}</span>
                </div>
              ) : null
            ))}
            <div className="flex justify-between text-xs"><span style={{ color: 'var(--text-secondary)' }}>Tax</span><span className="text-amber-400">{fmt(summary?.totalTax)}</span></div>
            <div className="flex justify-between font-bold border-t pt-2 text-sm" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
              <span>Total Bill</span><span>{fmt(summary?.totalWithTax)}</span>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Payments</div>
            <div className="flex justify-between text-xs text-emerald-400"><span>Deposits Received</span><span>{fmt(summary?.totalDeposits)}</span></div>
            <div className="flex justify-between text-xs text-emerald-400"><span>Captured Payments</span><span>{fmt(summary?.capturedPayments)}</span></div>
            {Number(summary?.pendingPaymentTotal || 0) > 0 && (
              <div className="flex justify-between text-xs text-amber-400"><span>Pending Payments</span><span>{fmt(summary?.pendingPaymentTotal)}</span></div>
            )}
            <div className="flex justify-between font-bold text-sm pt-2 border-t" style={{ borderColor: 'rgba(16,185,129,0.2)', color: 'var(--text-primary)' }}>
              <span>Total Received</span><span>{fmt(summary?.totalReceived)}</span>
            </div>
          </div>

          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <div className="flex justify-between font-bold text-sm">
              <span className={((summary?.outstandingBalance ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400')}>Outstanding</span>
              <span className={((summary?.outstandingBalance ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400')}>{fmt(summary?.outstandingBalance)}</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <PaymentForm reservationId={reservationId} onSuccess={load} />
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
                  <button onClick={() => deleteDeposit(d.id)} title="Delete deposit" className="text-xs text-red-400 hover:text-red-300 px-1 py-0.5 rounded hover:bg-red-500/10">✕</button>
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
