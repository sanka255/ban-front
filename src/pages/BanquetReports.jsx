import React, { useEffect, useMemo, useState } from 'react';
import client from '../api/client';

const REPORTS = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'availability', label: 'Availability' },
  { key: 'deposits', label: 'Deposits' },
  { key: 'cancellations', label: 'Cancellations' },
  { key: 'travel-agent-summary', label: 'Travel Agent Summary' },
];

export default function BanquetReports() {
  const [selected, setSelected] = useState('revenue');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReport = async (reportKey) => {
    setLoading(true);
    setError('');
    try {
      const { data: response } = await client.get(`/reports/${reportKey}?fromDate=${fromDate}&toDate=${toDate}`);
      setData(response);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load report');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(selected);
  }, [selected, fromDate, toDate]);

  const rows = useMemo(() => {
    if (!data) return [];
    if (selected === 'revenue') return data.rows || [];
    if (selected === 'deposits') return data.deposits || [];
    if (selected === 'availability') return data.rows || [];
    if (selected === 'cancellations') return data.rows || [];
    if (selected === 'travel-agent-summary') return data.rows || [];
    return [];
  }, [data, selected]);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Banquet Reports</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {REPORTS.map((report) => (
            <button
              key={report.key}
              type="button"
              onClick={() => setSelected(report.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${selected === report.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {report.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className="text-sm text-gray-600">
            <span className="block mb-1">From</span>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2" />
          </label>
          <label className="text-sm text-gray-600">
            <span className="block mb-1">To</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2" />
          </label>
          <div className="pt-6">
            <button type="button" onClick={() => fetchReport(selected)} className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-gray-700">
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 text-sm">{error}</div>}

      {loading ? <div className="text-sm text-gray-500">Loading report…</div> : data && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 overflow-x-auto">
          {selected === 'revenue' && (
            <>
              <div className="mb-3 text-sm text-gray-600">
                Complementary lines excluded from revenue: <strong>{data.complementaryCount || 0}</strong>
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Line Type</th>
                    <th className="px-3 py-2">Base</th>
                    <th className="px-3 py-2">Tax</th>
                    <th className="px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.lineType} className="border-t border-gray-100">
                      <td className="px-3 py-2">{row.lineType}</td>
                      <td className="px-3 py-2">{Number(row.baseCharges).toFixed(2)}</td>
                      <td className="px-3 py-2">{Number(row.taxAmount).toFixed(2)}</td>
                      <td className="px-3 py-2">{Number(row.totalWithTax).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 text-sm text-gray-700">
                Total Base: <strong>{Number(data.totals?.baseCharges || 0).toFixed(2)}</strong> • Total Tax: <strong>{Number(data.totals?.taxAmount || 0).toFixed(2)}</strong> • Total Revenue: <strong>{Number(data.totals?.totalWithTax || 0).toFixed(2)}</strong>
              </div>
            </>
          )}

          {selected === 'deposits' && (
            <>
              <div className="mb-3 text-sm text-gray-700">
                Taken: <strong>{Number(data.totalTaken || 0).toFixed(2)}</strong> • Settled: <strong>{Number(data.totalSettled || 0).toFixed(2)}</strong> • Outstanding: <strong>{Number(data.totalOutstanding || 0).toFixed(2)}</strong>
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Reservation</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Payment</th>
                    <th className="px-3 py-2">Settled</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">{row.reservation?.reservationCode || row.reservationId}</td>
                      <td className="px-3 py-2">{Number(row.amount || 0).toFixed(2)}</td>
                      <td className="px-3 py-2">{row.paymentMethod}</td>
                      <td className="px-3 py-2">{row.settled ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {selected === 'availability' && (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-3 py-2">Hall</th>
                  <th className="px-3 py-2">Partition</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Booked</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={`${row.partitionId}-${row.date}-${idx}`} className="border-t border-gray-100">
                    <td className="px-3 py-2">{row.hallName}</td>
                    <td className="px-3 py-2">{row.partitionName}</td>
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2">{row.booked ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selected === 'cancellations' && (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-3 py-2">Reservation</th>
                  <th className="px-3 py-2">Refund</th>
                  <th className="px-3 py-2">Tier</th>
                  <th className="px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{row.reservationCode}</td>
                    <td className="px-3 py-2">{Number(row.refundableAmount || 0).toFixed(2)}</td>
                    <td className="px-3 py-2">{row.tier ? `${row.tier.daysMin}-${row.tier.daysMax} days / ${row.tier.refundPct}%` : '—'}</td>
                    <td className="px-3 py-2">{new Date(row.withdrawalDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selected === 'travel-agent-summary' && (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-3 py-2">Agent</th>
                  <th className="px-3 py-2">Bookings</th>
                  <th className="px-3 py-2">Revenue</th>
                  <th className="px-3 py-2">Outstanding</th>
                  <th className="px-3 py-2">Credit Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.agentId} className="border-t border-gray-100">
                    <td className="px-3 py-2">{row.company}</td>
                    <td className="px-3 py-2">{row.bookings}</td>
                    <td className="px-3 py-2">{Number(row.revenue || 0).toFixed(2)}</td>
                    <td className="px-3 py-2">{Number(row.outstanding || 0).toFixed(2)}</td>
                    <td className="px-3 py-2">{row.overLimit ? 'Over limit' : 'Within limit'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
