import React, { useState, useEffect, useCallback } from 'react';
import moment from 'moment';
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

function formatSlotDate(value) {
  if (!value) return '';
  return moment.utc(value).format('YYYY-MM-DD');
}

function formatSlotTime(value) {
  if (!value) return '';
  return moment.utc(value).format('HH:mm');
}

function formatPostponeSummary(newSlot, fallback) {
  const fromDate = formatSlotDate(newSlot?.fromDate || fallback?.fromDate);
  const toDate = formatSlotDate(newSlot?.toDate || fallback?.toDate);
  const fromTime = formatSlotTime(newSlot?.fromTime || fallback?.fromTime);
  const toTime = formatSlotTime(newSlot?.toTime || fallback?.toTime);

  if (!fromDate && !toDate && !fromTime && !toTime) return '';
  return `${fromDate || '—'} → ${toDate || '—'} @ ${fromTime || '—'}–${toTime || '—'}`;
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
  const [postponeHallId, setPostponeHallId] = useState('');
  const [postponePartitionId, setPostponePartitionId] = useState('');
  const [hallOptions, setHallOptions] = useState([]);
  const [partitionOptions, setPartitionOptions] = useState([]);
  const [postponeError, setPostponeError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [postponedRemark, setPostponedRemark] = useState('');
  const [slotMenuDetail, setSlotMenuDetail] = useState(null);
  const [menuOptions, setMenuOptions] = useState([]);
  const [selectedMenuId, setSelectedMenuId] = useState('');
  const [menuGuestCount, setMenuGuestCount] = useState(1);
  const [menuError, setMenuError] = useState('');
  const [menuSubmitting, setMenuSubmitting] = useState(false);

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

  const loadSlotMenuDetail = useCallback(async (slotId) => {
    if (!slotId) {
      setSlotMenuDetail(null);
      setMenuOptions([]);
      setSelectedMenuId('');
      setMenuError('');
      return;
    }

    try {
      const { data: detail } = await client.get(`/date-slots/${slotId}`);
      setSlotMenuDetail(detail);
      setMenuError('');

      const rawDate = detail?.slot?.fromDate || selectedSlot?.fromDate;
      const eventDate = rawDate ? rawDate.split('T')[0] : null;
      if (eventDate) {
        const { data: menus } = await client.get('/menus', { params: { availableOn: eventDate } });
        const actionableMenus = (menus || []).filter((menu) => menu?.rate != null);
        setMenuOptions(actionableMenus);
        setSelectedMenuId(actionableMenus.length > 0 ? String(actionableMenus[0].id) : '');
      } else {
        setMenuOptions([]);
        setSelectedMenuId('');
      }
    } catch (err) {
      console.error('Failed to load selected slot menu detail', err);
      setSlotMenuDetail(null);
      setMenuOptions([]);
      setSelectedMenuId('');
      setMenuError('');
    }
  }, [selectedSlot?.fromDate]);

  useEffect(() => {
    if (!selectedSlot?.id) {
      setSlotMenuDetail(null);
      setMenuOptions([]);
      setSelectedMenuId('');
      setMenuGuestCount(1);
      setMenuError('');
      return;
    }

    const defaultGuestCount = Number(selectedSlot.numberOfGuests || 1);
    setSelectedMenuId('');
    setMenuGuestCount(defaultGuestCount);
    setMenuError('');
    loadSlotMenuDetail(selectedSlot.id);
  }, [selectedSlot?.id, selectedSlot?.numberOfGuests, loadSlotMenuDetail]);

  // Find which slot (if any) occupies a given partition on a given date
  function getSlotForCell(partitionSlots, dateStr) {
    const matches = partitionSlots.filter((s) => s.fromDate <= dateStr && s.toDate >= dateStr);
    if (matches.length === 0) return [];

    const grouped = new Map();
    for (const slot of matches) {
      const key = slot.reservationId ?? `${slot.id}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(slot);
    }

    const merged = [];
    for (const group of grouped.values()) {
      group.sort((a, b) => {
        const dateOrder = (a.fromDate || '').localeCompare(b.fromDate || '');
        if (dateOrder !== 0) return dateOrder;
        if (a.status === 'postponed' && b.status !== 'postponed') return -1;
        if (a.status !== 'postponed' && b.status === 'postponed') return 1;
        return 0;
      });
      merged.push(...group);
    }

    return merged.sort((a, b) => {
      const dateOrder = (a.fromDate || '').localeCompare(b.fromDate || '');
      if (dateOrder !== 0) return dateOrder;
      if (a.status === 'postponed' && b.status !== 'postponed') return -1;
      if (a.status !== 'postponed' && b.status === 'postponed') return 1;
      return (a.id ?? 0) - (b.id ?? 0);
    });
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
      const payload = {
        ...postponeForm,
        hallId: postponeHallId ? Number(postponeHallId) : undefined,
        partitionId: postponePartitionId ? Number(postponePartitionId) : undefined,
      };
      const { data } = await client.post(`/date-slots/${selectedSlot.id}/postpone`, payload);
      const newDateSummary = formatPostponeSummary(data?.newSlot, postponeForm);
      const nextRemark = `This slot was postponed and preserved as historical data. New active slot: ${newDateSummary || 'updated date/time'}.`;

      setActionMsg('Slot postponed successfully. Original slot marked as postponed.');
      setPostponedRemark(nextRemark);
      setShowPostpone(false);
      setSelectedSlot(null);
      loadCalendar();
    } catch (err) {
      setPostponeError(err.response?.data?.error || 'Postpone failed');
    }
  }

  async function handleAddMenu() {
    if (!selectedSlot?.id || !selectedMenuId) {
      setMenuError('Select a menu before saving.');
      return;
    }

    setMenuSubmitting(true);
    setMenuError('');

    try {
      await client.post(`/date-slots/${selectedSlot.id}/requested-menus`, {
        menuId: Number(selectedMenuId),
        guestCount: Number(menuGuestCount || 1),
      });

      await loadSlotMenuDetail(selectedSlot.id);
      setActionMsg('Menu added to the reservation.');
      setMenuGuestCount(Number(selectedSlot.numberOfGuests || 1));
    } catch (err) {
      setMenuError(err.response?.data?.error || 'Unable to attach menu.');
    } finally {
      setMenuSubmitting(false);
    }
  }

  async function handleRemoveMenu(menuId) {
    const row = (slotMenuDetail?.requestedMenus || []).find((item) => Number(item.menuId) === Number(menuId));
    if (!row) return;

    try {
      await client.delete(`/date-slots/${selectedSlot.id}/requested-menus/${row.id}`);
      await loadSlotMenuDetail(selectedSlot.id);
      setActionMsg('Menu removed from the reservation.');
    } catch (err) {
      setMenuError(err.response?.data?.error || 'Unable to remove menu.');
    }
  }

  useEffect(() => {
    if (!showPostpone || !selectedSlot) return;

    (async () => {
      try {
        const { data: halls } = await client.get('/halls');
        setHallOptions(halls);

        const currentHallId = selectedSlot.hallId || halls[0]?.id || '';
        setPostponeHallId(String(currentHallId));

        if (currentHallId) {
          const { data: partitions } = await client.get(`/halls/${currentHallId}/partitions`);
          setPartitionOptions(partitions);
          const currentPartitionId = selectedSlot.partitionId || partitions[0]?.id || '';
          setPostponePartitionId(String(currentPartitionId));
        } else {
          setPartitionOptions([]);
          setPostponePartitionId('');
        }
      } catch (err) {
        console.error(err);
        setHallOptions([]);
        setPartitionOptions([]);
      }
    })();
  }, [showPostpone, selectedSlot]);

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
                        const slots = getSlotForCell(partition.slots, dateStr);

                        if (slots.length === 0) {
                          return (
                            <td key={dateStr} className="border-r border-gray-100 py-1.5 px-1 text-center text-gray-200">
                              —
                            </td>
                          );
                        }

                        const primarySlot = slots.find((s) => s.status === 'active') || slots[0];
                        const start = isSlotStart(primarySlot, dateStr);
                        const end   = isSlotEnd(primarySlot, dateStr);

                        if (slots.length > 1) {
                          return (
                            <td
                              key={dateStr}
                              className={`border-r border-gray-100 py-1 px-0.5 cursor-pointer ${
                                start ? 'rounded-l-md pl-1.5' : ''
                              } ${end ? 'rounded-r-md pr-1.5' : ''}`}
                              onClick={() => setSelectedSlot(primarySlot)}
                            >
                              <div className="flex items-stretch gap-[2px] h-full">
                                {slots.map((slot, idx) => {
                                  const slotStatus = slot.status !== 'active' ? slot.status : slot.reservationStatus;
                                  const styleCls = RES_STATUS_STYLE[slotStatus] || 'bg-gray-100 text-gray-600';
                                  const isOld = slot.status === 'postponed';

                                  return (
                                    <div
                                      key={`${slot.id}-${idx}`}
                                      className={`${isOld ? 'w-1/4' : 'w-3/4'} min-w-0 rounded-sm border border-white/50 ${styleCls} px-1 py-0.5 text-center`}
                                      title={`${slot.reservationCode} — ${slot.guestName} — ${slot.fromTime}–${slot.toTime}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedSlot(slot);
                                      }}
                                    >
                                      <div className="truncate font-semibold leading-tight">{slot.reservationCode}</div>
                                      <div className="truncate text-[8px] opacity-80">{moment.utc(slot.fromDate).format('D MMM')}</div>
                                      <div className="truncate text-[7px] opacity-75 uppercase">{isOld ? 'old' : 'new'}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          );
                        }

                        const slot = slots[0];
                        const slotStatus = slot.status !== 'active' ? slot.status : slot.reservationStatus;
                        const styleCls = RES_STATUS_STYLE[slotStatus] || 'bg-gray-100 text-gray-600';

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
            <p><span className="font-medium">Hall:</span> {selectedSlot.hallName || 'Current hall'} / {selectedSlot.partitionName || 'Current partition'}</p>
            <p><span className="font-medium">Dates:</span> {selectedSlot.fromDate} → {selectedSlot.toDate}</p>
            <p><span className="font-medium">Time:</span> {selectedSlot.fromTime} – {selectedSlot.toTime}</p>
            <p><span className="font-medium">Charge:</span> {Number(selectedSlot.charge).toLocaleString()}</p>
            <p>
              <span className="font-medium">Status:</span>{' '}
              <span className={`px-2 py-0.5 rounded text-xs border ${RES_STATUS_STYLE[selectedSlot.reservationStatus]}`}>
                {selectedSlot.reservationStatus}
              </span>
            </p>
            {selectedSlot.status === 'postponed' && (
              <p className="rounded-md border border-purple-200 bg-purple-50 px-2 py-1 text-xs text-purple-800">
                <span className="font-semibold">Remark:</span> {postponedRemark || 'This slot was postponed and preserved as historical data. A new active slot was created.'}
              </p>
            )}
          </div>

          {selectedSlot.status !== 'postponed' && (
            <div className="border-t border-gray-200 pt-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-800">Menus</h4>
                <span className="text-[10px] uppercase tracking-wide text-gray-400">{slotMenuDetail?.requestedMenus?.length || 0} attached</span>
              </div>

              <div className="space-y-2">
                {(slotMenuDetail?.requestedMenus || []).length === 0 ? (
                  <p className="text-xs text-gray-500">No menu attached yet.</p>
                ) : (
                  (slotMenuDetail?.requestedMenus || []).map((menuRow) => (
                    <div key={menuRow.id} className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium text-gray-800">{menuRow.menu?.name || 'Menu'}</div>
                          <div className="text-[11px] text-gray-500">{menuRow.guestCount} guests • LKR {Number(menuRow.charge || 0).toLocaleString()}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMenu(menuRow.menuId)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-3 space-y-2 rounded-lg border border-gray-200 p-3 bg-white">
                <label className="block">
                  <span className="text-[11px] font-medium text-gray-600 mb-1 block">Select menu</span>
                  <select
                    value={selectedMenuId}
                    onChange={(e) => setSelectedMenuId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                    disabled={menuOptions.length === 0}
                  >
                    {menuOptions.length === 0 ? <option value="">No menu available for this date</option> : <option value="">Choose a menu</option>}
                    {menuOptions.map((menu) => (
                      <option key={menu.id} value={menu.id}>{menu.name} • LKR {Number(menu.rate).toLocaleString()}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[11px] font-medium text-gray-600 mb-1 block">Guest count</span>
                  <input
                    type="number"
                    min="1"
                    value={menuGuestCount}
                    onChange={(e) => setMenuGuestCount(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                  />
                </label>

                {menuError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{menuError}</p>}

                <button
                  type="button"
                  onClick={handleAddMenu}
                  disabled={menuSubmitting || menuOptions.length === 0 || !selectedMenuId}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg py-2 text-sm font-medium"
                >
                  {menuSubmitting ? 'Saving...' : 'Add Menu'}
                </button>
              </div>

              {slotMenuDetail?.subtotal && (
                <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-2 text-xs text-indigo-800">
                  <div className="flex justify-between"><span>Hall</span><span>LKR {Number(slotMenuDetail.subtotal.hallCharge || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Menus</span><span>LKR {Number(slotMenuDetail.subtotal.menusTotal || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Items</span><span>LKR {Number(slotMenuDetail.subtotal.itemsTotal || 0).toLocaleString()}</span></div>
                  <div className="mt-1 flex justify-between font-semibold"><span>Total</span><span>LKR {Number(slotMenuDetail.subtotal.grandTotal || 0).toLocaleString()}</span></div>
                </div>
              )}
            </div>
          )}

          {selectedSlot.status === 'active' && (
            <div className="space-y-2 pt-4 border-t border-gray-200">
              <button
                onClick={() => { setShowCancelDialog(true); }}
                className="w-full bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 text-sm font-medium"
              >
                Cancel Slot
              </button>
              <button
                onClick={() => {
                  setPostponeForm({ fromDate: selectedSlot.fromDate, toDate: selectedSlot.toDate, fromTime: selectedSlot.fromTime, toTime: selectedSlot.toTime });
                  setPostponeHallId(String(selectedSlot.hallId || ''));
                  setPostponePartitionId(String(selectedSlot.partitionId || ''));
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
          <p className="text-xs text-gray-500">The original slot will be marked <strong>postponed</strong>. A new active slot will be created in the currently selected hall: <strong>{selectedSlot.hallName || 'Current hall'}</strong> / <strong>{selectedSlot.partitionName || 'Current partition'}</strong>.</p>

          <div className="space-y-2">
            <label className="block">
              <span className="text-xs font-medium text-gray-600 mb-1 block">Hall</span>
              <select
                value={postponeHallId}
                onChange={async (e) => {
                  const hallId = e.target.value;
                  setPostponeHallId(hallId);
                  setPostponePartitionId('');
                  if (!hallId) {
                    setPartitionOptions([]);
                    return;
                  }
                  const { data } = await client.get(`/halls/${hallId}/partitions`);
                  setPartitionOptions(data);
                  setPostponePartitionId(String(data[0]?.id || ''));
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="">Select hall</option>
                {hallOptions.map((hall) => (
                  <option key={hall.id} value={hall.id}>{hall.name}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-600 mb-1 block">Partition</span>
              <select
                value={postponePartitionId}
                onChange={(e) => setPostponePartitionId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                disabled={!postponeHallId || partitionOptions.length === 0}
              >
                {!postponeHallId && <option value="">Select hall first</option>}
                {partitionOptions.length === 0 && postponeHallId ? <option value="">No partitions</option> : null}
                {partitionOptions.map((partition) => (
                  <option key={partition.id} value={partition.id}>{partition.name}</option>
                ))}
              </select>
            </label>

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
