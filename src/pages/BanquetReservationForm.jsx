import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

// ─── Small reusables ─────────────────────────────────────────────────────────

function Inp({ label, ...p }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>}
      <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" {...p} />
    </label>
  );
}
function Sel({ label, children, ...p }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>}
      <select className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" {...p}>{children}</select>
    </label>
  );
}
function Err({ msg }) {
  if (!msg) return null;
  return <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{msg}</p>;
}
function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">{title}</h3>
      {children}
    </div>
  );
}

// ─── Availability indicator per slot ─────────────────────────────────────────

function AvailabilityBadge({ state }) {
  if (state === 'checking') return <span className="text-xs text-gray-400 animate-pulse">Checking…</span>;
  if (state === 'available') return <span className="text-xs font-semibold text-green-600">✓ Available</span>;
  if (state === 'conflict') return <span className="text-xs font-semibold text-red-600">✗ Conflict</span>;
  return null;
}

const SLOT_DEFAULTS = { partitionId: '', fromDate: '', toDate: '', fromTime: '09:00', toTime: '17:00', charge: '', availability: null };

// ─── BanquetReservationForm ───────────────────────────────────────────────────

export default function BanquetReservationForm({ onCreated, onCancel }) {
  // Guest
  const [useExistingGuest, setUseExistingGuest] = useState(false);
  const [guestId, setGuestId] = useState('');
  const [guestSearch, setGuestSearch] = useState('');
  const [guestResults, setGuestResults] = useState([]);
  const [travelAgents, setTravelAgents] = useState([]);
  const [travelCreditWarning, setTravelCreditWarning] = useState(null);
  const [guestData, setGuestData] = useState({ title: '', firstName: '', lastName: '', phone: '', email: '', company: '', country: '' });

  // Reservation details
  const [functionAccounts, setFunctionAccounts] = useState([]);
  const [halls, setHalls] = useState([]);
  const [form, setForm] = useState({
    functionAccountId: '',
    numberOfGuests: '',
    discussedBy: '',
    broughtBy: '',
    isComplementary: false,
    complementaryReason: '',
  });

  // Date slots
  const [slots, setSlots] = useState([{ ...SLOT_DEFAULTS }]);
  const [partitionsByHall, setPartitionsByHall] = useState({});
  const [slotHalls, setSlotHalls] = useState(['']);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ── Load reference data ─────────────────────────────────────────────────
  useEffect(() => {
    client.get('/function-accounts').then(({ data }) => setFunctionAccounts(data)).catch(() => {});
    client.get('/halls').then(({ data }) => setHalls(data)).catch(() => {});
    client.get('/travel-agents').then(({ data }) => setTravelAgents(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!useExistingGuest || !guestId) {
      setTravelCreditWarning(null);
      return;
    }

    const matchedAgent = travelAgents.find((agent) => agent.guests?.some((g) => g.id === Number(guestId)));
    if (!matchedAgent) {
      setTravelCreditWarning(null);
      return;
    }

    client.get(`/travel-agents/${matchedAgent.id}/credit-status`)
      .then(({ data }) => {
        const limit = Number(data.creditLimit || 0);
        const outstanding = Number(data.outstanding || 0);
        if (limit > 0 && (data.overLimit || outstanding >= limit * 0.8)) {
          setTravelCreditWarning({ agent: matchedAgent, ...data });
        } else {
          setTravelCreditWarning(null);
        }
      })
      .catch(() => setTravelCreditWarning(null));
  }, [guestId, useExistingGuest, travelAgents]);

  // ── Guest search ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!guestSearch.trim()) { setGuestResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await client.get(`/reservations?search=${encodeURIComponent(guestSearch)}&limit=10`);
        // Use unique guests from reservations list
        const seen = new Set();
        const guests = data.reservations.map((r) => r.guest).filter((g) => g && !seen.has(g.id) && seen.add(g.id));
        setGuestResults(guests);
      } catch {}
    }, 350);
    return () => clearTimeout(t);
  }, [guestSearch]);

  // ── Load partitions when hall selection changes ─────────────────────────
  async function onSlotHallChange(idx, hallId) {
    const next = [...slotHalls]; next[idx] = hallId;
    setSlotHalls(next);
    if (!hallId) return;
    if (!partitionsByHall[hallId]) {
      const { data } = await client.get(`/halls/${hallId}/partitions`);
      setPartitionsByHall((p) => ({ ...p, [hallId]: data }));
    }
  }

  // ── Per-slot availability check ─────────────────────────────────────────
  const checkSlotAvailability = useCallback(async (idx, slot) => {
    if (!slot.partitionId || !slot.fromDate || !slot.toDate || !slot.fromTime || !slot.toTime) return;

    setSlots((prev) => {
      const next = [...prev]; next[idx] = { ...next[idx], availability: 'checking' }; return next;
    });
    try {
      const { data } = await client.get(
        `/availability?partitionId=${slot.partitionId}&fromDate=${slot.fromDate}&toDate=${slot.toDate}&fromTime=${slot.fromTime}&toTime=${slot.toTime}`
      );
      setSlots((prev) => {
        const next = [...prev]; next[idx] = { ...next[idx], availability: data.available ? 'available' : 'conflict' }; return next;
      });
    } catch {
      setSlots((prev) => {
        const next = [...prev]; next[idx] = { ...next[idx], availability: null }; return next;
      });
    }
  }, []);

  function updateSlot(idx, field, value) {
    setSlots((prev) => {
      const next = [...prev]; next[idx] = { ...next[idx], [field]: value, availability: null }; return next;
    });
    // Debounced availability check
    clearTimeout(window[`_slotCheck_${idx}`]);
    window[`_slotCheck_${idx}`] = setTimeout(() => {
      const updated = { ...slots[idx], [field]: value };
      checkSlotAvailability(idx, updated);
    }, 500);
  }

  function addSlot() {
    setSlots((p) => [...p, { ...SLOT_DEFAULTS }]);
    setSlotHalls((p) => [...p, '']);
  }

  function removeSlot(idx) {
    setSlots((p) => p.filter((_, i) => i !== idx));
    setSlotHalls((p) => p.filter((_, i) => i !== idx));
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (slots.some((s) => s.availability === 'conflict')) {
      setError('One or more slots have conflicts. Please resolve them before submitting.');
      return;
    }

    const payload = {
      ...(useExistingGuest ? { guestId: Number(guestId) } : { guest: guestData }),
      ...form,
      numberOfGuests: Number(form.numberOfGuests),
      functionAccountId: form.functionAccountId ? Number(form.functionAccountId) : null,
      dateSlots: slots.map((s) => ({
        partitionId: Number(s.partitionId),
        fromDate: s.fromDate,
        toDate:   s.toDate,
        fromTime: s.fromTime,
        toTime:   s.toTime,
        ...(s.charge ? { charge: Number(s.charge) } : {}),
      })),
    };

    setSubmitting(true);
    try {
      const { data } = await client.post('/reservations', payload);
      onCreated?.(data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to create reservation';
      const conflicts = err.response?.data?.conflictingSlots;
      setError(conflicts ? `${msg} (${conflicts.length} slot(s) in conflict)` : msg);
    } finally {
      setSubmitting(false);
    }
  }

  const hasConflict = slots.some((s) => s.availability === 'conflict');
  const partitions = (hallId) => partitionsByHall[hallId] || [];

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">New Banquet Reservation</h2>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">✕ Cancel</button>
        )}
      </div>

      {travelCreditWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-sm text-amber-800">
          ⚠ {travelCreditWarning.agent.company} is at {Number(travelCreditWarning.outstanding || 0).toFixed(2)} / {Number(travelCreditWarning.creditLimit || 0).toFixed(2)} credit. Consider staff review before confirming the booking.
        </div>
      )}

      {/* ── Guest ── */}
      <Section title="Guest">
        <div className="flex gap-3 mb-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" checked={!useExistingGuest} onChange={() => setUseExistingGuest(false)} /> New guest
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" checked={useExistingGuest} onChange={() => setUseExistingGuest(true)} /> Existing guest
          </label>
        </div>

        {useExistingGuest ? (
          <div className="space-y-2">
            <Inp label="Search by name" value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} placeholder="Type to search…" />
            {guestResults.length > 0 && (
              <div className="border border-gray-200 rounded-lg divide-y text-sm">
                {guestResults.map((g) => (
                  <button
                    key={g.id} type="button"
                    onClick={() => { setGuestId(g.id); setGuestSearch(`${g.firstName} ${g.lastName ?? ''}`); setGuestResults([]); }}
                    className={`w-full text-left px-3 py-2 hover:bg-primary-50 ${guestId === g.id ? 'bg-primary-50 font-semibold' : ''}`}
                  >
                    {g.firstName} {g.lastName} {g.phone && <span className="text-gray-400">· {g.phone}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Title" value={guestData.title} onChange={(e) => setGuestData({ ...guestData, title: e.target.value })} placeholder="Mr/Ms…" />
            <Inp label="First Name *" value={guestData.firstName} onChange={(e) => setGuestData({ ...guestData, firstName: e.target.value })} required />
            <Inp label="Last Name" value={guestData.lastName} onChange={(e) => setGuestData({ ...guestData, lastName: e.target.value })} />
            <Inp label="Phone" value={guestData.phone} onChange={(e) => setGuestData({ ...guestData, phone: e.target.value })} />
            <Inp label="Email" type="email" value={guestData.email} onChange={(e) => setGuestData({ ...guestData, email: e.target.value })} />
            <Inp label="Company" value={guestData.company} onChange={(e) => setGuestData({ ...guestData, company: e.target.value })} />
            <Inp label="Country" value={guestData.country} onChange={(e) => setGuestData({ ...guestData, country: e.target.value })} />
          </div>
        )}
      </Section>

      {/* ── Reservation Details ── */}
      <Section title="Reservation Details">
        <div className="grid grid-cols-2 gap-3">
          <Sel label="Function Account" value={form.functionAccountId} onChange={(e) => setForm({ ...form, functionAccountId: e.target.value })}>
            <option value="">None</option>
            {functionAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Sel>
          <Inp label="Number of Guests *" type="number" min="1" value={form.numberOfGuests} onChange={(e) => setForm({ ...form, numberOfGuests: e.target.value })} required />
          <Inp label="Discussed By" value={form.discussedBy} onChange={(e) => setForm({ ...form, discussedBy: e.target.value })} />
          <Inp label="Brought By" value={form.broughtBy} onChange={(e) => setForm({ ...form, broughtBy: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer mt-1">
          <input type="checkbox" checked={form.isComplementary} onChange={(e) => setForm({ ...form, isComplementary: e.target.checked })} className="rounded" />
          Complementary reservation
        </label>
        {form.isComplementary && (
          <div className="mt-2">
            <Inp
              label="Complementary Reason *"
              value={form.complementaryReason}
              onChange={(e) => setForm({ ...form, complementaryReason: e.target.value })}
              required
              placeholder="Reason for complementary booking…"
            />
          </div>
        )}
      </Section>

      {/* ── Date Slots ── */}
      <Section title="Date Slots">
        <div className="space-y-4">
          {slots.map((slot, idx) => (
            <div key={idx} className="bg-surface-muted rounded-lg p-3 border border-gray-100 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-500">Slot {idx + 1}</span>
                <div className="flex items-center gap-3">
                  <AvailabilityBadge state={slot.availability} />
                  {slots.length > 1 && (
                    <button type="button" onClick={() => removeSlot(idx)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Sel label="Hall" value={slotHalls[idx] || ''} onChange={(e) => onSlotHallChange(idx, e.target.value)}>
                  <option value="">Select hall…</option>
                  {halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </Sel>
                <Sel label="Partition *" value={slot.partitionId} onChange={(e) => updateSlot(idx, 'partitionId', e.target.value)}>
                  <option value="">Select partition…</option>
                  {partitions(slotHalls[idx]).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Sel>
                <Inp label="From Date *" type="date" value={slot.fromDate} onChange={(e) => updateSlot(idx, 'fromDate', e.target.value)} />
                <Inp label="To Date *" type="date" value={slot.toDate} onChange={(e) => updateSlot(idx, 'toDate', e.target.value)} />
                <Inp label="From Time *" type="time" value={slot.fromTime} onChange={(e) => updateSlot(idx, 'fromTime', e.target.value)} />
                <Inp label="To Time *" type="time" value={slot.toTime} onChange={(e) => updateSlot(idx, 'toTime', e.target.value)} />
                <Inp label="Charge (auto if blank)" type="number" min="0" step="0.01" value={slot.charge} onChange={(e) => updateSlot(idx, 'charge', e.target.value)} placeholder="Auto from rate" />
              </div>
              <div className="text-xs text-gray-500">
                Bill preview: hall charge {Number(slot.charge || 0).toFixed(2)} — tax is calculated once when the bill is generated and shown as a separate line item on the folio.
              </div>
            </div>
          ))}

          <button type="button" onClick={addSlot} className="text-sm text-primary-600 hover:text-primary-800 font-medium">
            + Add another slot
          </button>
        </div>
      </Section>

      <Err msg={error} />

      {hasConflict && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚠ One or more slots have scheduling conflicts. Resolve them before submitting.
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting || hasConflict || !form.numberOfGuests}
          className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl py-2.5 text-sm transition disabled:opacity-40"
        >
          {submitting ? 'Creating…' : 'Create Reservation'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
