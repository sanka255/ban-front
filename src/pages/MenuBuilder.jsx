import React, { useState, useEffect, useMemo } from 'react';
import client from '../api/client';

// ─── Theme-aware Reusable Components ──────────────────────────────────────────

function Inp({ label, ...p }) {
  return (
    <label className="block">
      {label && (
        <span className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
      )}
      <input
        className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-all placeholder:text-gray-400"
        style={{
          backgroundColor: 'var(--input-bg)',
          border: '1px solid var(--input-border)',
          color: 'var(--text-primary)',
        }}
        {...p}
      />
    </label>
  );
}

function Btn({ children, variant = 'primary', sm, ...p }) {
  const base = 'font-semibold rounded-xl transition-all disabled:opacity-40 inline-flex items-center justify-center';
  const size = sm ? 'text-xs px-2.5 py-1' : 'text-sm px-4 py-2';
  let style = {};
  let cls = '';

  if (variant === 'primary') {
    cls = 'text-slate-950 font-bold shadow-sm hover:opacity-90';
    style = { background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' };
  } else if (variant === 'danger') {
    cls = 'bg-red-500/90 hover:bg-red-600 text-white shadow-sm';
  } else if (variant === 'ghost') {
    cls = 'hover:bg-slate-500/10';
    style = { color: 'var(--text-secondary)' };
  } else {
    cls = 'border hover:bg-slate-500/10';
    style = { borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' };
  }

  return (
    <button className={`${base} ${size} ${cls}`} style={style} {...p}>
      {children}
    </button>
  );
}

function Card({ title, children, action }) {
  return (
    <div
      className="glass-card rounded-2xl p-4 md:p-5 border shadow-sm transition-all"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--card-bg)' }}
    >
      <div
        className="flex items-center justify-between mb-3.5 border-b pb-3"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <h3 className="text-sm font-semibold tracking-wide" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Tab 1: Categories & Items ────────────────────────────────────────────────

function CategoriesTab() {
  const [cats, setCats] = useState([]);
  const [catName, setCatName] = useState('');
  const [itemForm, setItemForm] = useState({ categoryId: '', name: '', charge: '', accountNo: '' });
  const [editingItem, setEditingItem] = useState(null);
  const [msg, setMsg] = useState('');

  const load = (preserveCatId) => {
    client
      .get('/menu-categories')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setCats(list);
        if (preserveCatId) {
          setItemForm((prev) => ({ ...prev, categoryId: String(preserveCatId) }));
        } else if (!itemForm.categoryId && list.length > 0) {
          setItemForm((prev) => ({ ...prev, categoryId: String(list[0].id) }));
        }
      })
      .catch((err) => {
        console.error('Failed to load categories:', err);
      });
  };

  useEffect(() => {
    load();
  }, []);

  async function addCat(e) {
    e.preventDefault();
    try {
      const { data } = await client.post('/menu-categories', { name: catName });
      setCatName('');
      load(data.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create category');
    }
  }

  async function deleteCat(id) {
    if (!confirm('Delete category and all its items?')) return;
    try {
      await client.delete(`/menu-categories/${id}`);
      if (String(itemForm.categoryId) === String(id)) {
        setItemForm((prev) => ({ ...prev, categoryId: '' }));
      }
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete category');
    }
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
      setMsg('Saved successfully ✓');
      setTimeout(() => setMsg(''), 2500);
      load(itemForm.categoryId);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to save item');
      setTimeout(() => setMsg(''), 3500);
    }
  }

  async function toggleItem(item) {
    try {
      await client.put(`/menu-items/${item.id}`, { isActive: !item.isActive });
      load(itemForm.categoryId);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update item');
    }
  }

  async function deleteItem(id) {
    if (!confirm('Delete item and its menu links?')) return;
    try {
      await client.delete(`/menu-items/${id}`);
      load(itemForm.categoryId);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete item');
    }
  }

  const selectedCat = cats.find((c) => String(c.id) === String(itemForm.categoryId));

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {/* Categories panel */}
      <Card
        title="Categories"
        action={
          <form onSubmit={addCat} className="flex gap-2">
            <input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="New category…"
              className="rounded-xl px-2.5 py-1 text-xs w-36 focus:outline-none"
              style={{
                backgroundColor: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)',
              }}
              required
            />
            <Btn sm type="submit">
              + Add
            </Btn>
          </form>
        }
      >
        <div className="divide-y text-sm" style={{ borderColor: 'var(--border-subtle)' }}>
          {cats.map((c) => {
            const isSelected = String(itemForm.categoryId) === String(c.id);
            return (
              <div
                key={c.id}
                className={`flex justify-between items-center py-2 px-2 rounded-xl transition ${
                  isSelected ? 'font-semibold' : ''
                }`}
                style={{
                  backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                  color: isSelected ? 'var(--amber-strong)' : 'var(--text-primary)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setItemForm({ ...itemForm, categoryId: String(c.id) })}
                  className="flex-1 text-left flex items-center justify-between pr-3"
                >
                  <span>{c.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: 'var(--text-muted)' }}>
                    {c.items?.length ?? 0} items
                  </span>
                </button>
                <Btn sm variant="danger" onClick={() => deleteCat(c.id)}>
                  ×
                </Btn>
              </div>
            );
          })}
          {cats.length === 0 && (
            <p className="text-xs py-5 text-center" style={{ color: 'var(--text-muted)' }}>
              No categories yet
            </p>
          )}
        </div>
      </Card>

      {/* Item form + list */}
      <Card title={editingItem ? `Edit: ${editingItem.name}` : 'Add Menu Item'}>
        <form onSubmit={saveItem} className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                Category *
              </span>
              <select
                value={itemForm.categoryId}
                onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                required
                className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="">Select category…</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Inp
              label="Item Name *"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              required
            />
            <Inp
              label="Charge *"
              type="number"
              step="0.01"
              min="0"
              value={itemForm.charge}
              onChange={(e) => setItemForm({ ...itemForm, charge: e.target.value })}
              required
            />
            <Inp
              label="Account No"
              value={itemForm.accountNo}
              onChange={(e) => setItemForm({ ...itemForm, accountNo: e.target.value })}
            />
          </div>
          {msg && (
            <p
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--amber-strong)',
              }}
            >
              {msg}
            </p>
          )}
          <div className="flex gap-2">
            <Btn type="submit">{editingItem ? 'Save Changes' : '+ Add Item'}</Btn>
            {editingItem && (
              <Btn
                variant="ghost"
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setItemForm({ categoryId: itemForm.categoryId, name: '', charge: '', accountNo: '' });
                }}
              >
                Cancel
              </Btn>
            )}
          </div>
        </form>

        {/* Item list for selected category */}
        {selectedCat ? (
          <div>
            <h4
              className="text-xs font-semibold mb-2 uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}
            >
              Items in {selectedCat.name} ({selectedCat.items?.length ?? 0})
            </h4>
            <div
              className="divide-y text-xs max-h-72 overflow-y-auto"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {(selectedCat.items ?? []).map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between py-2 px-1 ${!item.isActive ? 'opacity-50' : ''}`}
                >
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {item.name}
                  </span>
                  <span className="mx-2" style={{ color: 'var(--text-secondary)' }}>
                    {Number(item.charge).toLocaleString()}
                  </span>
                  <div className="flex gap-1 ml-auto">
                    <Btn
                      sm
                      variant="ghost"
                      onClick={() => {
                        setEditingItem(item);
                        setItemForm({
                          categoryId: String(item.categoryId),
                          name: item.name,
                          charge: String(item.charge),
                          accountNo: item.accountNo || '',
                        });
                      }}
                    >
                      Edit
                    </Btn>
                    <Btn sm variant="ghost" onClick={() => toggleItem(item)}>
                      {item.isActive ? 'Disable' : 'Enable'}
                    </Btn>
                    <Btn sm variant="danger" onClick={() => deleteItem(item.id)}>
                      ×
                    </Btn>
                  </div>
                </div>
              ))}
              {(!selectedCat.items || selectedCat.items.length === 0) && (
                <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                  No items in this category yet
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>
            Select a category on the left to see its items
          </p>
        )}
      </Card>
    </div>
  );
}

// ─── Tab 2: Menus & Linked Items ──────────────────────────────────────────────

function MenusTab() {
  const [menus, setMenus] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [form, setForm] = useState({ name: '', accountId: '' });
  const [msg, setMsg] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('all');

  async function selectMenu(menu) {
    if (!menu) {
      setSelected(null);
      return;
    }
    // Optimistically select immediately so UI updates without flash
    setSelected(menu);
    // If menu already has its items array, don't show full loading state
    const hasItems = Array.isArray(menu.items);
    if (!hasItems) setLoadingMenu(true);

    try {
      const { data } = await client.get(`/menus/${menu.id}`);
      setSelected(data);
      setMenus((prev) => prev.map((m) => (m.id === data.id ? data : m)));
    } catch (err) {
      console.error('Failed to load menu details:', err);
    } finally {
      setLoadingMenu(false);
    }
  }

  const load = (preserveId) => {
    client
      .get('/menus')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setMenus(list);
        const targetId = preserveId ?? selected?.id;
        if (targetId) {
          const found = list.find((m) => m.id === targetId);
          if (found) selectMenu(found);
        } else if (list.length > 0) {
          selectMenu(list[0]);
        }
      })
      .catch((err) => {
        console.error('Failed to load menus:', err);
        setMsg(err.response?.data?.error || 'Failed to load menus');
      });

    client
      .get('/menu-items?isActive=true')
      .then(({ data }) => {
        setAllItems(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error('Failed to load all items:', err);
      });
  };

  useEffect(() => {
    load();
  }, []);

  async function createMenu(e) {
    e.preventDefault();
    try {
      const { data } = await client.post('/menus', form);
      setForm({ name: '', accountId: '' });
      load(data.id);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to create menu');
      setTimeout(() => setMsg(''), 3000);
    }
  }

  async function addItem(itemId) {
    if (!selected) return;
    try {
      setMsg('');
      const { data } = await client.post(`/menus/${selected.id}/items/${itemId}`);
      setSelected(data);
      setMenus((prev) => prev.map((m) => (m.id === data.id ? data : m)));
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to link item');
      setTimeout(() => setMsg(''), 3000);
    }
  }

  async function removeItem(itemId) {
    if (!selected) return;
    try {
      // Optimistic update
      setSelected((prev) =>
        prev
          ? {
              ...prev,
              items: (prev.items || []).filter((l) => l.itemId !== itemId && l.id !== itemId),
            }
          : prev
      );

      const { data } = await client.delete(`/menus/${selected.id}/items/${itemId}`);
      if (data.menu) {
        setSelected(data.menu);
        setMenus((prev) => prev.map((m) => (m.id === data.menu.id ? data.menu : m)));
      } else {
        selectMenu(selected);
      }
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to remove item');
      setTimeout(() => setMsg(''), 3000);
      selectMenu(selected);
    }
  }

  async function deleteMenu(menuId) {
    if (!confirm('Delete menu and all its item links?')) return;
    try {
      await client.delete(`/menus/${menuId}`);
      if (selected?.id === menuId) setSelected(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete menu');
    }
  }

  const safeMenus = Array.isArray(menus) ? menus : [];
  const safeAllItems = Array.isArray(allItems) ? allItems : [];
  const safeSelectedItems = Array.isArray(selected?.items) ? selected.items : [];
  const linkedIds = new Set(safeSelectedItems.map((l) => l.itemId).filter(Boolean));

  // Extract categories for filter tabs
  const categoriesList = useMemo(() => {
    const map = new Map();
    safeAllItems.forEach((it) => {
      if (it.category) map.set(it.category.id, it.category.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [safeAllItems]);

  const filteredAllItems = useMemo(() => {
    return safeAllItems.filter((item) => {
      const matchSearch = !itemSearch.trim() || item.name.toLowerCase().includes(itemSearch.toLowerCase());
      const matchCat = selectedCatFilter === 'all' || String(item.categoryId) === String(selectedCatFilter);
      return matchSearch && matchCat;
    });
  }, [safeAllItems, itemSearch, selectedCatFilter]);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      {/* Column 1: Menu list */}
      <Card
        title="Menus"
        action={
          <form onSubmit={createMenu} className="flex gap-2">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="New menu…"
              className="rounded-xl px-2.5 py-1 text-xs w-28 focus:outline-none"
              style={{
                backgroundColor: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)',
              }}
              required
            />
            <Btn sm type="submit">
              + Add
            </Btn>
          </form>
        }
      >
        <div className="divide-y text-sm" style={{ borderColor: 'var(--border-subtle)' }}>
          {safeMenus.map((m) => {
            const isSelected = selected?.id === m.id;
            const itemsCount = Array.isArray(m.items) ? m.items.length : 0;
            return (
              <div
                key={m.id}
                className={`w-full py-2 px-2.5 rounded-xl flex justify-between items-center transition ${
                  isSelected ? 'font-semibold' : ''
                }`}
                style={{
                  backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                  color: isSelected ? 'var(--amber-strong)' : 'var(--text-primary)',
                }}
              >
                <button
                  type="button"
                  onClick={() => selectMenu(m)}
                  className="flex-1 text-left flex justify-between items-center pr-3"
                >
                  <span className="truncate">{m.name}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full shrink-0 ml-2"
                    style={{
                      backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.2)' : 'rgba(148, 163, 184, 0.12)',
                      color: isSelected ? 'var(--amber-strong)' : 'var(--text-secondary)',
                    }}
                  >
                    {itemsCount} items
                  </span>
                </button>
                <Btn sm variant="danger" onClick={() => deleteMenu(m.id)}>
                  ×
                </Btn>
              </div>
            );
          })}
          {safeMenus.length === 0 && (
            <p className="text-xs py-5 text-center" style={{ color: 'var(--text-muted)' }}>
              No menus created yet
            </p>
          )}
        </div>
      </Card>

      {/* Column 2: Linked Items for selected menu */}
      <Card
        title={
          selected
            ? `${selected.name} — Linked Items (${safeSelectedItems.length})`
            : 'Select a Menu'
        }
      >
        {loadingMenu && !selected?.items ? (
          <p className="text-xs text-center py-8 animate-pulse" style={{ color: 'var(--text-muted)' }}>
            Loading linked items…
          </p>
        ) : selected ? (
          <div className="space-y-2">
            <div
              className="divide-y text-xs max-h-96 overflow-y-auto pr-1"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {safeSelectedItems.length === 0 && (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    No items linked to this menu yet.
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Click <strong>+ Add</strong> on any item in the right panel to link it.
                  </p>
                </div>
              )}
              {safeSelectedItems.map((link) => (
                <div key={link.id || link.itemId} className="flex justify-between items-center py-2 px-1">
                  <div>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {link.item?.name || 'Item #' + link.itemId}
                    </span>
                    {link.item?.category?.name && (
                      <span className="text-[10px] ml-1.5 opacity-75" style={{ color: 'var(--text-muted)' }}>
                        ({link.item.category.name})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {Number(link.item?.charge ?? 0).toLocaleString()}
                    </span>
                    <Btn sm variant="danger" onClick={() => removeItem(link.itemId)}>
                      ×
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>
            Click a menu on the left to manage its linked items
          </p>
        )}
      </Card>

      {/* Column 3: All Items Picker */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <span>All Items</span>
            <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
              ({filteredAllItems.length} available)
            </span>
          </div>
        }
      >
        {msg && (
          <p
            className="text-xs px-3 py-1.5 rounded-lg mb-2"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
            }}
          >
            {msg}
          </p>
        )}

        {/* Filter bar */}
        <div className="space-y-2 mb-3">
          <input
            type="text"
            placeholder="Search items by name…"
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            className="w-full rounded-xl px-3 py-1.5 text-xs focus:outline-none"
            style={{
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)',
            }}
          />
          {categoriesList.length > 0 && (
            <div className="flex gap-1 overflow-x-auto pb-1 text-[11px]">
              <button
                type="button"
                onClick={() => setSelectedCatFilter('all')}
                className={`px-2 py-0.5 rounded-lg transition ${
                  selectedCatFilter === 'all' ? 'font-bold' : ''
                }`}
                style={{
                  backgroundColor:
                    selectedCatFilter === 'all' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(148, 163, 184, 0.1)',
                  color: selectedCatFilter === 'all' ? 'var(--amber-strong)' : 'var(--text-secondary)',
                }}
              >
                All
              </button>
              {categoriesList.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCatFilter(String(c.id))}
                  className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition ${
                    selectedCatFilter === String(c.id) ? 'font-bold' : ''
                  }`}
                  style={{
                    backgroundColor:
                      selectedCatFilter === String(c.id)
                        ? 'rgba(245, 158, 11, 0.18)'
                        : 'rgba(148, 163, 184, 0.1)',
                    color: selectedCatFilter === String(c.id) ? 'var(--amber-strong)' : 'var(--text-secondary)',
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items List */}
        <div
          className="divide-y text-xs max-h-80 overflow-y-auto pr-1"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {filteredAllItems.map((item) => {
            const linked = linkedIds.has(item.id);
            return (
              <div
                key={item.id}
                className={`flex justify-between items-center py-2 px-1 transition ${
                  linked ? 'opacity-40' : ''
                }`}
              >
                <div>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {item.name}
                  </span>
                  <span className="text-[10px] ml-1.5" style={{ color: 'var(--text-muted)' }}>
                    ({item.category?.name || 'Uncategorized'})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {Number(item.charge ?? 0).toLocaleString()}
                  </span>
                  {selected && !linked && (
                    <Btn sm onClick={() => addItem(item.id)}>
                      + Add
                    </Btn>
                  )}
                  {linked && (
                    <span className="text-green-500 font-bold px-1.5 text-xs">
                      ✓ Linked
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {filteredAllItems.length === 0 && (
            <p className="text-xs py-5 text-center" style={{ color: 'var(--text-muted)' }}>
              No items matching filter
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

// ─── Tab 3: Rate Plans ────────────────────────────────────────────────────────

function RatePlansTab() {
  const [plans, setPlans] = useState([]);
  const [menus, setMenus] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [planForm, setPlanForm] = useState({ name: '', fromDate: '', toDate: '' });
  const [rateForm, setRateForm] = useState({ menuId: '', charge: '' });

  async function selectPlan(plan) {
    if (!plan) {
      setSelected(null);
      return;
    }
    setLoadingPlan(true);
    try {
      const { data } = await client.get(`/menu-rate-plans/${plan.id}`);
      setSelected(data);
    } catch (err) {
      console.error(err);
      setSelected(plan);
    } finally {
      setLoadingPlan(false);
    }
  }

  const load = (preserveId) => {
    client
      .get('/menu-rate-plans')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setPlans(list);
        const targetId = preserveId ?? selected?.id;
        if (targetId) {
          const found = list.find((p) => p.id === targetId);
          if (found) selectPlan(found);
        } else if (list.length > 0) {
          selectPlan(list[0]);
        }
      })
      .catch(() => {});

    client
      .get('/menus?isActive=true')
      .then(({ data }) => setMenus(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  async function createPlan(e) {
    e.preventDefault();
    try {
      const { data } = await client.post('/menu-rate-plans', planForm);
      setPlanForm({ name: '', fromDate: '', toDate: '' });
      load(data.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create plan');
    }
  }

  async function addRate(e) {
    e.preventDefault();
    if (!selected) return;
    try {
      await client.post(`/menu-rate-plans/${selected.id}/rates`, rateForm);
      selectPlan(selected);
      setRateForm({ menuId: '', charge: '' });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add rate');
    }
  }

  async function deleteRate(rateId) {
    if (!selected) return;
    try {
      await client.delete(`/menu-rate-plans/${selected.id}/rates/${rateId}`);
      selectPlan(selected);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete rate');
    }
  }

  async function deletePlan(planId) {
    if (!confirm('Delete rate plan and its rates?')) return;
    try {
      await client.delete(`/menu-rate-plans/${planId}`);
      if (selected?.id === planId) setSelected(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete rate plan');
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {/* Plans list */}
      <Card
        title="Rate Plans"
        action={
          <form onSubmit={createPlan} className="flex gap-2 items-end flex-wrap">
            <Inp
              label="Name"
              value={planForm.name}
              onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
              required
            />
            <Inp
              label="From"
              type="date"
              value={planForm.fromDate}
              onChange={(e) => setPlanForm({ ...planForm, fromDate: e.target.value })}
              required
            />
            <Inp
              label="To"
              type="date"
              value={planForm.toDate}
              onChange={(e) => setPlanForm({ ...planForm, toDate: e.target.value })}
              required
            />
            <Btn sm type="submit">
              + Create
            </Btn>
          </form>
        }
      >
        <div className="divide-y text-sm mt-3" style={{ borderColor: 'var(--border-subtle)' }}>
          {plans.map((p) => {
            const isSelected = selected?.id === p.id;
            return (
              <div
                key={p.id}
                className={`w-full py-2 px-2.5 rounded-xl flex justify-between items-center transition ${
                  isSelected ? 'font-semibold' : ''
                }`}
                style={{
                  backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                  color: isSelected ? 'var(--amber-strong)' : 'var(--text-primary)',
                }}
              >
                <button
                  type="button"
                  onClick={() => selectPlan(p)}
                  className="flex-1 text-left pr-2"
                >
                  <div>{p.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {p.fromDate?.slice(0, 10)} → {p.toDate?.slice(0, 10)} · {p.rates?.length ?? 0} rates
                  </div>
                </button>
                <Btn sm variant="danger" onClick={() => deletePlan(p.id)}>
                  ×
                </Btn>
              </div>
            );
          })}
          {plans.length === 0 && (
            <p className="text-xs py-5 text-center" style={{ color: 'var(--text-muted)' }}>
              No rate plans yet
            </p>
          )}
        </div>
      </Card>

      {/* Rates for selected plan */}
      <Card title={selected ? `Rates for: ${selected.name}` : 'Select a Plan'}>
        {loadingPlan ? (
          <p className="text-xs text-center py-6 animate-pulse" style={{ color: 'var(--text-muted)' }}>
            Loading rates…
          </p>
        ) : selected ? (
          <>
            <form onSubmit={addRate} className="flex gap-2 mb-3">
              <select
                value={rateForm.menuId}
                onChange={(e) => setRateForm({ ...rateForm, menuId: e.target.value })}
                required
                className="rounded-xl px-2.5 py-1.5 text-xs flex-1 focus:outline-none"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="">Select menu…</option>
                {menus.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Charge/head"
                value={rateForm.charge}
                onChange={(e) => setRateForm({ ...rateForm, charge: e.target.value })}
                required
                className="rounded-xl px-2.5 py-1.5 text-xs w-28 focus:outline-none"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />
              <Btn sm type="submit">
                + Set
              </Btn>
            </form>
            <div
              className="divide-y text-xs max-h-64 overflow-y-auto"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {(selected.rates ?? []).map((r) => (
                <div key={r.id} className="flex justify-between items-center py-2 px-1">
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {r.menu?.name}
                  </span>
                  <span className="mx-2" style={{ color: 'var(--text-secondary)' }}>
                    {Number(r.charge).toLocaleString()} / head
                  </span>
                  <Btn sm variant="danger" onClick={() => deleteRate(r.id)}>
                    ×
                  </Btn>
                </div>
              ))}
              {selected.rates?.length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
                  No rates set for this plan yet
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>
            Click a plan to manage its rates
          </p>
        )}
      </Card>
    </div>
  );
}

// ─── MenuBuilder (Main Page) ──────────────────────────────────────────────────

const TABS = ['Categories & Items', 'Menus & Linked Items', 'Rate Plans'];

export default function MenuBuilder() {
  const [tab, setTab] = useState(1); // Default to Menus & Linked Items tab!

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Menu Builder
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Manage categories, menu items, menus, item link associations, and seasonal rate plans
          </p>
        </div>

        {/* Tab Pills */}
        <div
          className="flex gap-1.5 p-1 rounded-2xl w-fit border"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {TABS.map((t, i) => {
            const isTabActive = tab === i;
            return (
              <button
                key={t}
                onClick={() => setTab(i)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                  isTabActive ? 'shadow-sm text-slate-950 font-bold' : ''
                }`}
                style={{
                  background: isTabActive ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : 'transparent',
                  color: isTabActive ? '#020617' : 'var(--text-secondary)',
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      {tab === 0 && <CategoriesTab />}
      {tab === 1 && <MenusTab />}
      {tab === 2 && <RatePlansTab />}
    </div>
  );
}
