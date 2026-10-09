import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import CancellationDialog from '../components/CancellationDialog';

// ─── Status display helpers ───────────────────────────────────────────────────

const RES_STATUS_STYLE = {
  tentative:   'bg-amber-100 border-amber-300 text-amber-900',
  guaranteed:  'bg-green-100 border-green-300 text-green-900',
  in_progress: 'bg-blue-100 border-blue-300 text-blue-900',
  completed:   'bg-gray-100 border-gray-300 text-gray-600',
  postponed:   'bg-purple-100 border-purple-300 text-purple-900',
  cancelled:   'bg-red-50 border-red-200 text-red-400 line-through opacity-50',
};

function addDays(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

function dayLabel(d) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

// ─── BanquetCalendar (Tape Chart) ─────────────────────────────────────────────

export default function BanquetCalendar() {
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Selected slot for detail panel / cancel / postpone
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPostpone, setShowPostpone] = useState(false);
  const [postponeForm, setPostponeForm] = useState({ fromDate: '', toDate: '', fromTime: '', toTime: '' });
  const [postponeError, setPostponeError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  // Compute the 7 dates for the current week
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  // Start from Monday
  const dow = today.getUTCDay(); // 0=Sun
  const monday = addDays(today, (weekOffset * 7) - (dow === 0 ? 6 : dow - 1));
  const dates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const fromDate = fmtDate(dates[0]);
  const toDate   = fmtDate(dates[6]);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await client.get(`/calendar?fromDate=${fromDate}&toDate=${toDate}`);
      setCalendarData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  // Find which slot (if any) occupies a given partition on a given date
  function getSlotForCell(partitionSlots, dateStr) {
    return partitionSlots.find((s) => s.fromDate <= dateStr && s.toDate >= dateStr) ?? null;
  }

  // Is this the first day of the slot's span that falls in the visible week?
  function isSlotStart(slot, dateStr) {
    return slot.fromDate === dateStr || dateStr === fromDate;
  }
  function isSlotEnd(slot, dateStr) {
    return slot.toDate === dateStr || dateStr === toDate;
  }

  async function handlePostpone() {
    setPostponeError('');
    try {
      await client.post(`/date-slots/${selectedSlot.id}/postpone`, postponeForm);
      setActionMsg('Slot postponed successfully.');
      setShowPostpone(false);
      setSelectedSlot(null);
      loadCalendar();
    } catch (err) {
      setPostponeError(err.response?.data?.error || 'Postpone failed');
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-800">Banquet Calendar</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset((w) => w - 1)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">‹ Prev</button>
            <button onClick={() => setWeekOffset((w) => w + 1)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Next ›</button>
          </div>
          <span className="text-sm font-medium text-gray-600 text-center">
            {dayLabel(dates[0])} – {dayLabel(dates[6])}
          </span>
          <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 text-sm bg-primary-50 text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-100">Today</button>
        </div>
      </div>

      {actionMsg && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex justify-between">
          {actionMsg}
          <button onClick={() => setActionMsg('')} className="text-green-500 ml-4">✕</button>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-3 flex-wrap text-xs">
        {Object.entries(RES_STATUS_STYLE).filter(([k]) => k !== 'cancelled').map(([status, cls]) => (
          <span key={status} className={`px-2 py-0.5 rounded border font-medium ${cls}`}>{status}</span>
        ))}
      </div>

      {/* Tape chart */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm animate-pulse">Loading calendar…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-surface-muted">
                <th className="sticky left-0 z-10 bg-surface-muted text-left px-3 py-2 font-semibold text-gray-600 border-b border-r border-gray-200 min-w-[140px]">
                  Hall / Partition
                </th>
                {dates.map((d) => {
                  const ds = fmtDate(d);
                  const isToday = ds === fmtDate(today);
                  return (
                    <th key={ds} className={`px-2 py-2 text-center font-medium border-b border-r border-gray-200 ${isToday ? 'bg-primary-50 text-primary-700' : 'text-gray-600'}`}>
                      {dayLabel(d)}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {calendarData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">No halls configured</td>
                </tr>
              )}
              {calendarData.map((hall) => (
                <React.Fragment key={hall.id}>
                  {/* Hall header row */}
                  <tr className="bg-gray-50">
                    <td colSpan={8} className="px-3 py-1 font-semibold text-gray-700 text-xs border-b border-gray-200">
                      🏛 {hall.name}
                    </td>
                  </tr>
                  {hall.partitions.map((partition) => (
                    <tr key={partition.id} className="border-b border-gray-100 hover:bg-surface-muted/30">
                      {/* Partition label */}
                      <td className="sticky left-0 z-10 bg-white px-3 py-1.5 border-r border-gray-200 text-gray-600 font-medium truncate max-w-[140px]">
                        {partition.name}
                      </td>
                      {/* Date cells */}
                      {dates.map((d) => {
                        const dateStr = fmtDate(d);
                        const slot = getSlotForCell(partition.slots, dateStr);

                        if (!slot) {
                          return (
                            <td key={dateStr} className="border-r border-gray-100 py-1.5 px-1 text-center text-gray-200">
                              —
                            </td>
                          );
                        }

                        const styleCls = RES_STATUS_STYLE[slot.reservationStatus] || 'bg-gray-100 text-gray-600';
                        const start = isSlotStart(slot, dateStr);
                        const end   = isSlotEnd(slot, dateStr);

                        return (
                          <td
                            key={dateStr}
                            className={`border-r border-gray-100 py-1 px-0.5 cursor-pointer ${styleCls} ${
                              start ? 'rounded-l-md pl-1.5' : ''
                            } ${end ? 'rounded-r-md pr-1.5' : ''}`}
                            onClick={() => setSelectedSlot(slot)}
                            title={`${slot.reservationCode} — ${slot.guestName} — ${slot.fromTime}–${slot.toTime}`}
                          >
                            {start && (
                              <div className="truncate font-semibold">{slot.reservationCode}</div>
                            )}
                            {start && (
                              <div className="truncate text-[10px] opacity-75">{slot.guestName}</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Slot detail side panel */}
      {selectedSlot && !showCancelDialog && !showPostpone && (
        <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white border-l border-gray-200 shadow-xl p-5 overflow-y-auto z-20 sm:w-80">
          <div className="flex justify-between mb-4">
            <h3 className="font-bold text-gray-800">{selectedSlot.reservationCode}</h3>
            <button onClick={() => setSelectedSlot(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          <div className="space-y-1 text-sm text-gray-700 mb-4">
            <p><span className="font-medium">Guest:</span> {selectedSlot.guestName}</p>
            <p><span className="font-medium">PAX:</span> {selectedSlot.numberOfGuests}</p>
            <p><span className="font-medium">Dates:</span> {selectedSlot.fromDate} → {selectedSlot.toDate}</p>
            <p><span className="font-medium">Time:</span> {selectedSlot.fromTime} – {selectedSlot.toTime}</p>
            <p><span className="font-medium">Charge:</span> {Number(selectedSlot.charge).toLocaleString()}</p>
            <p>
              <span className="font-medium">Status:</span>{' '}
              <span className={`px-2 py-0.5 rounded text-xs border ${RES_STATUS_STYLE[selectedSlot.reservationStatus]}`}>
                {selectedSlot.reservationStatus}
              </span>
            </p>
          </div>

          {selectedSlot.status === 'active' && (
            <div className="space-y-2">
              <button
                onClick={() => { setShowCancelDialog(true); }}
                className="w-full bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 text-sm font-medium"
              >
                Cancel Slot
              </button>
              <button
                onClick={() => {
                  setPostponeForm({ fromDate: selectedSlot.fromDate, toDate: selectedSlot.toDate, fromTime: selectedSlot.fromTime, toTime: selectedSlot.toTime });
                  setShowPostpone(true);
                }}
                className="w-full bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg py-2 text-sm font-medium"
              >
                Postpone Slot
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cancel dialog */}
      {showCancelDialog && selectedSlot && (
        <CancellationDialog
          slotId={selectedSlot.id}
          reservationCode={selectedSlot.reservationCode}
          charge={selectedSlot.charge}
          fromDate={selectedSlot.fromDate}
          onConfirmed={() => {
            setShowCancelDialog(false);
            setSelectedSlot(null);
            setActionMsg('Slot cancelled successfully.');
            loadCalendar();
          }}
          onClose={() => setShowCancelDialog(false)}
        />
      )}

      {/* Postpone panel */}
      {showPostpone && selectedSlot && (
        <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white border-l border-gray-200 shadow-xl p-5 z-20 space-y-4 sm:w-80">
          <div className="flex justify-between">
            <h3 className="font-bold text-gray-800">Postpone Slot</h3>
            <button onClick={() => setShowPostpone(false)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <p className="text-xs text-gray-500">The original slot will be marked <strong>postponed</strong>. A new active slot will be created.</p>

          <div className="space-y-2">
            {['fromDate', 'toDate', 'fromTime', 'toTime'].map((field) => (
              <label key={field} className="block">
                <span className="text-xs font-medium text-gray-600 capitalize mb-1 block">{field.replace(/([A-Z])/g, ' $1')}</span>
                <input
                  type={field.includes('Date') ? 'date' : 'time'}
                  value={postponeForm[field]}
                  onChange={(e) => setPostponeForm((p) => ({ ...p, [field]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                />
              </label>
            ))}
          </div>

          {postponeError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{postponeError}</p>}

          <button
            onClick={handlePostpone}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 text-sm font-medium"
          >
            Confirm Postponement
          </button>
        </div>
      )}
    </div>
  );
}
