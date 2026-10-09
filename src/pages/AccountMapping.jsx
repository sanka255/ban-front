import { useEffect, useState } from 'react';
import client from '../api/client';

export default function AccountMapping() {
  const [accounts, setAccounts] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [form, setForm] = useState({ mappingType: 'function_account', sourceId: '', accountId: '' });

  const load = async () => {
    const [{ data: accountData }, { data: mappingData }] = await Promise.all([
      client.get('/chart-of-accounts'),
      client.get('/account-mappings'),
    ]);
    setAccounts(accountData);
    setMappings(mappingData);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await client.post('/account-mappings', {
      ...form,
      sourceId: form.sourceId === '' ? null : Number(form.sourceId),
      accountId: Number(form.accountId),
    });
    setForm({ mappingType: 'function_account', sourceId: '', accountId: '' });
    await load();
  };

  const removeMapping = async (id) => {
    await client.delete(`/account-mappings/${id}`);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">GL Account Mapping</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Create mapping</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Mapping type</label>
            <select value={form.mappingType} onChange={(e) => setForm({ ...form, mappingType: e.target.value })} className="w-full rounded border px-3 py-2">
              <option value="function_account">function_account</option>
              <option value="menu_category">menu_category</option>
              <option value="complementary">complementary</option>
              <option value="deposit_liability">deposit_liability</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Source ID (optional)</label>
            <input value={form.sourceId} onChange={(e) => setForm({ ...form, sourceId: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="Leave blank for fixed mapping" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">GL account</label>
            <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} className="w-full rounded border px-3 py-2">
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.accountNo} - {account.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md">Save mapping</button>
        </form>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Current mappings</h2>
          {mappings.length === 0 ? <p className="text-slate-500">No mappings created yet.</p> : (
            <div className="space-y-3">
              {mappings.map((mapping) => (
                <div key={mapping.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <div className="font-medium">{mapping.mappingType}</div>
                    <div className="text-sm text-slate-500">source: {mapping.sourceId ?? 'fixed'}</div>
                    <div className="text-sm text-slate-600">{mapping.account?.accountNo} - {mapping.account?.name}</div>
                  </div>
                  <button onClick={() => removeMapping(mapping.id)} className="text-red-600 text-sm">Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
