import React, { useState, useEffect } from 'react';
import client from '../api/client';

// ─── Reusable tiny components ─────────────────────────────────────────────────
function Inp({ label, ...p }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>}
      <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" {...p} />
    </label>
  );
}
function Btn({ children, variant = 'primary', sm, ...p }) {
  const base = 'font-semibold rounded-lg transition disabled:opacity-40';
  const size = sm ? 'text-xs px-2.5 py-1' : 'text-sm px-4 py-2';
  const color = variant === 'primary'
    ? 'bg-primary-600 hover:bg-primary-700 text-white'
    : variant === 'danger'
    ? 'bg-red-500 hover:bg-red-600 text-white'
    : 'border border-gray-200 text-gray-600 hover:bg-gray-50';
  return <button className={`${base} ${size} ${color}`} {...p}>{children}</button>;
}
function Card({ title, children, action }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Tab 1: Categories & Items ────────────────────────────────────────────────

function CategoriesTab() {
  const [cats, setCats]       = useState([]);
  const [catName, setCatName] = useState('');
  const [itemForm, setItemForm] = useState({ categoryId: '', name: '', charge: '', accountNo: '' });
  const [editingItem, setEditingItem] = useState(null);
  const [msg, setMsg] = useState('');

  const load = () => client.get('/menu-categories').then(({ data }) => setCats(data)).catch(() => {});
  useEffect(() => { load(); }, []);

  async function addCat(e) {
    e.preventDefault();
    await client.post('/menu-categories', { name: catName });
    setCatName(''); load();
  }

  async function deleteCat(id) {
    if (!confirm('Delete category and all its items?')) return;
    await client.delete(`/menu-categories/${id}`); load();
  }

  async function saveItem(e) {
    e.preventDefault();
    try {
      if (editingItem) {
        await client.put(`/menu-items/${editingItem.id}`, itemForm);
        setEditingItem(null);
      } else {
        await client.post('/menu-items', itemForm);
      }
      setItemForm({ categoryId: itemForm.categoryId, name: '', charge: '', accountNo: '' });
      setMsg('Saved ✓'); setTimeout(() => setMsg(''), 2000); load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error'); setTimeout(() => setMsg(''), 3000);
    }
  }

  async function toggleItem(item) {
    await client.put(`/menu-items/${item.id}`, { isActive: !item.isActive }); load();
  }

  async function deleteItem(id) {
    if (!confirm('Delete item?')) return;
    await client.delete(`/menu-items/${id}`); load();
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {/* Categories panel */}
      <Card title="Categories" action={
        <form onSubmit={addCat} className="flex gap-2">
          <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="New category…"
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-32" required />
          <Btn sm type="submit">+ Add</Btn>
        </form>
      }>
        <div className="divide-y text-sm">
          {cats.map((c) => (
            <div key={c.id} className="flex justify-between items-center py-1.5">
              <button onClick={() => setItemForm({ ...itemForm, categoryId: String(c.id) })}
                className={`font-medium hover:text-primary-600 ${String(itemForm.categoryId) === String(c.id) ? 'text-primary-600' : 'text-gray-700'}`}>
                {c.name} <span className="text-xs text-gray-400 font-normal">({c.items?.length ?? 0})</span>
              </button>
              <Btn sm variant="danger" onClick={() => deleteCat(c.id)}>×</Btn>
            </div>
          ))}
          {cats.length === 0 && <p className="text-gray-400 text-xs py-3 text-center">No categories yet</p>}
        </div>
      </Card>

      {/* Item form + list */}
      <Card title={editingItem ? `Edit: ${editingItem.name}` : 'Add Item'}>
        <form onSubmit={saveItem} className="space-y-2 mb-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-xs font-medium text-gray-600 mb-1 block">Category *</span>
              <select value={itemForm.categoryId} onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })} required
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
                <option value="">Select…</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Inp label="Item Name *" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} required />
            <Inp label="Charge *" type="number" step="0.01" min="0" value={itemForm.charge}
              onChange={(e) => setItemForm({ ...itemForm, charge: e.target.value })} required />
            <Inp label="Account No" value={itemForm.accountNo} onChange={(e) => setItemForm({ ...itemForm, accountNo: e.target.value })} />
          </div>
          {msg && <p className="text-xs text-primary-600">{msg}</p>}
          <div className="flex gap-2">
            <Btn type="submit">{editingItem ? 'Save Changes' : 'Add Item'}</Btn>
            {editingItem && <Btn variant="ghost" type="button" onClick={() => { setEditingItem(null); setItemForm({ categoryId: '', name: '', charge: '', accountNo: '' }); }}>Cancel</Btn>}
          </div>
        </form>

        {/* Item list for selected category */}
        {itemForm.categoryId && (
          <div className="divide-y text-xs max-h-64 overflow-y-auto">
            {(cats.find((c) => String(c.id) === String(itemForm.categoryId))?.items ?? []).map((item) => (
              <div key={item.id} className={`flex items-center justify-between py-1.5 ${!item.isActive ? 'opacity-50' : ''}`}>
                <span className="font-medium text-gray-700">{item.name}</span>
                <span className="text-gray-500 mx-2">{Number(item.charge).toLocaleString()}</span>
                <div className="flex gap-1 ml-auto">
                  <Btn sm variant="ghost" onClick={() => { setEditingItem(item); setItemForm({ categoryId: String(item.categoryId), name: item.name, charge: String(item.charge), accountNo: item.accountNo || '' }); }}>Edit</Btn>
                  <Btn sm variant="ghost" onClick={() => toggleItem(item)}>{item.isActive ? 'Disable' : 'Enable'}</Btn>
                  <Btn sm variant="danger" onClick={() => deleteItem(item.id)}>×</Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Tab 2: Menus ─────────────────────────────────────────────────────────────

function MenusTab() {
  const [menus, setMenus]     = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm]       = useState({ name: '', accountId: '' });
  const [msg, setMsg]         = useState('');

  const load = () => {
    client.get('/menus').then(({ data }) => setMenus(data)).catch(() => {});
    client.get('/menu-items?isActive=true').then(({ data }) => setAllItems(data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  async function createMenu(e) {
    e.preventDefault();
    const { data } = await client.post('/menus', form);
    setForm({ name: '', accountId: '' }); setSelected(data); load();
  }

  async function addItem(itemId) {
    try {
      await client.post(`/menus/${selected.id}/items/${itemId}`);
      const { data } = await client.get(`/menus/${selected.id}`);
      setSelected(data); load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error'); setTimeout(() => setMsg(''), 3000);
    }
  }

  async function removeItem(itemId) {
    await client.delete(`/menus/${selected.id}/items/${itemId}`);
    const { data } = await client.get(`/menus/${selected.id}`);
    setSelected(data); load();
  }

  const safeMenus = Array.isArray(menus) ? menus : [];
  const safeAllItems = Array.isArray(allItems) ? allItems : [];
  const safeSelectedItems = Array.isArray(selected?.items) ? selected.items : [];
  const linkedIds = new Set(safeSelectedItems.map((l) => l.itemId).filter(Boolean));

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      {/* Menu list */}
      <Card title="Menus" action={
        <form onSubmit={createMenu} className="flex gap-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="New menu…"
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-28" required />
          <Btn sm type="submit">+ Add</Btn>
        </form>
      }>
        <div className="divide-y text-sm">
          {safeMenus.map((m) => (
            <button key={m.id} onClick={() => setSelected(m)}
              className={`w-full text-left py-1.5 px-1 hover:bg-primary-50 rounded flex justify-between ${selected?.id === m.id ? 'text-primary-600 font-semibold' : 'text-gray-700'}`}>
              <span>{m.name}</span>
              <span className="text-xs text-gray-400">{Array.isArray(m.items) ? m.items.length : 0} items</span>
            </button>
          ))}
          {safeMenus.length === 0 && <p className="text-gray-400 text-xs py-3 text-center">No menus yet</p>}
        </div>
      </Card>

      {/* Linked items */}
      <Card title={selected ? `${selected.name} — Linked Items` : 'Select a menu'}>
        {selected ? (
          <div className="divide-y text-xs max-h-80 overflow-y-auto">
            {safeSelectedItems.length === 0 && <p className="text-gray-400 py-3 text-center">No items yet — add from the right panel</p>}
            {safeSelectedItems.map((link) => (
              <div key={link.id} className="flex justify-between items-center py-1.5">
                <span>{link.item?.name || 'Unnamed item'}</span>
                <span className="text-gray-500 mx-2">{Number(link.item?.charge ?? 0).toLocaleString()}</span>
                <Btn sm variant="danger" onClick={() => removeItem(link.itemId)}>×</Btn>
              </div>
            ))}
          </div>
        ) : <p className="text-gray-400 text-xs text-center py-6">Click a menu to manage items</p>}
      </Card>

      {/* All items picker */}
      <Card title="All Items (click to add)">
        {msg && <p className="text-xs text-red-600 mb-2">{msg}</p>}
        <div className="divide-y text-xs max-h-80 overflow-y-auto">
          {safeAllItems.map((item) => {
            const linked = linkedIds.has(item.id);
            return (
              <div key={item.id} className={`flex justify-between items-center py-1.5 ${linked ? 'opacity-40' : ''}`}>
                <div>
                  <span className="font-medium">{item.name}</span>
                  <span className="text-gray-400 ml-1">({item.category?.name || 'Uncategorized'})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{Number(item.charge ?? 0).toLocaleString()}</span>
                  {selected && !linked && (
                    <Btn sm onClick={() => addItem(item.id)}>+ Add</Btn>
                  )}
                  {linked && <span className="text-green-600">✓</span>}
                </div>
              </div>
            );
          })}
          {safeAllItems.length === 0 && <p className="text-gray-400 text-xs py-3 text-center">No active items available</p>}
        </div>
      </Card>
    </div>
  );
}

// ─── Tab 3: Rate Plans ────────────────────────────────────────────────────────

function RatePlansTab() {
  const [plans, setPlans]   = useState([]);
  const [menus, setMenus]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [planForm, setPlanForm] = useState({ name: '', fromDate: '', toDate: '' });
  const [rateForm, setRateForm] = useState({ menuId: '', charge: '' });

  const load = () => {
    client.get('/menu-rate-plans').then(({ data }) => setPlans(data)).catch(() => {});
    client.get('/menus?isActive=true').then(({ data }) => setMenus(data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  async function createPlan(e) {
    e.preventDefault();
    const { data } = await client.post('/menu-rate-plans', planForm);
    setPlanForm({ name: '', fromDate: '', toDate: '' }); setSelected(data); load();
  }

  async function addRate(e) {
    e.preventDefault();
    try {
      await client.post(`/menu-rate-plans/${selected.id}/rates`, rateForm);
      const { data } = await client.get(`/menu-rate-plans/${selected.id}`);
      setSelected(data); setRateForm({ menuId: '', charge: '' }); load();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  }

  async function deleteRate(rateId) {
    await client.delete(`/menu-rate-plans/${selected.id}/rates/${rateId}`);
    const { data } = await client.get(`/menu-rate-plans/${selected.id}`);
    setSelected(data); load();
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {/* Plans list */}
      <Card title="Rate Plans" action={
        <form onSubmit={createPlan} className="flex gap-2 items-end flex-wrap">
          <Inp label="Name" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} required />
          <Inp label="From" type="date" value={planForm.fromDate} onChange={(e) => setPlanForm({ ...planForm, fromDate: e.target.value })} required />
          <Inp label="To" type="date" value={planForm.toDate} onChange={(e) => setPlanForm({ ...planForm, toDate: e.target.value })} required />
          <Btn sm type="submit">+ Create</Btn>
        </form>
      }>
        <div className="divide-y text-sm mt-3">
          {plans.map((p) => (
            <button key={p.id} onClick={() => setSelected(p)}
              className={`w-full text-left py-1.5 px-1 hover:bg-primary-50 rounded ${selected?.id === p.id ? 'text-primary-600 font-semibold' : 'text-gray-700'}`}>
              <div>{p.name}</div>
              <div className="text-xs text-gray-400">{p.fromDate?.slice(0,10)} → {p.toDate?.slice(0,10)} · {p.rates?.length ?? 0} menu rates</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Rates for selected plan */}
      <Card title={selected ? `Rates for: ${selected.name}` : 'Select a plan'}>
        {selected ? (
          <>
            <form onSubmit={addRate} className="flex gap-2 mb-3">
              <select value={rateForm.menuId} onChange={(e) => setRateForm({ ...rateForm, menuId: e.target.value })} required
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm flex-1">
                <option value="">Select menu…</option>
                {menus.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <input type="number" step="0.01" min="0" placeholder="Charge/head" value={rateForm.charge}
                onChange={(e) => setRateForm({ ...rateForm, charge: e.target.value })} required
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-28" />
              <Btn sm type="submit">+ Set</Btn>
            </form>
            <div className="divide-y text-xs max-h-64 overflow-y-auto">
              {(selected.rates ?? []).map((r) => (
                <div key={r.id} className="flex justify-between items-center py-1.5">
                  <span className="font-medium">{r.menu?.name}</span>
                  <span className="text-gray-600 mx-2">{Number(r.charge).toLocaleString()} / head</span>
                  <Btn sm variant="danger" onClick={() => deleteRate(r.id)}>×</Btn>
                </div>
              ))}
              {selected.rates?.length === 0 && <p className="text-gray-400 text-center py-3">No rates yet</p>}
            </div>
          </>
        ) : <p className="text-gray-400 text-xs text-center py-6">Click a plan to manage its rates</p>}
      </Card>
    </div>
  );
}

// ─── MenuBuilder (main page) ──────────────────────────────────────────────────

const TABS = ['Categories & Items', 'Menus', 'Rate Plans'];

export default function MenuBuilder() {
  const [tab, setTab] = useState(0);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <h1 className="text-xl font-bold text-gray-800">Menu Builder</h1>
      <div className="flex flex-wrap gap-1 bg-surface-muted p-1 rounded-xl w-full md:w-fit">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg font-medium transition ${tab === i ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 0 && <CategoriesTab />}
      {tab === 1 && <MenusTab />}
      {tab === 2 && <RatePlansTab />}
    </div>
  );
}
