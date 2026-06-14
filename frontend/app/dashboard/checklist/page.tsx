"use client";
/**
 * /dashboard/checklist — Wedding checklist with inline edit, delete, and progress
 */
import { useState, useEffect, useRef } from "react";
import { Check, Plus, Pencil, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";

type Task = {
  id: string;
  title: string;
  category: string;
  timeline: string;
  done: boolean;
  custom?: boolean;
};

const DEFAULT_TASKS: Omit<Task, "id" | "done">[] = [
  // 12+ months before
  { title: "Set your wedding date",            category: "Planning",  timeline: "12+", custom: false },
  { title: "Determine your total budget",       category: "Budget",    timeline: "12+", custom: false },
  { title: "Create your guest list (rough)",    category: "Guests",    timeline: "12+", custom: false },
  { title: "Choose your wedding venue",         category: "Venue",     timeline: "12+", custom: false },
  { title: "Book your photographer",            category: "Vendors",   timeline: "12+", custom: false },
  { title: "Book your videographer",            category: "Vendors",   timeline: "12+", custom: false },
  { title: "Start your wedding website",        category: "Digital",   timeline: "12+", custom: false },
  // 9–12 months
  { title: "Choose and book your caterer",      category: "Vendors",   timeline: "9-12", custom: false },
  { title: "Book a live band or DJ",            category: "Vendors",   timeline: "9-12", custom: false },
  { title: "Research and book officiant",       category: "Vendors",   timeline: "9-12", custom: false },
  { title: "Choose bridal party",               category: "Planning",  timeline: "9-12", custom: false },
  { title: "Start dress shopping",              category: "Attire",    timeline: "9-12", custom: false },
  { title: "Book your florist",                 category: "Vendors",   timeline: "9-12", custom: false },
  // 6–9 months
  { title: "Order your wedding dress",          category: "Attire",    timeline: "6-9", custom: false },
  { title: "Book honeymoon travel",             category: "Travel",    timeline: "6-9", custom: false },
  { title: "Send save-the-dates",               category: "Guests",    timeline: "6-9", custom: false },
  { title: "Register at 2–3 stores",            category: "Registry",  timeline: "6-9", custom: false },
  { title: "Plan ceremony program",             category: "Ceremony",  timeline: "6-9", custom: false },
  { title: "Book hair and makeup",              category: "Vendors",   timeline: "6-9", custom: false },
  // 3–6 months
  { title: "Order wedding invitations",         category: "Guests",    timeline: "3-6", custom: false },
  { title: "Book transportation",               category: "Vendors",   timeline: "3-6", custom: false },
  { title: "Plan rehearsal dinner",             category: "Events",    timeline: "3-6", custom: false },
  { title: "Finalize catering menu",            category: "Vendors",   timeline: "3-6", custom: false },
  { title: "Order wedding cake",                category: "Vendors",   timeline: "3-6", custom: false },
  // 1–3 months
  { title: "Mail invitations (8 weeks out)",    category: "Guests",    timeline: "1-3", custom: false },
  { title: "Final dress fitting",               category: "Attire",    timeline: "1-3", custom: false },
  { title: "Finalise seating chart",            category: "Planning",  timeline: "1-3", custom: false },
  { title: "Create ceremony timeline",          category: "Ceremony",  timeline: "1-3", custom: false },
  { title: "Purchase wedding rings",            category: "Planning",  timeline: "1-3", custom: false },
  // 1 month
  { title: "Confirm all vendors",               category: "Vendors",   timeline: "1", custom: false },
  { title: "Break in your wedding shoes",       category: "Attire",    timeline: "1", custom: false },
  { title: "Prepare vendor payments/tips",      category: "Budget",    timeline: "1", custom: false },
  { title: "Delegate day-of tasks",             category: "Planning",  timeline: "1", custom: false },
  { title: "Prepare personal vows",             category: "Ceremony",  timeline: "1", custom: false },
];

const TIMELINES = [
  { key: "12+",  label: "12+ Months Before", color: "#8B1A4A" },
  { key: "9-12", label: "9–12 Months",        color: "#b91c1c" },
  { key: "6-9",  label: "6–9 Months",         color: "#e11d48" },
  { key: "3-6",  label: "3–6 Months",         color: "#f43f5e" },
  { key: "1-3",  label: "1–3 Months",         color: "#fb7185" },
  { key: "1",    label: "1 Month Before",     color: "#fda4af" },
];

const CATEGORY_EMOJI: Record<string, string> = {
  Planning: "📋", Budget: "💰", Guests: "👥", Venue: "🏛️",
  Vendors: "🤝", Digital: "💻", Attire: "👗", Travel: "✈️",
  Registry: "🎁", Ceremony: "💒", Events: "🎉",
};

const STORAGE_KEY = "snapshare_checklist_v2";

function loadTasks(): Task[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_TASKS.map((t, i) => ({ ...t, id: `default-${i}`, done: false }));
}

function saveTasks(tasks: Task[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch {}
}

export default function ChecklistPage() {
  const [tasks,      setTasks]      = useState<Task[]>([]);
  const [filter,     setFilter]     = useState("all");
  const [showAdd,    setShowAdd]    = useState(false);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [editTitle,  setEditTitle]  = useState("");
  const [newTitle,   setNewTitle]   = useState("");
  const [newCat,     setNewCat]     = useState("Planning");
  const [newTl,      setNewTl]      = useState("1-3");
  const [collapsed,  setCollapsed]  = useState<Set<string>>(new Set());
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTasks(loadTasks()); }, []);
  useEffect(() => { if (tasks.length) saveTasks(tasks); }, [tasks]);
  useEffect(() => { if (editingId) editRef.current?.focus(); }, [editingId]);

  const toggle = (id: string) =>
    setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));

  const addTask = () => {
    if (!newTitle.trim()) return;
    const t: Task = {
      id: `custom-${Date.now()}`, title: newTitle.trim(),
      category: newCat, timeline: newTl, done: false, custom: true,
    };
    setTasks(ts => [...ts, t]);
    setNewTitle(""); setShowAdd(false);
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
  };

  const commitEdit = (id: string) => {
    if (editTitle.trim()) {
      setTasks(ts => ts.map(t => t.id === id ? { ...t, title: editTitle.trim() } : t));
    }
    setEditingId(null);
  };

  const deleteTask = (id: string) => {
    setTasks(ts => ts.filter(t => t.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const toggleCollapse = (key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const displayed = filter === "all"  ? tasks
    : filter === "done"  ? tasks.filter(t => t.done)
    : filter === "todo"  ? tasks.filter(t => !t.done)
    : tasks.filter(t => t.timeline === filter);

  const done  = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800">📋 Wedding Checklist</h1>
          <p className="text-sm text-slate-400 mt-0.5">{done} of {total} tasks completed</p>
        </div>
        <button onClick={() => setShowAdd(s => !s)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-black hover:bg-rose-700 transition shadow-lg">
          <Plus size={16} /> Add Task
        </button>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-bold text-slate-700">Overall Progress</span>
          <span className="text-sm font-black text-rose-600">{pct}%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-rose-500 to-pink-400 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          {([["Completed", done, "#10b981"], ["Remaining", total - done, "#f43f5e"], ["Total", total, "#6b7280"]] as const).map(([l, v, c]) => (
            <div key={l} className="text-center">
              <p className="text-2xl font-black" style={{ color: c }}>{v}</p>
              <p className="text-xs text-slate-400 font-semibold">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Add task form */}
      {showAdd && (
        <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm mb-5">
          <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
            <Plus size={16} className="text-rose-500" /> Add Custom Task
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <input
              className="col-span-1 sm:col-span-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-50"
              placeholder="Task name"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTask()}
              autoFocus
            />
            <select value={newCat} onChange={e => setNewCat(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-rose-300">
              {Object.keys(CATEGORY_EMOJI).map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={newTl} onChange={e => setNewTl(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-rose-300">
              {TIMELINES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={addTask}
              className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-black hover:bg-rose-700 transition">
              Add Task
            </button>
            <button onClick={() => setShowAdd(false)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition font-semibold">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: "all",  label: "All" },
          { key: "todo", label: "To Do" },
          { key: "done", label: "Done ✓" },
          ...TIMELINES.map(t => ({ key: t.key, label: t.label })),
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
              filter === f.key
                ? "bg-slate-900 text-white shadow-md"
                : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Task list by timeline */}
      {TIMELINES.map(tl => {
        const grouped = displayed.filter(t => t.timeline === tl.key);
        if (!grouped.length) return null;
        const tlDone = grouped.filter(t => t.done).length;
        const isCollapsed = collapsed.has(tl.key);

        return (
          <div key={tl.key} className="mb-6">
            <button
              onClick={() => toggleCollapse(tl.key)}
              className="w-full flex items-center gap-3 mb-3 group"
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: tl.color }} />
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 flex-1 text-left">
                {tl.label}
              </span>
              <span className="text-[10px] font-bold text-slate-300">
                {tlDone}/{grouped.length} done
              </span>
              {isCollapsed
                ? <ChevronDown size={14} className="text-slate-300 group-hover:text-slate-500 transition" />
                : <ChevronUp size={14} className="text-slate-300 group-hover:text-slate-500 transition" />
              }
            </button>

            {!isCollapsed && (
              <div className="space-y-2">
                {grouped.map(task => (
                  <div key={task.id}
                    className={`flex items-center gap-3 p-3.5 bg-white rounded-2xl border transition-all group ${
                      task.done ? "border-green-100 opacity-60" : "border-slate-100 hover:border-rose-200 hover:shadow-sm"
                    }`}>

                    {/* Check button */}
                    <button onClick={() => toggle(task.id)}
                      className={`w-5 h-5 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                        task.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-rose-400"
                      }`}>
                      {task.done && <Check size={10} />}
                    </button>

                    {/* Category emoji */}
                    <span className="text-base flex-shrink-0">{CATEGORY_EMOJI[task.category] || "📌"}</span>

                    {/* Title — inline editable */}
                    <div className="flex-1 min-w-0">
                      {editingId === task.id ? (
                        <input
                          ref={editRef}
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          onBlur={() => commitEdit(task.id)}
                          onKeyDown={e => {
                            if (e.key === "Enter") commitEdit(task.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="w-full text-sm font-semibold outline-none border-b-2 border-rose-300 bg-transparent py-0.5"
                        />
                      ) : (
                        <p className={`text-sm font-semibold truncate ${task.done ? "line-through text-slate-400" : "text-slate-700"}`}>
                          {task.title}
                        </p>
                      )}
                      <span className="text-[10px] text-slate-300 font-semibold">{task.category}</span>
                    </div>

                    {/* Action buttons (visible on hover) */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      {editingId === task.id ? (
                        <button onClick={() => commitEdit(task.id)}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-500 hover:bg-emerald-100 transition">
                          <Check size={13} />
                        </button>
                      ) : (
                        <button onClick={() => startEdit(task)}
                          className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition">
                          <Pencil size={13} />
                        </button>
                      )}
                      <button onClick={() => deleteTask(task.id)}
                        className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {displayed.length === 0 && (
        <div className="text-center py-20 text-slate-200">
          <p className="text-5xl mb-3">✅</p>
          <p className="font-bold text-slate-400">No tasks match this filter.</p>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
