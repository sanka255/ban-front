import React, { useEffect, useState } from 'react';
import client from '../api/client';

const emptyForm = {
  company: '',
  contactInfo: '',
  vatRegNo: '',
  creditLimit: '',
  creditPeriodDays: '',
  isActive: true,
};

export default function TravelAgentManagement() {
  const [agents, setAgents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadAgents() {
    setLoading(true);
    try {
      const { data } = await client.get('/travel-agents');
      const withStatus = await Promise.all(
        data.map(async (agent) => {
          try {
            const { data: statusData } = await client.get(`/travel-agents/${agent.id}/credit-status`);
            return { ...agent, status: statusData };
          } catch {
            return { ...agent, status: null };
          }
        })
      );
      setAgents(withStatus);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load travel agents');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAgents(); }, []);

  async function saveAgent(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await client.put(`/travel-agents/${editingId}`, form);
      } else {
        await client.post('/travel-agents', form);
      }
      setForm(emptyForm);
      setEditingId(null);
      loadAgents();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save travel agent');
    }
  }

  async function removeAgent(id) {
    if (!window.confirm('Delete this travel agent?')) return;
    try {
      await client.delete(`/travel-agents/${id}`);
      loadAgents();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  }

  function startEdit(agent) {
    setEditingId(agent.id);
    setForm({
      company: agent.company,
      contactInfo: agent.contactInfo || '',
      vatRegNo: agent.vatRegNo || '',
      creditLimit: agent.creditLimit ?? '',
      creditPeriodDays: agent.creditPeriodDays ?? '',
      isActive: agent.isActive,
    });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Travel Agent Management</h1>
      </div>

      {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 text-sm">{error}</div>}

      <form onSubmit={saveAgent} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" required />
          <input value={form.contactInfo} onChange={(e) => setForm({ ...form, contactInfo: e.target.value })} placeholder="Contact info" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input value={form.vatRegNo} onChange={(e) => setForm({ ...form, vatRegNo: e.target.value })} placeholder="VAT Reg No" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input type="number" step="0.01" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} placeholder="Credit limit" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input type="number" value={form.creditPeriodDays} onChange={(e) => setForm({ ...form, creditPeriodDays: e.target.value })} placeholder="Credit period days" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm text-gray-600 pt-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active
          </label>
        </div>
        <div className="flex gap-3">
          <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-700">
            {editingId ? 'Update agent' : 'Add agent'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Credit Limit</th>
                <th className="px-4 py-3">Outstanding</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-4 text-gray-500" colSpan={5}>Loading…</td></tr>
              ) : agents.length === 0 ? (
                <tr><td className="px-4 py-4 text-gray-500" colSpan={5}>No travel agents yet.</td></tr>
              ) : (
                agents.map((agent) => {
                  const status = agent.status;
                  const hasLimit = status?.creditLimit != null && Number(status.creditLimit) > 0;
                  const isOver = status ? status.overLimit : false;
                  return (
                    <tr key={agent.id} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800">{agent.company}</div>
                        <div className="text-xs text-gray-500">{agent.contactInfo || 'No contact info'}</div>
                      </td>
                      <td className="px-4 py-3">{agent.creditLimit != null ? Number(agent.creditLimit).toFixed(2) : '—'}</td>
                      <td className="px-4 py-3">{status ? Number(status.outstanding).toFixed(2) : '—'}</td>
                      <td className="px-4 py-3">
                        {!hasLimit ? <span className="text-xs text-gray-500">No limit</span> : isOver ? <span className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">Over limit</span> : <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">Within limit</span>}
                      </td>
                      <td className="px-4 py-3 space-x-2">
                        <button type="button" onClick={() => startEdit(agent)} className="text-primary-600 hover:underline">Edit</button>
                        <button type="button" onClick={() => removeAgent(agent.id)} className="text-red-600 hover:underline">Delete</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
