import { useEffect, useState } from 'react';
import client from '../api/client';

export default function GLLedger() {
  const [accounts, setAccounts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [reconciliation, setReconciliation] = useState(null);
  const [accountId, setAccountId] = useState('');
  const [fromDate, setFromDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));

  const load = async () => {
    const [{ data: accountsData }, { data: entriesData }, { data: reconciliationData }] = await Promise.all([
      client.get('/chart-of-accounts'),
      client.get(`/gl/entries${accountId ? `?accountId=${accountId}` : ''}${fromDate && toDate ? `${accountId ? '&' : '?'}from=${fromDate}&to=${toDate}` : ''}`),
      client.get(`/gl/reconciliation?from=${fromDate}&to=${toDate}`),
    ]);
    setAccounts(accountsData);
    setEntries(entriesData);
    setReconciliation(reconciliationData);
  };

  useEffect(() => { load(); }, [accountId, fromDate, toDate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">GL Ledger & Reconciliation</h1>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Account</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full rounded border px-3 py-2">
              <option value="">All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.accountNo} - {account.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>
        </div>
      </div>

      {reconciliation && (
        <div className={`rounded-xl border p-5 shadow-sm ${reconciliation.balanced ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Reconciliation</h2>
            <span className={`px-2 py-1 rounded text-sm font-medium ${reconciliation.balanced ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {reconciliation.balanced ? 'Balanced' : 'Variance detected'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-slate-500">Debits</span><div className="font-semibold">{reconciliation.totals.debits}</div></div>
            <div><span className="text-slate-500">Credits</span><div className="font-semibold">{reconciliation.totals.credits}</div></div>
            <div><span className="text-slate-500">Variance</span><div className="font-semibold">{reconciliation.totals.variance}</div></div>
            <div><span className="text-slate-500">Receivable match</span><div className="font-semibold">{reconciliation.billingMatchesReceivable ? 'Yes' : 'No'}</div></div>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-white p-5 shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Account</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Posted</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t">
                <td className="px-3 py-2">{entry.id}</td>
                <td className="px-3 py-2">{entry.account?.accountNo} / {entry.account?.name}</td>
                <td className="px-3 py-2">{entry.entryType}</td>
                <td className="px-3 py-2">{entry.amount}</td>
                <td className="px-3 py-2">{entry.sourceType}:{entry.sourceId}</td>
                <td className="px-3 py-2">{entry.description}</td>
                <td className="px-3 py-2">{new Date(entry.postedAt).toLocaleString()}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-slate-500">No GL entries in this period.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
