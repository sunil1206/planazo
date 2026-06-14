"use client";
/**
 * /dashboard/budget — WeddingWire-style budget planner
 * Categories, estimated vs actual, payment log
 */
import { useState, useEffect } from "react";

type Expense = {
  id: string;
  category: string;
  item: string;
  estimated: number;
  actual: number;
  paid: number;
  vendor?: string;
  notes?: string;
  due_date?: string;
};

const DEFAULT_CATEGORIES = [
  { name: "Venue",          emoji: "🏛️",  budget: 150000 },
  { name: "Catering",       emoji: "🍽️",  budget: 120000 },
  { name: "Photography",    emoji: "📷",  budget: 60000 },
  { name: "Videography",    emoji: "🎥",  budget: 40000 },
  { name: "Décor & Flowers",emoji: "🌸",  budget: 50000 },
  { name: "Attire",         emoji: "👗",  budget: 80000 },
  { name: "Music / DJ",     emoji: "🎵",  budget: 30000 },
  { name: "Makeup & Hair",  emoji: "💄",  budget: 20000 },
  { name: "Transport",      emoji: "🚗",  budget: 15000 },
  { name: "Invitations",    emoji: "💌",  budget: 10000 },
  { name: "Cake",           emoji: "🎂",  budget: 15000 },
  { name: "Honeymoon",      emoji: "✈️",  budget: 100000 },
  { name: "Gifts",          emoji: "🎁",  budget: 20000 },
  { name: "Miscellaneous",  emoji: "📦",  budget: 20000 },
];

const STORAGE_KEY = "snapshare_budget";
const TOTAL_KEY   = "snapshare_budget_total";

function load(): { total: number; expenses: Expense[] } {
  try {
    const e = localStorage.getItem(STORAGE_KEY);
    const t = localStorage.getItem(TOTAL_KEY);
    return {
      expenses: e ? JSON.parse(e) : [],
      total:    t ? parseInt(t) : 500000,
    };
  } catch { return { expenses: [], total: 500000 }; }
}

const inp = "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-300 bg-white";

export default function BudgetPage() {
  const [total,    setTotal]    = useState(500000);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [form, setForm] = useState({ category: "Venue", item: "", estimated: "", actual: "", paid: "", vendor: "", notes: "", due_date: "" });

  useEffect(() => {
    const { total: t, expenses: e } = load();
    setTotal(t); setExpenses(e);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
      localStorage.setItem(TOTAL_KEY, String(total));
    } catch {}
  }, [expenses, total]);

  const openNew = () => {
    setEditId(null);
    setForm({ category: "Venue", item: "", estimated: "", actual: "", paid: "", vendor: "", notes: "", due_date: "" });
    setShowForm(true);
  };

  const openEdit = (e: Expense) => {
    setEditId(e.id);
    setForm({ category: e.category, item: e.item, estimated: String(e.estimated), actual: String(e.actual), paid: String(e.paid), vendor: e.vendor || "", notes: e.notes || "", due_date: e.due_date || "" });
    setShowForm(true);
  };

  const save = () => {
    if (!form.item.trim()) return;
    const entry: Expense = {
      id:        editId || `exp-${Date.now()}`,
      category:  form.category,
      item:      form.item,
      estimated: parseFloat(form.estimated) || 0,
      actual:    parseFloat(form.actual)    || 0,
      paid:      parseFloat(form.paid)      || 0,
      vendor:    form.vendor,
      notes:     form.notes,
      due_date:  form.due_date,
    };
    if (editId) {
      setExpenses(es => es.map(e => e.id === editId ? entry : e));
    } else {
      setExpenses(es => [...es, entry]);
    }
    setShowForm(false);
  };

  const del = (id: string) => setExpenses(es => es.filter(e => e.id !== id));

  // Summaries
  const totalEstimated = expenses.reduce((s, e) => s + e.estimated, 0);
  const totalActual    = expenses.reduce((s, e) => s + e.actual,    0);
  const totalPaid      = expenses.reduce((s, e) => s + e.paid,      0);
  const remaining      = total - totalActual;
  const overBudget     = totalActual > total;

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  // By category
  const byCat = DEFAULT_CATEGORIES.map(cat => {
    const items = expenses.filter(e => e.category === cat.name);
    return {
      ...cat,
      estimated: items.reduce((s, e) => s + e.estimated, 0),
      actual:    items.reduce((s, e) => s + e.actual,    0),
      paid:      items.reduce((s, e) => s + e.paid,      0),
      items,
    };
  }).filter(c => c.items.length > 0 || c.budget > 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">💰 Budget Planner</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track estimated vs. actual wedding costs</p>
        </div>
        <button onClick={openNew}
          className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition">
          + Add Expense
        </button>
      </div>

      {/* Total budget input */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-48">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Total Wedding Budget</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-lg">₹</span>
              <input
                type="number" value={total}
                onChange={e => setTotal(parseInt(e.target.value) || 0)}
                className="text-2xl font-bold text-gray-800 border-none outline-none bg-transparent w-40"
              />
            </div>
          </div>
          <div className={`flex-1 min-w-48 p-3 rounded-xl ${overBudget ? "bg-red-50" : "bg-green-50"}`}>
            <p className="text-xs text-gray-500 mb-0.5">Remaining</p>
            <p className={`text-xl font-bold ${overBudget ? "text-red-600" : "text-green-600"}`}>
              {overBudget ? "−" : ""}{fmt(Math.abs(remaining))}
            </p>
            {overBudget && <p className="text-xs text-red-400">Over budget</p>}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Estimated",  value: totalEstimated, color: "#6b7280" },
          { label: "Actual Cost",value: totalActual,    color: overBudget ? "#ef4444" : "#3b82f6" },
          { label: "Paid",       value: totalPaid,      color: "#10b981" },
          { label: "Outstanding",value: totalActual - totalPaid, color: "#f59e0b" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-lg font-bold" style={{ color }}>{fmt(value)}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Budget bar */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-6">
        <div className="flex justify-between mb-2 text-xs text-gray-400">
          <span>Spent: {fmt(totalActual)}</span>
          <span>Budget: {fmt(total)}</span>
        </div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${overBudget ? "bg-red-500" : "bg-gradient-to-r from-rose-500 to-pink-400"}`}
            style={{ width: `${Math.min(100, total ? (totalActual / total) * 100 : 0)}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1 text-right">
          {total ? Math.round((totalActual / total) * 100) : 0}% of budget used
        </p>
      </div>

      {/* Expense list */}
      {expenses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="text-4xl mb-3">💰</div>
          <p className="text-gray-400">No expenses yet. Add your first one!</p>
        </div>
      ) : (
        <>
          {/* ── Mobile cards (hidden on md+) ─────────────────────────────── */}
          <div className="md:hidden space-y-3">
            {expenses.map(e => {
              const outstanding = e.actual - e.paid;
              const cat = DEFAULT_CATEGORIES.find(c => c.name === e.category);
              return (
                <div key={e.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1">
                        <span>{cat?.emoji || "📦"}</span>{e.category}
                      </span>
                      <p className="font-semibold text-gray-800">{e.item}</p>
                      {e.vendor && <p className="text-xs text-gray-400 mt-0.5">{e.vendor}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0 ml-2">
                      <button onClick={() => openEdit(e)} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50">Edit</button>
                      <button onClick={() => del(e.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50">Del</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-gray-50 rounded-xl p-2">
                      <p className="text-xs text-gray-400">Estimated</p>
                      <p className="text-sm font-semibold text-gray-700">{fmt(e.estimated)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2">
                      <p className="text-xs text-gray-400">Actual</p>
                      <p className="text-sm font-semibold text-gray-800">{fmt(e.actual)}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-2">
                      <p className="text-xs text-gray-400">Paid</p>
                      <p className="text-sm font-semibold text-green-600">{fmt(e.paid)}</p>
                    </div>
                    <div className={`rounded-xl p-2 ${outstanding > 0 ? "bg-amber-50" : "bg-gray-50"}`}>
                      <p className="text-xs text-gray-400">Outstanding</p>
                      <p className={`text-sm font-semibold ${outstanding > 0 ? "text-amber-500" : "text-gray-300"}`}>{fmt(outstanding)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Mobile totals card */}
            <div className="bg-gray-50 rounded-2xl border-2 border-gray-200 p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Totals</p>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-white rounded-xl p-2"><p className="text-xs text-gray-400">Estimated</p><p className="text-sm font-bold text-gray-700">{fmt(totalEstimated)}</p></div>
                <div className="bg-white rounded-xl p-2"><p className="text-xs text-gray-400">Actual</p><p className={`text-sm font-bold ${overBudget ? "text-red-600" : "text-gray-800"}`}>{fmt(totalActual)}</p></div>
                <div className="bg-white rounded-xl p-2"><p className="text-xs text-gray-400">Paid</p><p className="text-sm font-bold text-green-600">{fmt(totalPaid)}</p></div>
                <div className="bg-white rounded-xl p-2"><p className="text-xs text-gray-400">Outstanding</p><p className="text-sm font-bold text-amber-500">{fmt(totalActual - totalPaid)}</p></div>
              </div>
            </div>
          </div>

          {/* ── Desktop table (hidden on mobile) ─────────────────────────── */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Category", "Item / Vendor", "Estimated", "Actual", "Paid", "Outstanding", ""].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {expenses.map(e => {
                    const outstanding = e.actual - e.paid;
                    const cat = DEFAULT_CATEGORIES.find(c => c.name === e.category);
                    return (
                      <tr key={e.id} className="hover:bg-gray-50 transition group">
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-xs font-medium">
                            <span>{cat?.emoji || "📦"}</span>
                            <span className="text-gray-600">{e.category}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{e.item}</p>
                          {e.vendor && <p className="text-xs text-gray-400">{e.vendor}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{fmt(e.estimated)}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{fmt(e.actual)}</td>
                        <td className="px-4 py-3 text-green-600">{fmt(e.paid)}</td>
                        <td className="px-4 py-3">
                          <span className={outstanding > 0 ? "text-amber-500 font-medium" : "text-gray-300"}>
                            {fmt(outstanding)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => openEdit(e)} className="text-xs text-blue-500 hover:text-blue-700">Edit</button>
                            <button onClick={() => del(e.id)}   className="text-xs text-red-400 hover:text-red-600">Del</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                    <td className="px-4 py-3 text-xs text-gray-500 uppercase" colSpan={2}>Totals</td>
                    <td className="px-4 py-3 text-gray-700">{fmt(totalEstimated)}</td>
                    <td className={`px-4 py-3 ${overBudget ? "text-red-600" : "text-gray-800"}`}>{fmt(totalActual)}</td>
                    <td className="px-4 py-3 text-green-600">{fmt(totalPaid)}</td>
                    <td className="px-4 py-3 text-amber-500">{fmt(totalActual - totalPaid)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 w-full sm:max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between mb-5">
              <h3 className="text-lg font-bold">{editId ? "Edit Expense" : "Add Expense"}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className={inp}>
                    {DEFAULT_CATEGORIES.map(c => <option key={c.name}>{c.emoji} {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Item Name *</label>
                  <input placeholder="e.g. Main Hall" value={form.item} onChange={e => setForm(f => ({...f, item: e.target.value}))} className={inp} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Vendor / Provider</label>
                <input placeholder="e.g. Grand Palace Hotel" value={form.vendor} onChange={e => setForm(f => ({...f, vendor: e.target.value}))} className={inp} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "estimated", label: "Estimated (₹)" },
                  { key: "actual",    label: "Actual Cost (₹)" },
                  { key: "paid",      label: "Amount Paid (₹)" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">{label}</label>
                    <input type="number" min="0" placeholder="0"
                      value={(form as any)[key]}
                      onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
                      className={inp} />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Notes</label>
                <textarea rows={2} placeholder="Payment schedule, reminders…" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className={inp} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-500">Cancel</button>
              <button onClick={save} className="flex-1 py-3 rounded-xl bg-rose-600 text-white text-sm font-semibold">
                {editId ? "Save Changes" : "Add Expense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
